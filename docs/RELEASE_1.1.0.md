# Okchu 1.1.0 release candidate

## Current touch and seal revision

Current frozen source is main54/Game11/Screens6/Renderer7/Balance4/CSS8/SW40/lang14. It includes 45 new seal mazes, visible symbol order, free unlimited coded-board Undo, thin flat arrows and a simplified game screen. A 180ms hold magnifies the touched cell toward 30 CSS pixels (maximum scale 5), previews the geometric selection and moves only on release. Multitouch, replacement contact IDs, panning and lifecycle cancellation clear pending input. Scaled-content pan limits make every enlarged board edge reachable. All 23 suites, 50 validations and 48 syntax checks pass. The exact progress/bundle/Premium identities remain. Final six-removal decision floors are 4/5/5/5/5, observed 4/6/5/6/5; the boss eight-removal floor is 3.

The new manually signed artifact is verified at `outputs/native/export-1.1.0-148-touch/App.ipa` (73,661,091 bytes). SHA-256: `2f7d73150d8dadda7d35b8111fe04ea695f039cfd607ddf748e16a600a2f634d`. `outputs/native/release-verification-touch.json` confirms all 116 current public hashes, 20 native source/patch hashes, 3 generated Cordova files, 10 chapter PNGs,compiled icon, existing identity/profile, deep/strict signature and production Release flags. App and Capacitor are iOS 15.0 / SDK 27.1 with DEBUG=false. Public source rows digest: `2f15dc687fd176bf2c9d35404580d9ce1c17f0f703277268082501af27642d22`; native digest: `cf5b763ebe0a4e079a617c8abdf8e1756bd00e9cebcceb6898a9c568751ed049`.

Signing/payload verification does not supply a new native UI launch, physical finger/Duo test or live purchase observation. **No upload has occurred.** Five updated localized metadata drafts are [saved here](store-metadata-1.1.0.json); [review notes](../APPSTORE_REVIEW_NOTES.md) explain the rule and precision touch. Existing App Store Connect metadata predates these changes and needs updating.

The `-seals` export remains a verified historical main53/Game10/SW39 snapshot; it lacks the latest touch changes. Everything below describes the earlier main49/Game6/SW35 signed snapshot. Its labels “final” are historical. Current browser/structural QA does not supply physical Duo, purchase/restore, production ads or public-install upgrade observations.

## Historical signed snapshot

Updated 7 October 2026. The final local signed candidate is **1.1.0 (148)**, built with **Xcode 27.1 / 27A9275**. No build has been uploaded, submitted for review, or released from this work. Simulator checks, source tests, and signed-artifact checks below have different scopes; live purchase/restore and a public-install upgrade remain pending.

## Identity and update behavior

| Field | Value |
|---|---|
| Existing listing | [Okchu: Arrow Puzzle](https://apps.apple.com/tr/app/okchu-arrow-puzzle/id6762461650) |
| Seller | AYTAC ARSLAN |
| App Store ID | `6762461650` |
| Bundle ID | `com.arslanaytac.okchu` |
| Existing non-consumable | `com.arslanaytac.okchu.premium` |
| Candidate version/build | `1.1.0 (148)` |
| Minimum OS | iOS `15.0`, in source App/Pods configurations |
| Public version | `1.0.4`; App Store Connect's latest completed upload was `1.0.4 (147)` |

The existing bundle, premium product and progress keys are retained. The same fifty level IDs/names remain; baseline comparison found 47 new puzzle silhouettes and changed board dimensions, rather than additional levels. Verify preservation and premium restoration by upgrading the public 1.0.4 installation on a signed device. Candidate-to-candidate simulator reinstall is a separate, narrower check.

## Final native implementation

- The native App Store icon is an opaque 1024×1024 resize of `assets/icons/okchu-expedition-original.png`: a golden bent arrow on lagoon stone. The single universal AppIcon slot lets Xcode derive device icons. Compiled iPhone/iPad icon resources and the icon catalog are present in the signed IPA. Versioned 192/512 web icons and the splash/brand tile are copied into the same artifact.
- UIKit scene lifecycle is implemented through `App.SceneDelegate`; it owns the storyboard window and forwards URL/universal-link events to Capacitor. This fixes the actual iOS 27 launch termination seen with the previous app-delegate-only shell.
- Portrait and both landscape orientations remain supported. Native launch/WebView backgrounds use `#FFF2D8`; the web layer controls dark mode. Native `contentInset: never` and CSS `viewport-fit=cover`/four `env(safe-area-inset-*)` values avoid double inset padding.
- On iOS 27.1+, `OkchuViewController` retains Capacitor's original bridged WKWebView as a child of a full-window UIView. It queries active UIKit `.division` and `.occlusion` reserved regions in that container's coordinates; the system frames already include their margins. `DuoViewport` selects the largest rectangle avoiding those regions, preferring the previous viewport center for deterministic ties. It never invents exclusion geometry from a hinge angle. A defensive fully occluded case hides the WebView while retaining its nonzero frame.
- A public `UIHingeInteraction`, `updateProperties`, layout and safe-area callbacks refresh that viewport. The existing canvas resize handling preserves the current board and input coordinates. The container follows WebKit's public `underPageBackgroundColor` observation for light/dark surfaces. On older supported iOS versions, Capacitor retains its original root WebView layout.
- The registered `AppReview` bridge uses Apple's StoreKit request in the active WebView window scene. It reports a request, never that a review was shown or submitted; the custom star-gated review prompt was removed.
- The registered UMP 3 `AdsConsent` bridge provides `gatherConsent`, `getStatus`, and `showPrivacyOptions`. It refreshes consent before a required form, returns UMP's actual advertising/privacy flags, and preserves stored flags on network/presentation failures. There is no forced geography, consent reset, or sensitive payload logging. JS ad loading/showing and the conditional privacy setting are gated by `canRequestAds`.
- On iOS 27.1+, the AdMob banner uses the actual bridged WebView pane for safe-area sizing and positioning. A deduplicated app-owned viewport notification coalesces fold/layout changes. Hidden, occluded, undersized or non-consented panes suppress banner visibility; late callbacks are checked against the current banner, request and geometry. The existing root controller still presents full-screen ads. The tracked patch accepts only the pinned AdMob 6.2.0 source or its exact patched form; fifteen installed-native contracts and Debug/Release compilation passed. This is source/compile evidence, not actual Duo ad-placement proof.
- IAP ownership now uses installed CdvPurchase `store.owned`/local receipt semantics for the exact approved/finished non-consumable, persists ownership before finishing, and retains saved Premium while offline/loading. Buy/restore share readiness, prevent duplicate operations and handle returned/rejected errors. A purchase promise or arbitrary/unapproved transaction does not grant Premium.

The pure viewport helper passed **4,971 checks**, including 512 exhaustive 3×3 occlusion unions and 120 fractional portrait/landscape layouts. This tests geometry, not real UIKit fold transitions. Actual Duo simulator results belong in [QA evidence](QA_1.1.0.md); a physical Duo and device touch/haptics remain unverified unless subsequently recorded there.

## Current signed artifact and content proof

| Check | Verified result |
|---|---|
| Archive | `outputs/native/Okchu-1.1.0-148-final.xcarchive` — manual archive passed |
| IPA | `outputs/native/export-1.1.0-148-final/App.ipa` — local export passed |
| IPA size / SHA-256 | `73,616,647` bytes / `77bd10205284260cb9896da679f333142b65ed88523ec5bc3de9c2af365bd90c` |
| SDK / toolchain | `iphoneos27.1`, Xcode build `27A9275` |
| Source-to-public payload | All **113** frozen source/www/copied files match the extracted IPA, including ten new chapter PNGs; **20** native source/icon/patch entries also match |
| Public manifest SHA-256 | `b4abcdd3b5b86e291683cb5f67a904d85744134dfd1b4fe73615835e1ef7e491` |
| Native source/icon manifest SHA-256 | `2351e637e25becab45b790fbce90fb6eda10261b2e3ab5327c590571d800850a` |
| Compiled native content | SceneDelegate, AppReview/AdsConsent, UIHingeInteraction and guarded native BannerExecutor linked; DuoViewport compiled; AppIcon/Assets.car present |
| Signing | Existing valid distribution identity/profile matched; bundle/team/app entitlements verified; `get-task-allow` false; deep/strict signature passed |
| Release settings | App and Capacitor have no Swift DEBUG definition; source minimum iOS 15; native Release ad mode uses production IDs and no developer-console shortcut |
| Remote action | No upload, account certificate/API-key mutation, submission or release |

Frozen source provenance: commit `363903d0e37ec2973199bba9ddfaf00b392f278d`, [draft PR #1](https://github.com/arslanaytac11-alt/okchu/pull/1). Release evidence documents are committed separately from that source snapshot.

Machine-readable proof: `outputs/native/release-verification-final.json`, `source-manifest-final.json`, and `release-production-settings-final.json`. Debug compile proof: `outputs/native/build-final.log`. The final copy is frozen **SW35/main49/Game6/Renderer4/Balance2**, including the timeout-vignette reset, slimmer arrows, versioned expedition icons, native Duo viewport and guarded banner pane. Native service worker use remains disabled.

The matching `Okchu-AppStore-20261007` profile was created in Apple's official portal with the existing distribution certificate and explicit app ID. Its certificate matched the local identity, its entitlements matched the app, and it expires 2 October 2027. No certificate/private key was created or revoked; no private key was exported. Signing configuration and export options remain in private temporary files.

## Simulator evidence and remaining release checks

The final Debug candidate, compiled with iOS 27.1, was installed and launched on the dedicated **iPhone 18 Pro Max / iOS 27.0 StoreCapture simulator**. Before/after-reinstall LocalStorage byte hashes matched before launch; no data was cleared. `outputs/native/native-launch-store-final.json` records the exact source/native manifest hashes and launch. This runtime predates 27.1, so it does not exercise the new reserved-region branch.

A separate **Okchu-Duo-QA / iOS 27.1** simulator is available, but actual fold/rotation/transition tests have **not been observed**. It remains shut down while StoreCapture finishes. The Mac is currently locked and requires the user to unlock it; final native recapture, Duo UI tests and Transporter upload are pending that unlock. The last final install/launch passed, but the corrected vignette has not yet been visually rechecked in the native app. Only our dedicated simulators are operated; user/shared devices remain untouched. Devices are tested sequentially because simultaneous simulators exhausted the 16 GB machine's available memory. A clean own-device shutdown/reboot restored successful installation without restarting shared CoreSimulator services.

Before submitting, record:

- Duo outer/inner displays, partial folds, both rotations and both sides of Split View; camera/hinge avoidance and reachable controls.
- Open/close during a live puzzle: removed arrows, score, lives/time, undo, zoom and selection remain coherent.
- Background/foreground, interruptions, edge gestures, rapid/cancelled touches and two-finger gestures; verify haptics/touch on a physical device.
- Signed-device sandbox purchase, cancellation and restore, including already-owned startup/offline states and upgrade from public 1.0.4.
- ATT/UMP consent/privacy options and actual AdMob placement on device. Simulator Debug uses Google's test ad IDs; Release flag checks do not demonstrate live ad delivery.
- Final localized screenshots/metadata and current privacy/support URLs. Do not claim physical Duo certification or completed purchase/upgrade testing.

The frozen source passed the full **18-suite** aggregate, all fifty puzzle validations and forty-five JavaScript syntax checks. The timeout-vignette regression covers low-time exit, timeout/retry and transitions into Zen/Daily/Moves using the actual renderer setter; native visual confirmation remains pending the unlock.

The IAP regression has **33 installed-plugin mocked-native-I/O cases**, with real receipt/ownership classes and callback registries. The test VM stops its own monitors/intervals in `finally`; an actual subprocess exits 0 under a 20-second timeout (`outputs/qa/iap-test-results.json`). See [QA evidence](QA_1.1.0.md) for the full gameplay, input, shape, motion, difficulty, contrast, consent and browser suites and actual native captures.

## Historical snapshots

Earlier artifacts are retained for comparison and are **not the final candidate**:

- `Okchu-1.1.0-148.xcarchive` / `export-1.1.0-148/App.ipa` / `release-verification.json`: early 27.0 redesign, before later IAP/consent/art/difficulty/icon/Duo changes.
- `Okchu-1.1.0-148-precontrast.xcarchive` and `-precache.xcarchive`: intermediate source snapshots.
- `Okchu-1.1.0-148-preicon.xcarchive` / `export-1.1.0-148-preicon/App.ipa` / `release-verification-preicon.json`: 27.1 source/art/IAP/consent snapshot before the new icon and Duo wrapper.

- `Okchu-1.1.0-148-prearrow.xcarchive` / `export-1.1.0-148-prearrow/App.ipa` / `release-verification-prearrow.json`: new icon and Duo wrapper before thinner arrows and the native banner pane repair.
- `Okchu-1.1.0-148-prevignette.xcarchive` / `export-1.1.0-148-prevignette/App.ipa` / `release-verification-prevignette.json`: thinner arrows and native banner repair before the reproduced timeout-vignette reset.

Earlier screenshots/recordings such as `native-arrow-demo.mp4` and `native-night-status-window.png` document the candidate at their capture time. They do not prove the later artifact's icon, artwork or fold behavior. Latest capture scope is recorded in QA.

## CI and reproducibility

`codemagic.yaml` pins Xcode 27.1 and is a manually started, artifact-only workflow using uploaded existing signing identities. It has no push trigger, certificate creation/revocation, upload, email, TestFlight or publishing step. Set `OKCHU_BUILD_NUMBER` explicitly after checking remote build availability. Local final148 follows the verified latest completed 147 upload; if 148 is later uploaded, a further candidate requires a new number.

`OKCHU_PROVISIONING_PROFILE` applies only to the App Release target. Local export uses manual signing with `destination: export`; automatic provisioning and version/build management are disabled. Missing/expired assets stop the build rather than revoking unrelated certificates.

CocoaPods applies the narrow tracked AdMob 6/UMP 3 Swift-name compatibility patch and the guarded native banner pane patch; unfamiliar versions/source hashes fail explicitly. `prepare-capacitor-cli.cjs` keeps Capacitor 6 template extraction compatible with the patched tar 7 export shape, idempotently. The source retains iOS 15 deployment targets; no build-only minimum override was needed.

The pinned Google Mobile Ads SDK is **11.3.0**, with UMP **3.1.0**. Google lists SDK v11 as deprecated, with sunset planned for Q2 2027 and the exact date unannounced; current deprecated SDKs continue serving ads. Plan the SDK migration before that sunset. No dependency migration or claim of current live ad delivery is part of this update.

## Draft What's New

Publish only behavior verified in the submitted candidate; avoid untested device claims.

**Türkçe**

Okchu’yu ince oklar, sade bir oyun ekranı ve yeni mühür labirentleriyle yeniledik. Görünür simge sırasını takip et; ileri bölümlerde birkaç hamle sonrasını düşünerek doğru yolu seç. Simge sıralı bulmacalarda sınırsız Geri Al ve geliştirilmiş yakınlaştırma kontrolleri seni bekliyor. Yeni uygulama simgesi ve on medeniyete özel görsellerle keşfe devam et.

**English**

Okchu has a clearer game screen, thin arrows and new seal mazes. Follow the visible symbol sequence and plan several moves ahead in later puzzles. Symbol-sequence puzzles include unlimited Undo, with improved zoom controls, a new app icon and artwork across ten civilizations.

## Official references

- [Apple: Prepare and submit your apps for iPhone Duo](https://developer.apple.com/news/?id=kkphp5qo)
- [Apple: Designing for iPhone Duo](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo)
- [Apple: Prepare your app for iPhone Duo](https://developer.apple.com/videos/play/tech-talks/111461/)
- [Apple DTS: reserved regions and layout observation](https://developer.apple.com/forums/thread/847876)
- [Apple: Scene-based UIKit lifecycle](https://developer.apple.com/documentation/uikit/transitioning-to-the-uikit-scene-based-life-cycle)
- [Google: iOS advertising privacy/UMP](https://developers.google.com/admob/ios/privacy)
- [Google: adaptive banners and rotation](https://developers.google.com/admob/ios/banner)
- [Google: mobile ads SDK deprecation](https://developers.google.com/admob/ios/deprecation)
- [Apple: App Store review guidelines 5.6.1](https://developer.apple.com/app-store/review/guidelines/#developer-code-of-conduct)
- [Codemagic: Xcode 27.1 machines](https://docs.codemagic.io/specs-macos/xcode-27-1/)
- [Codemagic: signing with existing identities](https://docs.codemagic.io/yaml-code-signing/signing-ios/)
