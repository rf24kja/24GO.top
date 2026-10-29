#!/usr/bin/env bash
# An external read-only smoke test, intended for GitHub-hosted Ubuntu runners.
# This probes only founder-selected public 24GOTOP URLs. No credentials or mutations.
set -euo pipefail

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
base='https://24go.top'
failures=0

probe() {
  local route="$1" name="$2" expected="$3" actual
  local target="$base$route"
  # curl verifies TLS by default; never use -k. Follow bounded redirects.
  if ! actual="$(curl --fail --silent --show-error --location --max-redirs 5 \
    --retry 2 --retry-all-errors --retry-delay 3 --connect-timeout 10 --max-time 30 \
    --output "$tmp/$name" --write-out '%{url_effective}' "$target")"; then
    echo "::error::Public URL unavailable: $target"
    failures=$((failures+1))
    return 0
  fi
  if [[ "$actual" != "$target" ]]; then
    echo "::error::Unexpected final canonical URL for $route: $actual"
    failures=$((failures+1))
  fi
  if ! grep -Fq -- "$expected" "$tmp/$name"; then
    echo "::error::Expected public artifact content missing: $route"
    failures=$((failures+1))
    return 0
  fi
  echo "PASS public content: $route (resolved to $actual)"
}

probe '/' home '<title>24GOTOP'
probe '/robots.txt' robots 'Sitemap: https://24go.top/sitemap.xml'
probe '/sitemap.xml' sitemap '<loc>https://24go.top/engineering/'
probe '/engineering/' index '<h1>Engineering notes</h1>'
probe '/engineering/feed.xml' feed '<rss version="2.0">'
probe '/engineering/discoverable-technical-articles.html' article '<h1>Publishing technical articles'
probe '/engineering/postgres-insert-returning-least-privilege.html' postgres '<h1>INSERT succeeds, RETURNING fails'

for variant in 'https://www.24go.top/' 'http://24go.top/' 'http://www.24go.top/'; do
  if ! resolved="$(curl --fail --silent --show-error --location --max-redirs 5 \
    --retry 2 --retry-all-errors --retry-delay 3 --connect-timeout 10 --max-time 30 \
    --output /dev/null --write-out '%{url_effective}' "$variant")"; then
    echo "::error::Public redirect unavailable: $variant"
    failures=$((failures+1))
    continue
  fi
  if [[ "$resolved" != "$base/" ]]; then
    echo "::error::Canonical redirect mismatch for $variant (reached $resolved)"
    failures=$((failures+1))
  else
    echo "PASS redirect: $variant -> $resolved"
  fi
done

if (( failures > 0 )); then
  echo "::error::$failures public availability/content/canonical check(s) failed."
  exit 1
fi
echo 'PASS: public crawlable assets and canonical host verified from GitHub Actions network.'
echo 'NOTE: this does NOT confirm Google/Bing indexing or AI-search recommendations.'
