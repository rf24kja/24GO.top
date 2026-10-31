#!/usr/bin/env bash
# Read-only public CDN smoke check. Never prints response bodies or headers.
set -euo pipefail
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

download() {
  local url="$1" output="$2" attempt
  for attempt in 1 2 3 4 5; do
    if curl --fail --silent --show-error --location \
       --proto '=https' --proto-redir '=https' \
       --connect-timeout 10 --max-time 25 \
       --output "$output" "$url"; then
      return 0
    fi
    if (( attempt < 5 )); then sleep 8; fi
  done
  echo "::error::Public HTTPS asset could not be downloaded: $url" >&2
  return 1
}
require() {
  local needle="$1" file="$2" label="$3"
  if ! grep --fixed-strings --quiet -- "$needle" "$file"; then
    echo "::error::Live asset missing expected $label" >&2
    return 1
  fi
}
origin='https://24go.top'
download "$origin/" "$tmp/home.html"
download "$origin/draft-lab.html" "$tmp/draft.html"
download "$origin/draft-lab.js" "$tmp/editor.js"
download "$origin/draft-lab-logic.js" "$tmp/logic.js"
download "$origin/draft-lab-preview.js" "$tmp/preview.js"
download "$origin/draft-lab-i18n.js" "$tmp/i18n.js"
# The approved README SVGs must also be delivered under site/ by Pages,
# not stranded in docs/assets (the Pages job publishes only site/).
require 'src="./visuals/knowledge-network.svg"' "$tmp/home.html" 'visible hero illustration reference'
require 'src="./visuals/24gotop-showcase.svg"' "$tmp/home.html" 'visible full-width product illustration reference'
download "$origin/visuals/knowledge-network.svg" "$tmp/network.svg"
download "$origin/visuals/24gotop-showcase.svg" "$tmp/showcase.svg"
require '24GOTOP — connected knowledge, human first' "$tmp/network.svg" 'illustrated knowledge map'
require 'Original engineering notes. Readable code.' "$tmp/showcase.svg" 'public visual poster content'
require 'PRE-LAUNCH' "$tmp/showcase.svg" 'honest hosted product status'
# Each localized homepage must actually be delivered by canonical HTTPS,
# with the right self canonical and language-aware editor link. No auth writes.
require 'href="./ru/"' "$tmp/home.html" 'discoverable Russian homepage'
download "$origin/localized.css" "$tmp/localized.css"
require '.language-switch' "$tmp/localized.css" 'shared mobile language picker'
for locale in ru th es fr de pt zh; do
  download "$origin/$locale/" "$tmp/home-$locale.html"
  require "<html lang=\"$locale\">" "$tmp/home-$locale.html" "$locale localized HTML"
  require "rel=\"canonical\" href=\"$origin/$locale/\"" "$tmp/home-$locale.html" "$locale canonical homepage"
  require "href=\"../draft-lab.html?ui=$locale\"" "$tmp/home-$locale.html" "$locale editor language transition"
  require 'OPEN SOURCE · PRE-LAUNCH' "$tmp/home-$locale.html" "$locale release disclosure"
done
require 'hreflang="ru" href="https://24go.top/ru/"' "$tmp/home.html" 'language alternate from English homepage'
require "const requestedUi=new URL(window.location?.href" "$tmp/editor.js" 'allowlisted editor interface deep link'
require 'href="./draft-lab.html"' "$tmp/home.html" 'public Draft Lab navigation'
require 'Hosted public publishing is not live' "$tmp/home.html" 'truthful launch disclosure'
# Article proposal is a public GitHub issue and human-reviewed PR path,
# not the restricted hosted publishing service. Verify actual Pages delivery.
download "$origin/contribute.html" "$tmp/contribute.html"
download "$origin/contribute.css" "$tmp/contribute.css"
require 'href="./contribute.html">Propose an article' "$tmp/home.html" 'discoverable contributor path'
require 'href="./contribute.html" lang="en"' "$tmp/draft.html" 'safe editor-to-proposal navigation'
require 'https://github.com/rf24kja/24GO.top/issues/new?template=article_proposal.yml' "$tmp/contribute.html" 'public GitHub issue template'
require 'Creating a proposal does not guarantee acceptance or publication.' "$tmp/contribute.html" 'manual moderation disclosure'
require 'GitHub issues and pull requests are public.' "$tmp/contribute.html" 'public privacy warning'
require 'contribution-steps' "$tmp/contribute.css" 'mobile-friendly contribution steps'

require 'id="formatLink"' "$tmp/draft.html" 'Link editor control'
require 'does not publish, upload or automatically save your writing' "$tmp/draft.html" 'no-backend warning'
require "['formatQuote','quote'],['formatCode','code'],['formatLink','link']" "$tmp/editor.js" 'wired toolbar action'
require "if(action==='link')" "$tmp/logic.js" 'Markdown Link pure edit'
require 'export function safeCitationUrl' "$tmp/preview.js" 'bounded safe citation preview'
require 'noopener noreferrer ugc' "$tmp/preview.js" 'user-generated external link security'
require 'id="uiLocale"' "$tmp/draft.html" 'independent interface language selector'
require 'data-ui="notice"' "$tmp/draft.html" 'localized pre-launch safety disclosure'
require 'applyUiLanguage(document,uiLocale.value)' "$tmp/editor.js" 'language switch preserving editor fields'
require 'export const UI_STRINGS' "$tmp/i18n.js" 'eight-language offline dictionary'
require 'const RU={' "$tmp/i18n.js" 'Russian locale bundle'
require 'const TH={' "$tmp/i18n.js" 'Thai locale bundle'
require 'const ZH={' "$tmp/i18n.js" 'Chinese locale bundle'
require 'id="articleOutlineSection"' "$tmp/draft.html" 'article section outline'
require 'renderPreviewOutline(field(' "$tmp/editor.js" 'live outline rendering'
require 'export function renderPreviewOutline' "$tmp/preview.js" 'safe outline DOM builder'
require 'const INDENTED_CODE = /^(?: {4}|' "$tmp/preview.js" 'published restricted indented-code parser'
require "body.value.trim() ? body.value : ui('emptyBody')" "$tmp/editor.js" 'untrimmed live preview matches exported source'
require 'outlineTitle:' "$tmp/i18n.js" 'localized section navigation'
# Verify the newly published HTML articles and their discovery surfaces
# after Pages completes. Do not mistake a successful Git merge for CDN delivery.
download "$origin/engineering/" "$tmp/articles.html"
download "$origin/engineering/search.js" "$tmp/search.js"
download "$origin/engineering/search-index.json" "$tmp/search-index.json"
require '"version": 1' "$tmp/search-index.json" 'deployed full-text index version'
require 'content security policy' "$tmp/search-index.json" 'real article body indexed over HTTPS'
require "fetch('./search-index.json'" "$tmp/search.js" 'browser-only same-origin index loading'
download "$origin/engineering/?q=api&topic=security" "$tmp/shared-search.html"
require 'id="engineering-share" hidden' "$tmp/articles.html" 'visible shareable article search action'
require 'id="engineering-share-status" role="status"' "$tmp/articles.html" 'accessible copy-link outcome'
require "url.searchParams.set('q',query)" "$tmp/search.js" 'bounded URL state for search'
require "url.searchParams.set('topic',selected)" "$tmp/search.js" 'allowlisted topic URL state'
require "window.addEventListener('popstate'" "$tmp/search.js" 'restored navigation state'
require 'id="engineering-filter"' "$tmp/shared-search.html" 'public query URL serves readable article directory'
require '<h2 id="latest-heading">Recent articles</h2>' "$tmp/articles.html" 'section heading for screen readers'
require '<h3><a href="./multilingual-markdown-editor-without-losing-drafts.html">' "$tmp/articles.html" 'nested article card heading'
download "$origin/engineering/feed.xml" "$tmp/feed.xml"
download "$origin/sitemap.xml" "$tmp/sitemap.xml"
require '<loc>https://24go.top/contribute.html</loc>' "$tmp/sitemap.xml" 'public proposal page sitemap'
download "$origin/robots.txt" "$tmp/robots.txt"
require 'Sitemap: https://24go.top/sitemap.xml' "$tmp/robots.txt" 'canonical sitemap discovery'
for article in \
  multilingual-markdown-editor-without-losing-drafts \
  verify-github-pages-deploy-not-just-ci \
  safe-markdown-citation-links-without-xss; do
  download "$origin/engineering/$article.html" "$tmp/$article.html"
  require "https://24go.top/engineering/$article.html" "$tmp/$article.html" 'article canonical'
  require 'type="application/ld+json"' "$tmp/$article.html" 'Article JSON-LD'
  require "href=\"./$article.html\"" "$tmp/articles.html" 'crawlable archive link'
  require "<loc>https://24go.top/engineering/$article.html</loc>" "$tmp/sitemap.xml" 'sitemap entry'
  require "<link>https://24go.top/engineering/$article.html</link>" "$tmp/feed.xml" 'RSS entry'
done
require 'https://github.com/rf24kja/24GO.top/pull/81' "$tmp/multilingual-markdown-editor-without-losing-drafts.html" 'verified i18n PR source'
require 'https://github.com/rf24kja/24GO.top/pull/82' "$tmp/verify-github-pages-deploy-not-just-ci.html" 'verified deployment PR source'
require 'https://github.com/rf24kja/24GO.top/pull/78' "$tmp/safe-markdown-citation-links-without-xss.html" 'verified safe Markdown PR source'
echo 'PASS: canonical HTTPS article pages, archive, RSS, sitemap and source evidence were publicly fetched.'
echo 'PASS: live canonical HTTPS site contains safe citations and eight-language Draft Lab interface assets.'
echo 'This does NOT validate real-browser accessibility, Auth, RLS, public publishing or uptime.'
