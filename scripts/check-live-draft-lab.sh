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
require 'outlineTitle:' "$tmp/i18n.js" 'localized section navigation'
# Verify the newly published HTML articles and their discovery surfaces
# after Pages completes. Do not mistake a successful Git merge for CDN delivery.
download "$origin/engineering/" "$tmp/articles.html"
download "$origin/engineering/feed.xml" "$tmp/feed.xml"
download "$origin/sitemap.xml" "$tmp/sitemap.xml"
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
