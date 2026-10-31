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


# Runtime release receipt is generated inside the Pages runner at exact
# checkout SHA. A source CI success alone is not proof of CDN delivery.
probe '/release.json' release '"pages_run_id":'
if ! grep -Eq '^\{"commit":"[0-9a-f]{40}","pages_run_id":"[0-9]+"\}$' "$tmp/release"; then
  echo '::error::Deployed Pages release receipt is malformed or missing'
  failures=$((failures+1))
fi

if [[ -n "${EXPECTED_PAGES_SHA:-}" || -n "${EXPECTED_PAGES_RUN_ID:-}" ]]; then
  if [[ ! "${EXPECTED_PAGES_SHA:-}" =~ ^[0-9a-f]{40}$ ||
        ! "${EXPECTED_PAGES_RUN_ID:-}" =~ ^[0-9]+$ ]]; then
    echo '::error::Invalid GitHub Pages workflow_run provenance'
    failures=$((failures+1))
  else
    expected_receipt=$(printf '{"commit":"%s","pages_run_id":"%s"}' "$EXPECTED_PAGES_SHA" "$EXPECTED_PAGES_RUN_ID")
    receipt_matched=false
    # A cache-busted public URL avoids falsely accepting an older CDN build.
    for attempt in 1 2 3 4; do
      if curl --fail --silent --show-error --location --max-redirs 3 --connect-timeout 10 --max-time 20 -H 'Cache-Control: no-cache' --output "$tmp/exact-release" "$base/release.json?audit=$EXPECTED_PAGES_RUN_ID" &&
         grep -Fxq -- "$expected_receipt" "$tmp/exact-release"; then
        receipt_matched=true
        break
      fi
      if [[ "$attempt" -lt 4 ]]; then sleep 5; fi
    done
    if [[ "$receipt_matched" != true ]]; then
      echo "::error::Public Pages did not serve completed workflow commit $EXPECTED_PAGES_SHA (run $EXPECTED_PAGES_RUN_ID)"
      failures=$((failures+1))
    else
      echo "PASS exact public Pages release: commit $EXPECTED_PAGES_SHA, run $EXPECTED_PAGES_RUN_ID"
    fi
  fi
fi

probe '/' home '<link rel="stylesheet" href="./landing.css">'

probe '/landing.css' gridcss '.site-grid__glow'
if ! grep -Fq -- '.hero-search__controls{display:flex' "$tmp/gridcss"; then
  echo '::error::Live homepage CSS lacks responsive native search layout'
  failures=$((failures+1))
fi
probe '/landing.js' motionjs 'pointermove'
if ! grep -Fq -- '<script src="./landing.js" defer></script>' "$tmp/home"; then
  echo '::error::Deployed homepage does not load its reviewed motion script'
  failures=$((failures+1))
fi
if ! grep -Fq -- 'OPEN SOURCE · PRE-LAUNCH' "$tmp/home"; then
  echo '::error::Deployed homepage lost the public pre-launch disclosure'
  failures=$((failures+1))
fi
# Verify that the site's declared identity actually reached GitHub Pages.
# The static source/PR alone cannot establish a live search-crawl contract.
if ! grep -Fq -- '"@type": "WebSite"' "$tmp/home" ||
   ! grep -Fq -- '"name": "24GOTOP"' "$tmp/home" ||
   ! grep -Fq -- '"url": "https://24go.top/"' "$tmp/home" ||
   ! grep -Fq -- '"@id": "https://24go.top/#website"' "$tmp/home"; then
  echo '::error::Live homepage is missing verified WebSite structured-data identity'
  failures=$((failures+1))
else
  echo 'PASS public WebSite identity: 24GOTOP canonical source'
fi

probe '/robots.txt' robots 'Sitemap: https://24go.top/sitemap.xml'
probe '/sitemap.xml' sitemap '<loc>https://24go.top/engineering/'
# Verify actual deployed authoring controls, not only a green source build.
probe '/draft-lab.html' draftlab 'id="formatOrderedList"'
probe '/draft-lab.js' draftlab_js 'countDraftWords(body.value,locale.value)'
probe '/draft-lab-logic.js' draftlab_logic 'export function countDraftWords'
probe '/draft-lab-i18n.js' draftlab_i18n "orderedList:"
probe '/draft-lab-guidance.js' draftlab_guidance 'export function analyzeDraftGuidance'
if ! grep -Fq -- 'id="insertTemplate"' "$tmp/draftlab" ||
   ! grep -Fq -- 'id="guidanceScore"' "$tmp/draftlab" ||
   ! grep -Fq -- 'id="draftReadingTime"' "$tmp/draftlab" ||
   ! grep -Fq -- 'appendDraftTemplate(' "$tmp/draftlab_js"; then
  echo '::error::Deployed Draft Lab is missing guided authoring functionality'
  failures=$((failures+1))
fi
probe '/engineering/' index '<h1>Engineering notes</h1>'
# Curated, JavaScript-free topical reading paths must ship as actual HTML.
for topic in security writing infrastructure publishing; do
  probe "/engineering/topics/$topic.html" "topic-$topic" 'class="topic-guide__steps"'
  if ! grep -Fq -- "href=\"./topics/$topic.html\"" "$tmp/index"; then
    echo "::error::Engineering archive does not expose the released topic: $topic"
    failures=$((failures+1))
  fi
done
# The public archive's UX is a client-side enhancement; verify its actual
# deployed, same-origin JavaScript instead of mistaking source CI for delivery.
probe '/engineering/search.js' archive_search 'words.every(word=>entry.searchable.includes(word)'
probe '/engineering/reading-list.js' reading_list_js '24gotop-public-reading-list-v1'
if ! grep -Fq -- 'id="reading-list-panel"' "$tmp/index" ||
   ! grep -Fq -- 'reading-list.js' "$tmp/index"; then
  echo '::error::Live archive lacks optional on-device reading list'
  failures=$((failures+1))
fi
if ! grep -Fq -- 'id="engineering-copy-results"' "$tmp/index"; then
  echo '::error::Live archive missing reference-copy control'
  failures=$((failures+1))
fi
if ! grep -Fq -- 'copyResults.addEventListener' "$tmp/archive_search"; then
  echo '::error::Live archive missing copy handler'
  failures=$((failures+1))
fi
if ! grep -Fq -- '<script src="./search.js" defer></script>' "$tmp/index" ||
   ! grep -Fq -- 'Find articles containing all search words' "$tmp/index"; then
  echo '::error::Live article archive is missing the shipped multi-word search UI'
  failures=$((failures+1))
fi
probe '/engineering/feed.xml' feed '<rss version="2.0">'
probe '/engineering/feed.json' jsonfeed '"version": "https://jsonfeed.org/version/1.1"'
# Cross-check deployed RSS permalinks against the JSON alternative.
if ! grep -Fq -- 'href="./feed.json"' "$tmp/index"; then
  echo '::error::Engineering archive does not advertise the JSON Feed'
  failures=$((failures+1))
fi
while IFS= read -r url; do
  [[ -z "$url" ]] && continue
  if ! grep -Fq -- '"url": "'"$url"'"' "$tmp/jsonfeed"; then
    echo "::error::RSS item absent from deployed JSON Feed: $url"
    failures=$((failures+1))
  fi
done < <(grep -oE '<guid isPermaLink="true">[^<]+' "$tmp/feed" | sed 's/^<guid isPermaLink="true">//')
# Every canonical URL in the actual sitemap must be fetchable, correct and
# render its own canonical tag. New reviewed articles need no script edits.
mapfile -t listed_urls < <(grep -oE '<loc>[^<]+' "$tmp/sitemap" | sed 's/^<loc>//')
if (( ${#listed_urls[@]} < 5 )); then
  echo '::error::Sitemap unexpectedly empty or malformed'
  failures=$((failures+1))
fi
item=0
for url in "${listed_urls[@]}"; do
  item=$((item+1))
  if [[ "$url" != "$base/"* ]]; then
    echo "::error::Unexpected sitemap canonical hostname: $url"
    failures=$((failures+1))
    continue
  fi
  route="${url#"$base"}"
  probe "$route" "page$item" "rel=\"canonical\" href=\"$url\""
  # Each delivered homepage must provide native GET search into public English articles.
  if [[ "$route" == "/" || "$route" =~ ^/(ru|th|es|fr|de|pt|zh)/$ ]]; then
    expected_action='../engineering/'
    [[ "$route" == "/" ]] && expected_action='./engineering/'
    if ! grep -Fq -- 'class="hero-search" role="search"' "$tmp/page$item" ||
       ! grep -Fq -- "method=\"get\" action=\"$expected_action\"" "$tmp/page$item" ||
       ! grep -Fq -- 'name="q" type="search" maxlength="80"' "$tmp/page$item"; then
      echo "::error::Deployed homepage lacks native article search: $route"
      failures=$((failures+1))
    fi
  fi
  # Every published article now has two static, source-reviewed reading
  # paths. Check actual delivered HTML, not just the GitHub source.
  # Limit article-only assertions to a single path segment. The old Bash
  # wildcard also matched /engineering/topics/*.html and gave false failures.
  if [[ "$route" =~ ^/engineering/[a-z0-9-]+[.]html$ ]]; then
    if ! grep -Fq -- '<nav class="related-reading" aria-label="Continue reading">' "$tmp/page$item" ||
       ! grep -Fq -- '<li><a href="./' "$tmp/page$item"; then
      echo "::error::Live engineering article is missing static related reading: $route"
      failures=$((failures+1))
    fi
  fi
done

# GitHub Pages may use intermediate redirects, but the initial canonical
# redirect must be permanent. Verify the complete URL separately because
# a correct root redirect can still drop article paths or query parameters.
for variant in 'https://www.24go.top/' 'http://24go.top/' 'http://www.24go.top/' \
  'https://www.24go.top/engineering/markdown-preview-safety.html?origin=seo-audit' \
  'http://24go.top/engineering/markdown-preview-safety.html?origin=seo-audit'; do
  if ! first="$(curl --silent --show-error --connect-timeout 10 --max-time 30 \
    --retry 2 --retry-all-errors --retry-delay 3 --max-redirs 0 \
    --output /dev/null --write-out '%{http_code}|%{redirect_url}' "$variant")"; then
    echo "::error::Cannot inspect initial redirect for $variant"
    failures=$((failures+1))
    continue
  fi
  initial_status="${first%%|*}"
  if [[ "$initial_status" != '301' && "$initial_status" != '308' ]]; then
    echo "::error::Non-permanent redirect status $initial_status for $variant (expected 301 or 308)"
    failures=$((failures+1))
  fi
  if ! resolved="$(curl --fail --silent --show-error --location --max-redirs 5 \
    --retry 2 --retry-all-errors --retry-delay 3 --connect-timeout 10 --max-time 30 \
    --output /dev/null --write-out '%{url_effective}' "$variant")"; then
    echo "::error::Public redirect unavailable: $variant"
    failures=$((failures+1))
    continue
  fi
  expected_target="$base/"
  if [[ "$variant" == *'/engineering/markdown-preview-safety.html?origin=seo-audit' ]]; then
    expected_target="$base/engineering/markdown-preview-safety.html?origin=seo-audit"
  fi
  if [[ "$resolved" != "$expected_target" ]]; then
    echo "::error::Canonical redirect mismatch or lost URL path/query for $variant (reached $resolved)"
    failures=$((failures+1))
  else
    echo "PASS redirect: $variant -> $resolved (initial HTTP $initial_status)"
  fi
done

if (( failures > 0 )); then
  echo "::error::$failures public availability/content/canonical check(s) failed."
  exit 1
fi
echo 'PASS: public crawlable assets and canonical host verified from GitHub Actions network.'
echo 'NOTE: this does NOT confirm Google/Bing indexing or AI-search recommendations.'
