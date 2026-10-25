/**
 * Experimental JavaScript client for the local 24GOTOP developer API.
 * Source code only; not a published npm package or production authentication SDK.
 * Never ship development publishing keys to browsers or third-party websites.
 */
export class TopClientError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'TopClientError';
    this.status = status;
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
    let response;
    try {
      response = await this.fetchImpl(this.baseURL + path, {
        ...options,
        signal: AbortSignal.timeout(this.timeoutMs),
        redirect: 'error'
      });
    } catch {
      // Do not include URL credentials, response bodies, or secrets in errors.
      throw new TopClientError('24GOTOP API network request failed or timed out');
    }
    let body;
    try {
      body = await response.json();
    } catch {
      throw new TopClientError('24GOTOP API returned invalid JSON', response.status);
    }
    if (!response.ok) {
      const message = typeof body?.error === 'string' ? body.error : 'Request failed';
      throw new TopClientError('24GOTOP API ' + response.status + ': ' + message.slice(0, 200), response.status);
    }
    return body;
  }

  health() {
    return this.request('/api/health');
  }

  listPosts({ locale = 'en', category, limit = 20 } = {}) {
    const params = new URLSearchParams({ locale, limit: String(limit) });
    if (category) params.set('category', category);
    return this.request('/api/posts?' + params);
  }

  getPost(id) {
    return this.request('/api/posts/' + encodeURIComponent(id));
  }

  publishPost(post) {
    if (!this.apiKey) throw new TopClientError('apiKey is required for LOCAL publishing');
    if (new URL(this.baseURL).protocol !== 'https:'
        && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(this.baseURL).hostname)) {
      throw new TopClientError('Refusing to send a development key over remote plain HTTP');
    }
    return this.request('/api/posts', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + this.apiKey
      },
      body: JSON.stringify(post)
    });
  }
}
