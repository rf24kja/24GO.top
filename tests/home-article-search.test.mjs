import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../site/' + path, import.meta.url), 'utf8');
const pages = ['index.html', ...['ru', 'th', 'es', 'fr', 'de', 'pt', 'zh'].map(l => l + '/index.html')];
const css = read('landing.css');
const archiveScript = read('engineering/search.js');

test('all eight homepage languages expose one native same-origin article-search form', () => {
  for (const path of pages) {
    const html = read(path);
    const action = path === 'index.html' ? './engineering/' : '../engineering/';
    const forms = [...html.matchAll(/<form\b[^>]*class="hero-search"[^>]*>/g)];
    assert.equal(forms.length, 1, path);
    const form = forms[0][0];
    assert.match(form, /role="search"/, path);
    assert.match(form, /method="get"/, path);
    assert.ok(form.includes('action="' + action + '"'), path);
    assert.match(html, /<label for="home-article-query">[^<]+<\/label>/, path);
    assert.match(html, /<input id="home-article-query" name="q" type="search" maxlength="80" autocomplete="off">/, path);
    assert.match(html, /<button type="submit">[^<]+<\/button>/, path);
    assert.match(html, /class="hero-search__hint">[^<]+<\/p>/, path);
    assert.ok(html.indexOf('class="hero-actions"') < html.indexOf('class="hero-search"'), path);
    assert.ok(html.indexOf('class="hero-search"') < html.indexOf('class="hero-disclosure"'), path);
    assert.doesNotMatch(form, /target=|onsubmit=|enctype=|data-api|apikey|authorization/i, path);
    // Form works with native GET; does not change article language or submit a draft.
    const relative = new URL(action, new URL(path.replace('index.html', ''), 'https://24go.top/'));
    relative.searchParams.set('q', 'RLS test & 中文');
    assert.equal(relative.origin, 'https://24go.top');
    assert.equal(relative.pathname, '/engineering/');
    assert.equal(relative.searchParams.get('q'), 'RLS test & 中文');
  }
});

test('homepage form feeds the already deployed bounded query reader without extra authority', () => {
  assert.match(archiveScript, /url\.searchParams\.get\('q'\)/);
  assert.match(archiveScript, /slice\(0,80\)/);
  assert.match(archiveScript, /fetch\('\.\/search-index\.json'/);
  assert.match(archiveScript, /window\.history\.replaceState/);
  assert.doesNotMatch(archiveScript, /innerHTML|sendBeacon|localStorage|sessionStorage/);
});

test('homepage article search has responsive layout and contrast-aware keyboard focus', () => {
  assert.match(css, /\.hero-search\{/);
  assert.match(css, /\.hero-search__controls\{display:flex/);
  assert.match(css, /\.hero-search input\{min-width:0/);
  assert.match(css, /@media\(max-width:400px\)\{\.hero-search/);
  assert.match(css, /@media\(prefers-color-scheme:light\)\{\.hero-search button/);
  assert.match(css, /:focus-visible\{outline:3px/);
  assert.doesNotMatch(css, /\.hero-search[^\n]*outline:none/);
});
