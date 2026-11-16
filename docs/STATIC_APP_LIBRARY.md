# 24GOTOP Library v1 — public static apps and source review

**Live catalogue:** https://24go.top/library/

**Released experience:** three actual first-party, source-reviewed static applications, searchable cards, two-app feature comparison, and **explicit click-only iframe previews** without same-origin access. The source code is under site/library/apps/. This is *not* a user-uploading cloud marketplace. No hosted app account or end-user submission API is open.

## Why Library v1 is deliberately narrow

Only deterministic static **HTML, CSS, JavaScript and selected static images** are supported. No backend services, arbitrary serverless functions, executable binaries, shell scripts, database credentials, network permissions, external dependencies, service workers, or arbitrary server execution are allowed. Source code must be readable, reproducible and manually reviewed before it can appear in the public catalogue.

The main 24go.top origin must **never** be an arbitrary third-party JavaScript upload host. Even a sandboxed iframe can be bypassed by a user navigating directly to an untrusted HTML route hosted on the same origin. During this public OSS stage, **only explicitly reviewed first-party code** may exist under site/library/apps/. A future production third-party publishing flow requires a **separate execution origin**, secure upload storage, malware/static analysis, quarantine, moderation, identity/ownership, audit, runtime CSP, per-app quotas, isolation tests, abuse controls and a rollback plan. Those hosted features are not deployed.

## Current reviewed applications

- JSON Inspector: actual local JSON validation, pretty-print, depth, node count and UTF-8 size reporting.
- Contrast Checker: actual WCAG 2.2 ratio calculation and AA/AAA checks for normal/large text.
- Text Diff: actual bounded line-by-line comparisons for Markdown, source code and configuration changes with added/removed/unchanged metrics.

Each app has its own publicly inspectable HTML, no backend, no external network, and an internal Content Security Policy disabling network connections. Preview runs on an iframe with ONLY allow-scripts; it deliberately does not include allow-same-origin, allow-top-navigation, allow-popups or allow-downloads. No app loads automatically when you open the catalogue.

The comparison table shows source-backed properties (features, category, version, license, runtime, network capability). After comparing two reviewed apps, an explicit **Download comparison (.md)** control saves their source-backed descriptions, features, versions and canonical repository links as a local Markdown report without uploading, logging or persisting the choice. It is **not** a manipulated popularity score or fabricated ranking. App list changes require a GitHub PR; anonymous users cannot add arbitrary executable code to the live site.

## Browser submission preparation — available now

At https://24go.top/library/, scroll to **Check a static app ZIP without uploading it**.
Choose a ZIP32 file of up to 4 MiB and explicitly click **Check local ZIP**.
The on-device browser validator checks central-directory consistency, file sizes
and paths, non-symlink types, CRC32, supported deflate, source extensions,
obvious forbidden dynamic capabilities, and computes SHA-256 checksums using
Web Crypto. Files are never executed, extracted, sent to our servers, or
persisted in storage. The browser shows a full file inventory and a
copyable audit report; invalid packages are rejected without a GitHub
review link.

After a passing local check, enter an **application name** and the link to
a **public GitHub source repository**. The site then prepares a GitHub
*issue draft* containing the name, repository URL, validated file count,
expanded size and ZIP hash. You must explicitly open the GitHub link, sign
in, review the text and submit it. **No ZIP bytes are sent to GitHub by
24GOTOP, and a GitHub issue does not publish an application.** The public
repository must actually contain the source being proposed. Never put
private source or credentials into GitHub public issues.

This browser check is a convenience for ordinary contributors; the Node
CLI remains the independent local intake and final reviewer reference.
The browser may decline deflate in engines without the native
DecompressionStream deflate-raw format; use the CLI in that case. Both
checks are conservative and do not prove code is free from malicious
behavior or that an applicant owns the source.

## App Studio — author, test and export entirely in browser (available now)

The live [App Studio](https://24go.top/library/studio/) provides a real
authoring experience for beginning contributors. No Node.js installation,
API key, existing ZIP or public account is required to start:

1. Open the Studio and edit the **HTML**, **CSS** and **JavaScript** tabs.
   A working counter app is supplied, or choose **Load static page example**
   for a real no-JavaScript HTML/CSS resource page. The CSS and JavaScript
   fields are **optional** (HTML body remains required): both can be empty,
   including when previewing, exporting and reimporting a ZIP. The editors
   can be changed to create an original tool. Switching examples now
   **asks before replacing modified source**; declining leaves the editors
   and running preview unchanged. The Studio supports one self-contained page;
   no npm, imports, remote scripts, external assets, backend processes
   or separate app files in this first release.
2. Click **Run isolated preview**. The Studio first compiles one HTML file
   with a strict no-network CSP, builds a deterministic ZIP32 archive in
   memory, and runs the independent browser ZIP validator. Only a passing
   static package is placed in an explicit-click iframe with
   \`sandbox="allow-scripts"\` and **no \`allow-same-origin\`**.
   The iframe has an **opaque origin**; no iframe parent DOM access, top
   navigation, forms, popups or privileged permissions. Changing source
   stops the old preview; explicit **Stop preview** also destroys it.
3. Click **Validate & download ZIP**. The same HTML that was just previewed
   becomes \`index.html\` in an actual, portable ZIP32 file. The browser
   checks CRC32, static-only limits and SHA-256 before offering the download.
   Nothing is uploaded to 24GOTOP or GitHub.
4. **Continue later:** Return to App Studio and use **Continue an earlier
   Studio project → Load ZIP into editors**. Choose the ZIP you previously
   downloaded from App Studio; the browser rechecks its ZIP structure,
   hash and original canonical Studio envelope, then asks before
   overwriting any modified source. Cancelling keeps the source and preview
   untouched; an import that becomes stale while confirming is discarded.
   Accepted imports restore the name, HTML, CSS and JavaScript without
   running any imported code. External,
   multi-file or modified non-Studio archives fail closed. Only after
   an explicit **Run isolated preview** click does the restored project
   execute in the opaque sandbox. Editing and re-exporting creates a new
   deterministic ZIP with a different SHA-256.
5. Keep your ZIP and source code. In the main Library, use **Check local ZIP**
   to verify it again, add a public GitHub repository that actually contains
   the source, and explicitly create a human review request. A review
   request does **not** create a hosted application or grant automatic
   publication rights.

The current Studio rejects HTML with embedded scripts, remote resource
attributes, iframes or forms; it also rejects prohibited network/browser
storage APIs, external imports and CSS remote URLs. These are **conservative
source rules, not formal proof of safety**. An opaque iframe is important
isolation against arbitrary untrusted JavaScript, but it does not authorize
hosting that JavaScript at \`https://24go.top\`, where a direct app URL might
otherwise gain the main origin's ambient privileges.

**Data lifecycle:** Editor text and local app output remain in the current
tab, without upload, cookies, analytics, account storage or background save.
Download the ZIP or save your source **before closing or reloading** the tab.
The status under the editor shows whether source differs from its built-in or
verified-import baseline; any subsequent edit, even after pressing Download,
remains marked as unsaved. When leaving, browsers can display their standard,
best-effort unsaved-change warning (some browsers suppress it). Switching
templates or applying a verified ZIP requires confirmation before discarding
unsaved changes. A request to download a ZIP is not proof the browser saved it.
An accepted template or validated imported ZIP resets the comparison baseline;
a cancelled replacement cannot stop the preview or alter the manuscript.
No one can restore a closed-tab draft through 24GOTOP's servers.

## Contributor submission: ZIP or GitHub checked-out source

1. Prepare a static app directory with a root index.html, self-contained CSS/JS and optional supported local images. For now file paths must be ASCII slug-like names (including up to 3 nested folders). Do not include secrets, .env, credentials, analytics, remote JS, webhooks, sensitive user records, full repositories, or build artifacts unrelated to the executable static bundle.
2. If using ZIP, put the **contents of the app directory at the ZIP root**, including index.html (do not zip the enclosing project folder). The ZIP tool accepts conventional ZIP32 stored or deflate-compressed files; not ZIP64, symlinks, encryption, or backend artifacts.
3. Run the public validator locally:

~~~sh
npm run library:validate -- --zip my-static-app.zip
# or, after cloning an app's GitHub repository locally:
npm run library:validate -- --dir ./my-project/dist
~~~

4. Review the JSON report. It contains file paths, byte sizes, SHA-256 hashes, total size, entry file and **reviewRequired: true, automaticHosting: false**. This is a **static intake report, not publication approval**. It never extracts ZIP, executes the app, uploads the archive, or sends network requests.
5. Open a pull request in https://github.com/rf24kja/24GO.top with a safe source contribution or a link to the GitHub repository and the local validation report. The final first-party reviewed app must be committed under site/library/apps/<approved-slug>/ and added to the fixed catalogue by an authorized maintainer. **Do not simply commit unknown community JS to 24go.top**, and do not treat a public PR as a trusted upload mechanism.
6. Maintainers perform human source/license reviews, verify safe static assets, run Chromium sandbox tests and CI, and only then approve an eligible first-party app. Third-party hosted apps remain blocked pending separate-origin infrastructure and production ownership decisions.

### Static intake limitations (intentionally conservative)

- ZIP file <=4 MiB, expanded contents <=2 MiB, at most 48 files, each <=512 KiB, root index.html required.
- HTML, CSS, JS, MJS, JSON, PNG, JPG/JPEG, WEBP, GIF only; no SVG, WASM, PHP, Python, scripts, symlinks, absolute paths, traversal or hidden files. Source must be UTF-8.
- ZIP32 central-directory integrity, CRC32 per-file check, decompression output cap and case-insensitive duplicate detection.
- Conservative rejection of remote active resources, dynamic remote fetch, forms, service workers, browser storage, parent/top frame access, eval and other disallowed primitives. This pattern-based check is **not a comprehensive security sandbox** and **cannot establish that arbitrary JS is safe**. Manual review remains mandatory. Validating a ZIP is not permission to upload it to 24go.top.
- GitHub checkout validation reads local files and rejects symlinks and unsupported source files. It does not execute a remote git clone or trust any third-party GitHub repository by name alone.

### Repeatable maintainer publication gate (implemented)

The Library now has a real first-party source publication check, not merely
instructions. All maintainers and contributors can run:

~~~sh
npm run library:check
npm run check
npm test
npm run library:browser
~~~

The Library check enumerates **every** folder under site/library/apps.
It fails if an executable source directory is missing from the reviewed
site/library/catalog.json inventory, if the catalog lists a missing app, or
if a directory contains unsupported paths, scripts or symlinks. Every
listed app must pass the Node static package validator, retain a matching
catalog/document title and include the no-network CSP requirements
(default-src, connect-src, form-action, base-uri and object-src all set
to none). The check validates *all* reviewed apps rather than hard-coding
the existing first two examples.

To introduce a **new first-party reviewed app**, add its fully auditable
source under site/library/apps/<slug>/ and a matching entry to
site/library/catalog.json. Run the checks, submit a GitHub PR and let
maintainers review the actual source and provenance. Once a PR passes
CI and human review and is merged into main, GitHub Pages publishes it
and the exact-CDN audit verifies the app's deployed bytes. This workflow
does **not** let anonymous third parties publish arbitrary JavaScript;
they must not receive deployment rights to the main 24go.top origin.
Production third-party uploads must eventually use a separately
sandboxed hostname with owner-bound authorization, content moderation
and independent security checks.

### Review, rollback and honest readiness

The publication transaction for the **current first-party OSS catalogue** is a reviewed Git commit → required CI → merge → GitHub Pages static deployment → exact CDN source check → stable public URL. A failed review/CI blocks release; rollback is reverting the app and its catalog entry. There is no user-upload endpoint, public package registry or automatic cloud deployment.

Planned hosted publishing is a separate state machine: verified app owner → server-side upload/storage/quarantine → authorization and review → isolated origin creation → published version/URL → rating/compare and abuse controls. Do not represent it as already available. The public validator and comparison UI are building blocks, not a shortcut around that security model.

**No-JavaScript validation evidence (2026-11-16):** The static page uses the
same network-denying CSP, opaque preview and independent ZIP32/CRC32/SHA-256
validation as interactive Studio apps. Both validators must accept an archive
with empty CSS and/or JavaScript; reimport must reproduce the exact source
without auto-running anything. Actual Chromium covers the new starter,
preview, ZIP export and reimport at four viewport sizes. Passing this
validation still does not approve publication on 24go.top.
