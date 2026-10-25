# 24GOTOP public deployment — verification log

**Maintainer record, 2026-10-26.** This log distinguishes code merges, GitHub Actions output, owner observations and independent external checks. It is not an uptime guarantee.

| Area | What is confirmed | Evidence / verification boundary |
| --- | --- | --- |
| Repository | Public source and CI in `rf24kja/24GO.top` | GitHub PRs, Actions and tests |
| Static landing, `https://www.24go.top/` | **Founder reports that the HTTPS page opens successfully in their browser** | Direct owner confirmation on 26 Oct 2026; independent automated request did not return inspectable content |
| Apex `https://24go.top/` | **Not independently confirmed** | DNS, redirect and certificate need a separate check; do not assert apex-to-www or www-to-apex behavior |
| Draft Lab, `/draft-lab.html` | Source committed and browser-only logic tested | Browser/HTTPS reachability and mobile behavior not independently verified |
| Engineering notes, `/engineering/` | Static page and RSS prepared in a reviewable PR | Must verify after Pages deploy; no live content URL claim until then |
| Public publishing / login | **Not implemented** | The site's public landing is not the Node.js API and does not accept user posts |
| Privacy and analytics | No site-side analytics are claimed | GitHub Pages/provider/server logs may still exist; do not claim zero network metadata collection |

## What the owner can verify without changing DNS

1. In a private browser window, open `https://www.24go.top/` and inspect HTTPS/certificate.
2. Open `https://www.24go.top/draft-lab.html`, test typing, local Markdown download and Clear cancellation.
3. After the corresponding GitHub Pages deployment succeeds, open `https://www.24go.top/engineering/` and its article and RSS links.
4. Open `https://24go.top/` separately; record whether it loads, and if redirects occur, capture the actual final URL.
5. Check mobile keyboard navigation and whether every asset loads correctly; do not paste private drafts into bug reports.

## When to close deployment Issue #11

Close only with evidence that the intended canonical host is configured, DNS checks pass, HTTPS works, GitHub Pages deployment is successful, and primary prelaunch pages have been smoke-tested. A single successful `www` page view is strong progress but **not** proof of the entire deployment chain.

No DNS, Namecheap or GitHub Pages settings were changed in this log.
