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
      body = await response.json();
    } catch {
      // Reading a streamed JSON body can also be interrupted by abort.
      if (callerSignal?.aborted || timeoutSignal.aborted) throw safeFailure();
      throw new TopClientError('24GOTOP API returned invalid JSON', response.status);
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
