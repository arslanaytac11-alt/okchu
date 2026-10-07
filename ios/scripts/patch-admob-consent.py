#!/usr/bin/env python3
"""Adapt the installed AdMob 6 consent source to UMP 3's Swift names.

Run from Podfile's post_install, after CocoaPods determines the UMP version.
This retains the plugin's consent behavior and fails on unknown source shapes.
"""

import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[2]
version = sys.argv[1] if len(sys.argv) == 2 else ""
if not version.startswith("3."):
    raise SystemExit(f"Unsupported UMP version for this patch: {version!r}")

plugin = root / "node_modules/@capacitor-community/admob"
package = json.loads((plugin / "package.json").read_text())
if not package["version"].startswith("6."):
    raise SystemExit("Reassess the UMP compatibility patch after upgrading AdMob.")

source = plugin / "ios/Sources/AdMobPlugin/Consent/ConsentExecutor.swift"
text = source.read_text()
renames = {
    "UMPRequestParameters": "RequestParameters",
    "UMPDebugSettings": "DebugSettings",
    "UMPDebugGeography": "DebugGeography",
    "UMPConsentInformation": "ConsentInformation",
    "UMPFormStatus": "FormStatus",
    "UMPConsentForm": "ConsentForm",
    "UMPConsentStatus": "ConsentStatus",
    ".sharedInstance": ".shared",
    ".tagForUnderAgeOfConsent": ".isTaggedForUnderAgeOfConsent",
    ".load(completionHandler:": ".load(with:",
}
if not any(old in text for old in renames):
    if all(new in text for new in renames.values()):
        print(f"AdMob consent source already supports UMP {version}.")
        raise SystemExit(0)
    raise SystemExit("Unknown AdMob consent source; no changes made.")

if not all(old in text for old in renames):
    raise SystemExit("AdMob consent source is partially patched; reinstall npm dependencies.")

for old, new in renames.items():
    text = text.replace(old, new)
source.write_text(text)
print(f"Applied AdMob 6 consent Swift-name compatibility for UMP {version}.")
