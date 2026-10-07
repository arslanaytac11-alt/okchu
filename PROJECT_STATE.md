# Okchu — project state

## Temporary browser inspection

The local preview is restored at `http://127.0.0.1:5188/?kontrol=1`. `npm run preview:start` starts it independently of the invoking terminal; `npm run preview` runs it in the foreground. Only public game files are served, on IPv4 loopback, with no-store headers.

The explicit local browser control mode opens all ten chapters and fifty puzzles, including their final puzzles. It starts in untimed Zen; review gameplay/mode changes use memory seeded from the actual save and never overwrite real progression, scores, resources or Premium. Native bridges, non-HTTP origins and remote hosts cannot enable it. Ordinary play retains its star gates. Main 50 / Game 7 / SW 36 passed all twenty suites, fifty level validations and forty-six JS syntax checks.

The first-offline boot graph now precaches its four previously missing imports and the review helper. Cached exact module URLs take precedence over unversioned fallback entries. These browser changes are **not in the signed SW35/main49 IPA documented below**. Rebuild and verify the chosen final source before uploading; no upload has occurred.

Updated 7 October 2026. No build has been uploaded, submitted or released during this redesign work.

| Field | Current state |
|---|---|
| Existing app | [Okchu: Arrow Puzzle](https://apps.apple.com/tr/app/okchu-arrow-puzzle/id6762461650), public 1.0.4 |
| App/bundle | `6762461650` / `com.arslanaytac.okchu` |
| Existing Premium | `com.arslanaytac.okchu.premium`, same non-consumable |
| Final local candidate | `1.1.0 (148)`; latest completed account upload was 1.0.4 (147) |
| Minimum OS | iOS 15.0 in source App/Pod configurations |
| Local/current CI Xcode | 27.1 / local 27A9275; per-command DEVELOPER_DIR pinned |
| Native app icon | New opaque1024 gold bent arrow/lagoon stone, compiled in final IPA |
| Native Duo layout | Public active division/occlusion reserved regions + hinge updates; same WKWebView wrapped in a safe pane on 27.1+; helper 4,971 geometry checks and native compile passed |
| Final signed IPA | `outputs/native/export-1.1.0-148-final/App.ipa`; exact113 source/public assets, native source/icon manifest, profile/entitlements, production flags and deep signature verified |
| Final native launch | Own StoreCapture iPhone 18 Pro Max/iOS 27.0, builtSDK 27.1: install/launch passed; LocalStorage byte hashes preserved on reinstall before launch |
| Duo runtime | Own Okchu-Duo-QA/iOS 27.1 available but shut down; fold/rotation/transition **not observed**, pending Mac unlock |
| IAP repair | Included in final IPA; 33 installed-plugin mock cases pass/exit0. Real checkout/restore/public 1.0.4 upgrade pending |
| Native banner pane | Patched on 27.1+ to follow actual bridged WebView, permission and visibility; 15 source contracts and compile passed, actual Duo ad placement pending |
| Advertising consent | Registered UMP 3 bridge and JS permission gating/privacy setting included; real-device form/delivery checks pending |
| Signing | Existing identity and matching app-specific profile; no certificate/key creation/revocation |
| CI | Manual artifact-only build; no automatic account mutations, upload or publishing |
| Physical Duo/device QA | Pending unless subsequently documented in QA; no physical certification claim |

See [release verification](docs/RELEASE_1.1.0.md), [QA evidence](docs/QA_1.1.0.md) and [submission steps](docs/APP_STORE_SUBMISSION.md). `outputs/native/release-verification-final.json` identifies the current IPA and source/native hashes. Older base/precontrast/precache/preicon/prearrow/prevignette artifacts are historical and must not be mistaken for the current final package.

The same 50 level IDs/names and progress keys are retained; baseline comparison verified 47 new silhouettes. Preserve the bundle and IAP product, and verify upgrade/ownership on a signed device. A later build after uploading 148 requires a newly checked build number.

CSS owns the four safe-area insets with native contentInset never. On27.1+, the native container avoids the system's active hinge/camera reserved regions while retaining Capacitor's bridged WebView and native plugin references. Simulator Debug uses test ads; final native Release uses production defaults. Neither source tests nor signature verification replace signed-device purchase/privacy testing.

Frozen source: commit `363903d0e37ec2973199bba9ddfaf00b392f278d`, [draft PR #1](https://github.com/arslanaytac11-alt/okchu/pull/1). Current final IPA SHA-256: `77bd10205284260cb9896da679f333142b65ed88523ec5bc3de9c2af365bd90c` (73,616,647 bytes). Public113/native20 manifest hashes are recorded in the machine-readable proof. Source SW35/main49/Game6 passed eighteen suites, fifty puzzle validations and forty-five syntax checks.

The Mac is locked and requires manual user unlock. No unlock retry, shared-service restart, Duo boot or upload was attempted while locked. Final StoreCapture launch passed; the native vignette recapture, Duo runtime tests and authenticated Transporter upload are still pending. Existing App Store automatic-release preference remains untouched.
