import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const LOCALES = new Set(['en', 'ru', 'th', 'es', 'fr', 'de', 'pt', 'zh']);
const CATEGORIES = new Set(['news', 'models', 'tools', 'guides']);

export class StoreUnavailable extends Error {
  constructor(message = 'Post store is temporarily unavailable') {
    super(message);
    this.name = 'StoreUnavailable';
    this.status = 503;
  }
}

export function createJsonStore(dbPath) {
  if (typeof dbPath !== 'string' || !dbPath) throw new TypeError('dbPath is required');
  const posts = existsSync(dbPath) ? JSON.parse(readFileSync(dbPath, 'utf8')) : [];
  if (!Array.isArray(posts)) throw new Error('Invalid local JSON post store');
  return {
    mode: 'local',
    async list({ locale, category, limit = 20 }) {
      return posts.filter(p => p.locale === locale && (!category || p.category === category)).slice(0, limit);
    },
    async get(id) {
      return posts.find(p => p.id === id) ?? null;
    },
    async create(post) {
      // Synchronous write keeps the local demo single-process and predictable.
      // This is NOT safe for production, multiple processes, or public writes.
      const next = [post, ...posts];
      mkdirSync(dirname(dbPath), { recursive: true });
      const tmp = dbPath + '.' + process.pid + '.tmp';
      writeFileSync(tmp, JSON.stringify(next, null, 2), { mode: 0o600 });
      renameSync(tmp, dbPath);
      posts.unshift(post);
      return post;
    }
  };
}

function validateSupabaseConfig({ url, publishableKey, fetchImpl }) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('SUPABASE_URL must be a valid HTTPS Supabase project origin');
  }
  if (parsed.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname)
      || parsed.username || parsed.password || parsed.search || parsed.hash
      || parsed.pathname !== '/') {
    throw new Error('SUPABASE_URL must be a clean https://PROJECT.supabase.co origin');
  }
  if (typeof publishableKey !== 'string' || !/^sb_publishable_[a-zA-Z0-9_-]{12,}$/.test(publishableKey)) {
    throw new Error('SUPABASE_PUBLISHABLE_KEY must be a publishable key, never a secret/service_role key');
  }
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation required');
  return parsed.origin;
}

function safePost(row) {
  // Allowlist output: database internals (author_id, private state) never leave this adapter.
  if (!row || typeof row !== 'object' || Array.isArray(row)
      || typeof row.id !== 'string' || !UUID.test(row.id)
      || typeof row.title !== 'string' || typeof row.body !== 'string'
      || !LOCALES.has(row.locale) || !CATEGORIES.has(row.category)
      || row.status !== 'published' || typeof row.published_at !== 'string'
      || Number.isNaN(Date.parse(row.published_at))
      || (row.agent_id !== null && (typeof row.agent_id !== 'string' || !UUID.test(row.agent_id)))) {
    throw new StoreUnavailable('Post store returned invalid published data');
  }
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    locale: row.locale,
    category: row.category,
    sourceUrl: null,
    tags: [],
    authorType: row.agent_id ? 'agent' : 'human',
    publishedAt: row.published_at
  };
}

/**
 * Read-only public feed backed by anonymous Supabase PostgREST.
 *
 * Uses ONLY a publishable key (not a service-role or secret key); Postgres RLS
 * remains effective. No JWT / Authorization header is sent, so all requests
 * use the database's anonymous role.
 *
 * This adapter is intentionally incapable of writes.
 */
export function createSupabaseReadStore({
  url,
  publishableKey,
  fetchImpl = globalThis.fetch,
  timeoutMs = 5000
} = {}) {
  const origin = validateSupabaseConfig({ url, publishableKey, fetchImpl });
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 15000) {
    throw new TypeError('timeoutMs must be between 100 and 15000');
  }
  async function query(filters) {
    const endpoint = new URL(origin + '/rest/v1/posts');
    endpoint.searchParams.set('select', 'id,title,body,locale,category,status,agent_id,published_at');
    endpoint.searchParams.set('status', 'eq.published');
    endpoint.searchParams.set('order', 'published_at.desc,id.desc');
    for (const [key, value] of Object.entries(filters)) endpoint.searchParams.set(key, value);
    let response;
    try {
      response = await fetchImpl(endpoint.toString(), {
        method: 'GET',
        headers: { apikey: publishableKey, accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'error'
      });
    } catch {
      throw new StoreUnavailable();
    }
    if (!response.ok) throw new StoreUnavailable();
    let rows;
    try {
      rows = await response.json();
    } catch {
      throw new StoreUnavailable('Post store sent invalid JSON');
    }
    if (!Array.isArray(rows) || rows.length > 50) throw new StoreUnavailable('Post store sent unexpected data');
    return rows.map(safePost);
  }
  return {
    mode: 'supabase-readonly',
    async list({ locale, category, limit = 20 }) {
      if (!LOCALES.has(locale) || (category && !CATEGORIES.has(category))
          || !Number.isInteger(limit) || limit < 1 || limit > 50) {
        throw new TypeError('Invalid post filter');
      }
      const filters = { locale: 'eq.' + locale, limit: String(limit) };
      if (category) filters.category = 'eq.' + category;
      return query(filters);
    },
    async get(id) {
      if (!UUID.test(id)) return null;
      const rows = await query({ id: 'eq.' + id.toLowerCase(), limit: '1' });
      return rows[0] ?? null;
    },
    async create() {
      throw new StoreUnavailable('Publishing is disabled in Supabase read-only mode');
    }
  };
}

export function createPostStore({ mode = 'local', dbPath, supabaseUrl, publishableKey, fetchImpl } = {}) {
  if (mode === 'local') return createJsonStore(dbPath);
  if (mode === 'supabase-readonly') return createSupabaseReadStore({
    url: supabaseUrl,
    publishableKey,
    fetchImpl
  });
  throw new Error('Unknown POST_STORE mode; supported: local, supabase-readonly');
}
