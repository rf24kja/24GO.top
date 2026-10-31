/**
 * Experimental JavaScript client for the local 24GOTOP developer API.
 * Source code only; not a published npm package or production authentication SDK.
 * Never ship development publishing keys to browsers or third-party websites.
 */
export class TopClientError extends Error {
  constructor(message, status = null, code = null) {
    super(message);
    this.name = 'TopClientError';
    this.status = status;
    this.code = code;
  }
}


// A remote read-only endpoint can still be compromised or misconfigured.
// Bound its decoded bytes *before* JSON parsing; never trust Content-Length
// alone, and never buffer a potentially unlimited Response.json() payload.
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
async function readBoundedJson(response) {
  const reported = response.headers?.get?.('content-length');
  if (typeof reported === 'string' && /^\d+$/.test(reported) &&
      BigInt(reported) > BigInt(MAX_RESPONSE_BYTES)) {
    try { await response.body?.cancel(); } catch { /* best effort */ }
    throw new TopClientError('24GOTOP API response exceeds the 2 MiB limit',
      response.status, 'RESPONSE_TOO_LARGE');
  }
  if (!response.body || typeof response.body.getReader !== 'function') {
    throw new TopClientError('24GOTOP API returned invalid JSON',
      response.status, 'INVALID_JSON');
  }
  const reader = response.body.getReader();
  let count = 0;
  const chunks = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new TypeError('Invalid response chunk');
      count += value.byteLength;
      if (count > MAX_RESPONSE_BYTES) {
        throw new TopClientError('24GOTOP API response exceeds the 2 MiB limit',
          response.status, 'RESPONSE_TOO_LARGE');
      }
      chunks.push(value);
    }
  } catch (error) {
    try { await reader.cancel(); } catch { /* best effort */ }
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(count);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return JSON.parse(text);
  } catch {
    throw new TopClientError('24GOTOP API returned invalid JSON',
      response.status, 'INVALID_JSON');
  }
}

export class TopClient {
  constructor({
    baseURL = 'http://127.0.0.1:3000',
    apiKey,
    fetchImpl = globalThis.fetch,
    timeoutMs = 8000
  } = {}) {
    let url;
    try {
      url = new URL(baseURL);
    } catch {
      throw new TypeError('baseURL must be a valid HTTP(S) URL');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
        || url.search || url.hash || url.pathname !== '/') {
      throw new TypeError('baseURL must be a clean HTTP(S) origin without credentials');
    }
    if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60000) {
      throw new RangeError('timeoutMs must be an integer between 100 and 60000');
    }
    if (apiKey !== undefined && (typeof apiKey !== 'string' || apiKey.length === 0)) {
      throw new TypeError('apiKey must be a non-empty string');
    }
    this.baseURL = url.origin;
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async request(path, options = {}) {
    const callerSignal = options.signal;
    if (callerSignal != null && !(callerSignal instanceof AbortSignal)) {
      throw new TypeError('signal must be an AbortSignal');
    }
    // A cancelled operation must not initiate a network request, especially
    // when the caller supplies a development-only publishing credential.
    if (callerSignal?.aborted) {
      throw new TopClientError('24GOTOP API request cancelled', null, 'ABORTED');
    }
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, timeoutSignal])
      : timeoutSignal;
    const safeFailure = () => {
      // Never propagate AbortSignal.reason: callers may put secrets in it.
      if (callerSignal?.aborted) return new TopClientError('24GOTOP API request cancelled', null, 'ABORTED');
      if (timeoutSignal.aborted) return new TopClientError('24GOTOP API request timed out', null, 'TIMEOUT');
      return new TopClientError('24GOTOP API network request failed or timed out');
    };
    let response;
    try {
      response = await this.fetchImpl(this.baseURL + path, {
        ...options,
        signal,
        redirect: 'error'
      });
    } catch {
      throw safeFailure();
    }
    let body;
    try {
      body = await readBoundedJson(response);
    } catch (error) {
      // Reading a streamed JSON body can also be interrupted by abort.
      if (callerSignal?.aborted || timeoutSignal.aborted) throw safeFailure();
      if (error instanceof TopClientError) throw error;
      throw new TopClientError('24GOTOP API returned invalid JSON',
        response.status, 'INVALID_JSON');
    }
    if (!response.ok) {
      const message = typeof body?.error === 'string' ? body.error : 'Request failed';
      throw new TopClientError('24GOTOP API ' + response.status + ': ' + message.slice(0, 200), response.status);
    }
    return body;
  }

  health({ signal } = {}) {
    return this.request('/api/health', { signal });
  }

  listPosts({ locale = 'en', category, limit = 20, signal } = {}) {
    const params = new URLSearchParams({ locale, limit: String(limit) });
    if (category) params.set('category', category);
    return this.request('/api/posts?' + params, { signal });
  }

  getPost(id, { signal } = {}) {
    return this.request('/api/posts/' + encodeURIComponent(id), { signal });
  }

  publishPost(post, { signal } = {}) {
    if (!this.apiKey) throw new TopClientError('apiKey is required for LOCAL publishing');
    // This bearer token authenticates only an isolated local JSON demo.
    // HTTPS does not make an arbitrary remote host a legitimate recipient.
    // Read-only SDK requests may still target HTTPS developer endpoints.
    if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(this.baseURL).hostname)) {
      throw new TopClientError('Refusing to send a LOCAL development publishing key to a non-loopback host');
    }
    return this.request('/api/posts', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + this.apiKey
      },
      body: JSON.stringify(post),
      signal
    });
  }
}

/**
 * Public source-backed editorial articles available without any account.
 * This is deliberately separate from the LOCAL JSON demo and does not grant
 * publishing permissions or expose future private hosted-core endpoints.
 */
export class TopEditorialClient extends TopClient {
  constructor({ fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
    super({ baseURL: 'https://24go.top', fetchImpl, timeoutMs });
  }

  async #validatedArticles(signal) {
    const feed = await this.request('/engineering/feed.json', { signal });
    const invalid = () => new TopClientError(
      '24GOTOP public editorial feed is invalid', null, 'INVALID_FEED'
    );
    if (!feed || feed.version !== 'https://jsonfeed.org/version/1.1' ||
        feed.feed_url !== 'https://24go.top/engineering/feed.json' ||
        feed.home_page_url !== 'https://24go.top/engineering/' ||
        feed.language !== 'en' || !Array.isArray(feed.items) ||
        feed.items.length > 200) throw invalid();

    // Validate every entry before returning even the first result.
    const seen = new Set();
    return feed.items.map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item) ||
          typeof item.url !== 'string' ||
          !/^https:\/\/24go\.top\/engineering\/[a-z0-9-]+\.html$/.test(item.url) ||
          item.id !== item.url || seen.has(item.url) ||
          typeof item.title !== 'string' || item.title.length < 1 ||
          item.title.length > 250 || !item.title.trim() ||
          typeof item.summary !== 'string' || !item.summary.trim() ||
          item.summary.length > 1500 || item.language !== 'en' ||
          typeof item.date_published !== 'string' ||
          !Number.isFinite(Date.parse(item.date_published))) throw invalid();
      seen.add(item.url);
      return {
        url: item.url,
        title: item.title,
        summary: item.summary,
        language: item.language,
        publishedAt: item.date_published
      };
    });
  }

  async listArticles({ limit = 20, signal } = {}) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      throw new RangeError('limit must be an integer from 1 to 50');
    }
    const articles = await this.#validatedArticles(signal);
    return {
      articles: articles.slice(0, limit),
      source: 'https://24go.top/engineering/feed.json'
    };
  }

  async #validatedCorpus(signal) {
    // Two fixed public GET endpoints, regardless of user search/query/URL.
    // Neither request carries a query term, developer key or article content.
    const [articles, index] = await Promise.all([
      this.#validatedArticles(signal),
      this.request('/engineering/search-index.json', { signal })
    ]);
    const invalid = () => new TopClientError(
      '24GOTOP public article search index is invalid', null, 'INVALID_INDEX'
    );
    if (!index || index.version !== 1 || !Array.isArray(index.articles) ||
        index.articles.length !== articles.length || index.articles.length > 200)
      throw invalid();
    const indexByFile = new Map();
    for (const entry of index.articles) {
      if (!entry || typeof entry.file !== 'string' ||
          !/^[a-z0-9-]+\.html$/.test(entry.file) ||
          typeof entry.text !== 'string' || !entry.text.length ||
          entry.text.length > 24000 ||
          entry.text !== entry.text.normalize('NFC') ||
          indexByFile.has(entry.file)) throw invalid();
      indexByFile.set(entry.file, entry.text);
    }
    const records = articles.map(article => {
      const file = article.url.slice('https://24go.top/engineering/'.length);
      const searchText = indexByFile.get(file);
      if (searchText === undefined) throw invalid();
      return { ...article, searchText };
    });
    return records;
  }

  /**
   * Search all reviewed public articles, including normalized full-text index.
   * Returns links and summaries, not authoritative/original article HTML.
   */
  async searchArticles({ query, limit = 10, signal } = {}) {
    if (typeof query !== 'string' || query.length > 80 ||
        /[\u0000-\u001f\u007f\u2028\u2029]/u.test(query) || !query.trim())
      throw new TypeError('query must be nonempty printable text (up to 80 characters)');
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20)
      throw new RangeError('limit must be an integer between 1 and 20');
    const words = query.trim().normalize('NFC').toLocaleLowerCase().split(/\s+/u);
    const records = await this.#validatedCorpus(signal);
    const matches = [];
    records.forEach(({searchText, ...article}, index) => {
      const title = article.title.toLocaleLowerCase();
      const summary = article.summary.toLocaleLowerCase();
      const body = searchText.toLocaleLowerCase();
      if (!words.every(word => title.includes(word) ||
          summary.includes(word) || body.includes(word))) return;
      const score = words.reduce((sum, word) =>
        sum + (title.includes(word) ? 4 : 0) +
              (summary.includes(word) ? 2 : 0) +
              (body.includes(word) ? 1 : 0), 0);
      matches.push({ ...article, matchedIn:words.every(w=>title.includes(w))
        ? 'title':words.every(w=>summary.includes(w))?'summary':'article',
        _score:score, _order:index });
    });
    matches.sort((a,b)=>b._score-a._score||a._order-b._order);
    return {
      articles: matches.slice(0,limit).map(({_score,_order,...article})=>article),
      total: matches.length,
      source: 'https://24go.top/engineering/search-index.json'
    };
  }

  /**
   * Return a normalized, lossy full-text SEARCH INDEX entry for a canonical
   * published URL. It is NOT the original article or suitable for quoting.
   */
  async getArticleSearchText(url, { signal } = {}) {
    if (typeof url !== 'string' || url.length > 240 ||
        !/^https:\/\/24go\.top\/engineering\/[a-z0-9-]+\.html$/.test(url))
      throw new TypeError('url must be a canonical public engineering article URL');
    const records = await this.#validatedCorpus(signal);
    const found = records.find(entry => entry.url === url);
    if (!found) throw new TopClientError(
      'Article not found in reviewed public corpus', 404, 'ARTICLE_NOT_FOUND'
    );
    const { searchText, ...article } = found;
    return { ...article, searchText, textKind: 'normalized-lossy-search-index',
      source: 'https://24go.top/engineering/search-index.json' };
  }
}
