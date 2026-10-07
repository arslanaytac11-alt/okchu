# Okchu — current project state

Updated 7 October 2026. Current candidate is **1.1.0 (148)**; no upload, App Review submission or App Store release has occurred.

## Current gameplay and design

The local preview is `http://127.0.0.1:5188/?kontrol=1`; `npm run preview:start` keeps the loopback-only server running independently of the terminal. Explicit local inspection opens all 10 chapters and 50 puzzles in untimed Zen. Saves, resources, scores, settings and Premium use an isolated memory snapshot. Native bridges and remote origins cannot activate this flag; ordinary 8-star boss/10-star chapter gates remain.

The five Egyptian puzzles introduce the controls and visible symbol sequence. The following **45 puzzles are new seal mazes** with longer bent arrows and three arrow chains coordinated by one visible symbol sequence. Each removal must have a clear exit and match the active symbol above the board. Removing a matching arrow can make the remaining sequence impossible. Free unlimited Undo supports reconsidering those choices; hints provide only an exactly proved safe continuation. A bounded solver returns unknown rather than a false failure or an unsafe hint.

All 50 IDs, names, chapter order, progression keys, existing bundle `com.arslanaytac.okchu`, App Store ID `6762461650`, and Premium product `com.arslanaytac.okchu.premium` are preserved. There are 2,109 arrows across the campaign. No simulator mini-game was added.

Late difficulty is graded by the minimum over **every winning route**, including choices whose earliest possible dead end is 4/6/8 removals away. Grades also check further branching and limit long intervals without a critical choice. Final chapter six-removal minima are **4, 6, 5, 6, 5**; the final boss has three eight-removal decisions. A distance includes the selected wrong removal. These are exact structural guarantees, not a claim that every player will find a puzzle difficult. The first-final floor is explicitly four; other final floors are five. No failed candidate is silently substituted.

The game screen now uses a compact header, one inline status row, a visible sequence, a large borderless board and one bottom tool dock. Arrows use a thin flat shaft/open tip, outlined symbols and stable decorative colors. Matte paper replaces stepped bevels/shadows. Minimum body contrast is 5.31:1; causal error cue contrast is 3.81:1. The final seal is 23×32 with 453 occupied cells and paths of 5–13 cells. `boardCells` records the immutable actual footprint for fitting; the historical level names do not imply the old silhouette is still rendered.

Current cache: main53 / Game10 / Screens6 / Renderer6 / Balance4 / redesign CSS8 / SW39. The service worker covers the complete first-offline module graph and prioritizes exact query URLs.

## Verification

`npm test` passed all **22 suites**, all 50 level validations, and 48 JavaScript syntax checks. It includes 2,109 actual Game removals, 1,000 varied exact-safe campaign solves, 48 losing-choice/dead-end/Undo recoveries, 227,772 input coordinate cases, 69,597 motion frames, and an independent all-winning-route difficulty oracle. Evidence: `outputs/qa/seals-final-test.log` and `outputs/qa/test-results.json`.

Actual Codex browser observations cover 320×568, 390×844 and 844×390, light/dark themes, the explanation dialog, zoom and recenter. Controls remain at least 44×44 with no horizontal overflow. Dense puzzles use the zoom controls/two-finger zoom; the entire portrait seal is smaller in a short landscape viewport. These are browser observations, not physical touch or fold tests. Current images are `outputs/qa/seals-final50-light-390.png`, `-light-320.png`, `-dark-390.png`, and `-landscape.png`.

## Native and publication

Existing iOS 15 deployment targets, Xcode 27.1/27A9275, UIKit scene lifecycle, same bridged WKWebView, public reserved-region/hinge layout, existing StoreKit product, UMP consent bridge and guarded native AdMob banner pane are retained. Duo helper passed 4,971 geometry checks and native compilation previously passed. Actual Duo folds, physical touch/haptics, signed-device purchases/restoration, production consent/ads and an upgrade from public 1.0.4 remain unverified. Previous dedicated simulator installs preserved candidate LocalStorage, a narrower check.

The previous `export-1.1.0-148-final/App.ipa` (main49/Game6/SW35) and provisional `export-1.1.0-148-rune/App.ipa` are **historical and do not contain current gameplay/UI**. The new frozen seal snapshot has been archived/exported with existing manual signing assets. Current IPA: `outputs/native/export-1.1.0-148-seals/App.ipa`, SHA-256 `8ea102c571df38d590553851495a99df2f5f1ec2ed27f698475d5feac4406963`. All116 public and20 native hashes, generated plugins, compiled icon and deep/strict distribution signature passed; proof is `outputs/native/release-verification-seals.json`. See [release status](docs/RELEASE_1.1.0.md). Never upload a historical artifact as this revision.

The existing App Store Connect 1.1.0 metadata draft needs the new rule text before submission. Five localized drafts are saved in [store metadata](docs/store-metadata-1.1.0.json) with updated [review notes](APPSTORE_REVIEW_NOTES.md). Existing automatic-release preference remains unchanged. The Mac was locked during prior native UI/upload work; no unlock retries or shared-service resets were used.

See [research and difficulty](docs/PUZZLE_RESEARCH.md), [QA](docs/QA_1.1.0.md), [release](docs/RELEASE_1.1.0.md), [submission](docs/APP_STORE_SUBMISSION.md), and [draft PR #1](https://github.com/arslanaytac11-alt/okchu/pull/1).
