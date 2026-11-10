# Mobile viewport / horizontal overflow QA — 24GOTOP PUBLIC

Updated: 2026-11-10. Scope: `rf24kja/24GO.top`, published `https://24go.top` static pages only.

## Reproduced defect and fix

The public landing `site-header` had six navigation links with `white-space:nowrap` inside a single flex row, even when the header changed to a full-width row on small screens. Their intrinsic widths exceeded the viewport and created page-level horizontal scrolling. An isolated Chromium reproduction using the previous public header rules measured 526 CSS px document width on a 320 px viewport and 914 px document width on a 768 px viewport.

The updated `site/landing.css` places tablet header navigation in a three-column minmax(0,1fr) grid at widths <=1120 px and a two-column grid at <=520 px. Links may wrap safely, retain a >=44 px tap target and stay visible in normal page flow. The prelaunch badge can wrap instead of forcing header width. The mobile hero grid uses minmax(0,1fr), and the narrow footer uses a single column. The shared interior navigation still wraps and now permits long translated links to break. No global `overflow-x:hidden` hack, JavaScript drawer, hidden nav items, external dependency or private Core changes.

A second isolated Chromium reproduction with the new header rules passed at 320, 360, 375, 390, 430, 520, 760, 768, 900, 1024, 1120 and 1200 CSS px (document width never exceeded viewport). This tests the header reproduction, **not** an independently captured production-device screenshot or every rendered page. Source regression tests cover eight localized homepages and important interior routes.

## Real browser and postdeploy acceptance

On the final PUBLIC Pages deployment, inspect in browser responsive mode and on at least one real phone:

1. Open `https://24go.top/` and `/ru/`, then representative translated landing pages `/th/`, `/zh/` at widths 320, 360, 375, 390, 430 and 768 px; include 1024 px for tablet.
2. Verify the entire primary menu stays visible, no links run past the right edge, every link is clickable, tab focus is visible, and scrolling the **page** happens vertically.
3. Open `/draft-lab.html`, `/engineering/`, `/engineering/reading-paths/`, `/contribute.html`, and an original article. Test navigation, editable controls, code blocks, wide tables and long translations. Horizontal scrolling **inside an individual code/table container** is intentionally allowed; horizontal scrolling of the entire page is not.
4. In DevTools Console measure actual page overflow:
   ```js
   const w=document.documentElement.clientWidth;
   const overflow=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-w;
   console.log({viewport:w,extraHorizontalPixels:overflow});
   ```
   Expect `extraHorizontalPixels <= 1`. If higher, identify the overflowing element instead of hiding document overflow.
5. Repeat with browser zoom, light/dark scheme, touch navigation and keyboard Tab/Shift+Tab.

## Verification boundaries

PUBLIC `npm run check` and `npm test` must pass before merge. A merged PR alone does not prove this style reached CDN; after a PUBLIC GitHub Pages deployment, confirm the exact merged SHA and byte-matched static CSS via independent HTTPS checks. Mobile E2E on physical devices remains pending until real observations are supplied. Rollback is a focused revert of the public CSS/test/docs PR and a verified PUBLIC Pages redeploy. Never invoke private `24GO.online` workflows.
