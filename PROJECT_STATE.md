# Okchu — current project state

Updated 7 October 2026. Current candidate is **1.1.0 (148)**; no upload, App Review submission or App Store release has occurred.

## Current gameplay and design

The local preview is `http://127.0.0.1:5188/?kontrol=1`; `npm run preview:start` keeps the loopback-only server running independently of the terminal. Explicit local inspection opens all 10 chapters and 50 puzzles in untimed Zen. Saves, resources, scores, settings and Premium use an isolated memory snapshot. Native bridges and remote origins cannot activate this flag; ordinary 8-star boss/10-star chapter gates remain.

The five Egyptian puzzles introduce the controls and visible symbol sequence. The following **45 puzzles are new seal mazes** with longer bent arrows and three arrow chains coordinated by one visible symbol sequence. Each removal must have a clear exit and match the active symbol above the board. Removing a matching arrow can make the remaining sequence impossible. Free unlimited Undo supports reconsidering those choices; hints provide only an exactly proved safe continuation. A bounded solver returns unknown rather than a false failure or an unsafe hint.

All 50 IDs, names, chapter order, progression keys, existing bundle `com.arslanaytac.okchu`, App Store ID `6762461650`, and Premium product `com.arslanaytac.okchu.premium` are preserved. There are 2,109 arrows across the campaign. No simulator mini-game was added.

Late difficulty is graded by the minimum over **every winning route**, including choices whose earliest possible dead end is 4/6/8 removals away. Grades also check further branching and limit long intervals without a critical choice. Final chapter six-removal minima are **4, 6, 5, 6, 5**; the final boss has three eight-removal decisions. A distance includes the selected wrong removal. These are exact structural guarantees, not a claim that every player will find a puzzle difficult. The first-final floor is explicitly four; other final floors are five. No failed candidate is silently substituted.

The game screen now uses a compact header, one inline status row, a visible sequence, a large borderless board and one bottom tool dock. Arrows use a thin flat shaft/open tip, outlined symbols and stable decorative colors. Matte paper replaces stepped bevels/shadows. Minimum body contrast is 5.31:1; causal error cue contrast is 3.81:1. The final seal is 23×32 with 453 occupied cells and paths of 5–13 cells. `boardCells` records the immutable actual footprint for fitting; the historical level names do not imply the old silhouette is still rendered.

Holding an arrow for 180ms enters precision selection: the board zooms around the finger toward a 30 CSS-pixel cell, capped at scale 5, previews the complete arrow and commits on release without an automatic move. Short taps remain available. Pan reaches every board edge; pinch, changed touch identities, extra fingers, cancellation and lifecycle transitions cancel pending actions. Selection remains geometric and does not favor the current symbol or a safe solution.

Current cache: main54 / Game11 / Screens6 / Renderer7 / Balance4 / redesign CSS8 / SW40 / language14. The service worker covers the complete first-offline module graph and prioritizes exact query URLs.

## Verification

`npm test` passed all **23 suites**, all 50 level validations, and 48 JavaScript syntax checks. It includes 2,109 actual Game removals, 1,000 varied exact-safe campaign solves, 48 losing-choice/dead-end/Undo recoveries, 227,772 input coordinate cases, 69,597 motion frames, and an independent all-winning-route difficulty oracle. The added touch suite passed 14 groups, 180,015 coordinate cases, 146 gesture cases and 13 precision checks using the actual listeners and transforms. Evidence: `outputs/qa/touch-final-test.log` and `outputs/qa/test-results.json`.

Fresh Codex browser observations on the touch snapshot cover the final 75-arrow board at 320×568, 390×844 and 844×390. All eight controls are at least 44×44 CSS pixels (heights44–48), and inside the viewport, with no horizontal overflow. Zoom/recenter were clicked, the localized hold hint was visible, and no warning/error was observed. The temporary inspection tab was closed and the user's original session preserved. Current images are `outputs/qa/touch-final50-light-390.png`, `-light-320.png`, `-zoom-390.png`, and `-landscape.png`. Earlier seal captures also cover dark mode and the explanation dialog. No actual browser hold gesture, manual 75-arrow solve, physical touch or fold test is claimed; the dense portrait seal remains smaller in short landscape fit.

## Native and publication

Existing iOS 15 deployment targets, Xcode 27.1/27A9275, UIKit scene lifecycle, same bridged WKWebView, public reserved-region/hinge layout, existing StoreKit product, UMP consent bridge and guarded native AdMob banner pane are retained. Duo helper passed 4,971 geometry checks and native compilation previously passed. Actual Duo folds, physical touch/haptics, signed-device purchases/restoration, production consent/ads and an upgrade from public 1.0.4 remain unverified. Previous dedicated simulator installs preserved candidate LocalStorage, a narrower check.

The previous `export-1.1.0-148-final/App.ipa` (main49/Game6/SW35), provisional `export-1.1.0-148-rune/App.ipa`, and `export-1.1.0-148-seals/App.ipa` are **historical and exclude the current touch changes**. Current IPA: `outputs/native/export-1.1.0-148-touch/App.ipa`, 73,661,091 bytes, SHA-256 `2f7d73150d8dadda7d35b8111fe04ea695f039cfd607ddf748e16a600a2f634d`. All 116 public / 20 native hashes, three generated files, ten PNGs, compiled icon, existing manual distribution identity/profile, deep/strict signature, Release DEBUG=false, iOS15 minimum and SDK27.1 passed verification. Proof: `outputs/native/release-verification-touch.json` and `outputs/native/source-manifest-touch.json`. This verifies the local package; no new native UI launch or upload is claimed. See [release status](docs/RELEASE_1.1.0.md).

The existing App Store Connect 1.1.0 metadata draft needs the new rule text before submission. Five localized drafts are saved in [store metadata](docs/store-metadata-1.1.0.json) with updated [review notes](APPSTORE_REVIEW_NOTES.md). Existing automatic-release preference remains unchanged. The Mac was locked during prior native UI/upload work; no unlock retries or shared-service resets were used.

See [research and difficulty](docs/PUZZLE_RESEARCH.md), [QA](docs/QA_1.1.0.md), [release](docs/RELEASE_1.1.0.md), [submission](docs/APP_STORE_SUBMISSION.md), and [draft PR #1](https://github.com/arslanaytac11-alt/okchu/pull/1).
