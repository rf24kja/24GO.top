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
echo 'PASS: live canonical HTTPS site contains safe citations and eight-language Draft Lab interface assets.'
echo 'This does NOT validate real-browser accessibility, Auth, RLS, public publishing or uptime.'
