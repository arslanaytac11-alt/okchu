# Okchu update submission

> Current source is main53/Game10/SW39 with 45 seal mazes and visible symbol-order gameplay. Use the new verified `export-1.1.0-148-seals/App.ipa` (SHA-256 `8ea102c571df38d590553851495a99df2f5f1ec2ed27f698475d5feac4406963`); current116 public/20 native hashes and distribution signature passed in `release-verification-seals.json`. Device/runtime and submission checks remain below. The older `-final` and provisional `-rune` IPAs below are historical. No upload has occurred; update App Store Connect's earlier metadata from `store-metadata-1.1.0.json` and the tracked review notes before submission. Native/remote play cannot activate the local all-level inspection flag.

The existing application is App Store ID `6762461650`, bundle `com.arslanaytac.okchu`, with the same premium product `com.arslanaytac.okchu.premium`. The new candidate requires **iOS 15.0+**; do not reuse metadata claiming iOS 13 support.

The earlier local signed candidate was **1.1.0 (148)** at `outputs/native/export-1.1.0-148-final/App.ipa`, built with Xcode 27.1/27A9275. It includes the new icon, ten chapter PNGs, revised puzzle shapes/difficulty, slimmer arrows, timeout-vignette reset, IAP/consent repairs, native Duo reserved-region layout and guarded native banner pane. Its extracted 113-file payload, native manifest, existing profile/certificate, entitlements, production settings and deep signature passed. Proof is `outputs/native/release-verification-final.json`. Earlier unsuffixed/preicon/prearrow/prevignette artifacts are historical. **No upload/submission/release has been performed.**

Frozen source: `363903d0e37ec2973199bba9ddfaf00b392f278d`, [draft PR #1](https://github.com/arslanaytac11-alt/okchu/pull/1). Final IPA SHA-256: `77bd10205284260cb9896da679f333142b65ed88523ec5bc3de9c2af365bd90c` (73,616,647 bytes), source SW35/main49/Game6.

The final Debug candidate installed/launched on our iPhone 18 Pro Max/iOS 27.0 simulator and preserved LocalStorage bytes. Duo fold/rotation/transition tests, native post-vignette recapture and upload remain pending **manual Mac unlock**. Transporter was already authenticated and its Add IPA action enabled before the lock; no file was added or uploaded. The account's existing **automatic release** preference was not changed.

See [release readiness](RELEASE_1.1.0.md) for artifact hashes/draft notes and [QA scope](QA_1.1.0.md) for actual observed tests. Physical-device purchase/restore and a public 1.0.4 upgrade remain pending. Candidate simulator progress preservation is a narrower check.

## Finish device verification

1. Complete Duo27.1 simulator outer/inner display, partial-fold, rotation, Split View and live-puzzle transition checks. Inspect hinge/camera avoidance and touch reachability; record physical Duo/touch/haptics separately when available.
2. Test the signed candidate's sandbox purchase, cancellation, already-owned startup and restore; upgrade the public 1.0.4 installation without clearing progress/data.
3. Verify ATT/UMP/privacy options and actual advertising placement on device. Debug simulator ads use Google's test units; do not infer live Release delivery from them.
4. Complete final localized screenshots/metadata, links and privacy answers, tied to the final source/artifact. Do not claim physical certification or completed purchase/upgrade checks without evidence.

## Reproduce or revise the candidate

1. Run `npm ci`, `npm test`, and `npm run cap:sync`; the tracked CLI/AdMob compatibility patches are applied locally and in CI.
2. Run `python3 ios/scripts/verify-release.py`. Compile with Xcode 27.1 and source deployment15.0; keep the bundle/product IDs.
3. Check App Store Connect build availability before choosing a number. Current 148 follows latest completed 147; if 148 is uploaded, a revised candidate needs a new number.
4. Build/export with existing signing assets. `OKCHU_PROVISIONING_PROFILE` belongs to the App Release target only. Do not use automatic provisioning or revoke certificates. The manual Codemagic workflow produces artifacts without uploading/publishing.
5. Verify the actual exported IPA and record its SHA/source manifest before handing it off.

## Submit the verified update

1. Upload the verified final signed candidate through Xcode Organizer or Transporter, then select the processed build for a new **1.1.0** version.
2. Replace screenshots with final captures using actual App Store Connect slots and [Apple's current screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/). Verify Duo-specific requirements in the account rather than relying on older fixed dimensions.
3. Add verified localized What's New/review notes. State Duo support only to the extent actually tested; include no physical-device certification claim.
4. Confirm App Privacy reflects actual AdMob/UMP/StoreKit behavior. Existing metadata discloses identifiers, advertising usage data and diagnostics; local gameplay saves alone do not mean no data is collected.
5. Recheck production support/privacy links and existing IAP listing. No new account or purchase product is needed.
6. Before App Review submission, verify the release preference in App Store Connect. The existing automatic-release setting is untouched; selecting **Manually release this version** would be a deliberate change, not an action already completed. Submit only after the final device/metadata checks, and follow the selected release setting after approval.

## Signing recovery

Use the existing distribution certificate with its private key and the matching app-specific profile. The installed `Okchu-AppStore-20261007` profile was matched to that identity without creating/revoking keys or certificates. Missing/expired assets stop the build; resolve only the affected identity/profile deliberately with the account owner. Do not revoke unrelated certificates or clear tester data as a workaround.
