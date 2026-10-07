#!/usr/bin/env python3
"""Static contracts for the installed native banner patch; not runtime ad QA."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
patch = root / "ios/scripts/patch-admob-banner.py"
namespace = {"__file__": str(patch), "__name__": "banner_contract"}
exec(compile(patch.read_text(), str(patch), "exec"), namespace)
plugin = root / "node_modules/@capacitor-community/admob"
version = json.loads((plugin / "package.json").read_text())["version"]
source = (plugin / "ios/Sources/AdMobPlugin/Banner/BannerExecutor.swift").read_text()
controller = (root / "ios/App/App/OkchuViewController.swift").read_text()
checks = 0

def check(condition, label):
    global checks
    assert condition, label
    checks += 1

check(version == "6.2.0", "exact installed plugin version")
check("import UserMessagingPlatform" in source and
      "import UserMessagingPlatform" in
      (plugin / "ios/Sources/AdMobPlugin/Consent/ConsentExecutor.swift").read_text(),
      "actual installed UMP module matches the existing SDK consumer")
check(hashlib.sha256(source.encode()).hexdigest() == namespace["PATCHED_SHA256"],
      "exact installed patched Swift")
check(namespace["patch_source"](source, version) == source, "idempotent application")
for mutated, release in [(source + "\n", version), (source, "6.3.0"),
                         (source[:len(source) // 2], version)]:
    try:
        namespace["patch_source"](mutated, release)
    except ValueError:
        checks += 1
    else:
        raise AssertionError("unknown/partial source or upgraded plugin was accepted")

check("host.bounds.inset(by: host.safeAreaInsets)" in source and
      "host.addSubview(bannerView)" in source and "toItem: host.safeAreaLayoutGuide" in source
      and "toItem: host," in source and "rootViewController.view.addSubview" not in source,
      "size and anchors use one actual viewport")
check("self.bannerView.rootViewController = plugin?.getRootVC()" in source and
      source.count("rootViewController.view.viewWithTag(2743243288699)") == 3,
      "presentation controller and recursive lookup retained")
check("if changed { banner.load(request) }" in source and
      "GADAdSizeEqualToSize" in source and "okchuPendingRefresh?.cancel()" in source and
      "DispatchQueue.main.asyncAfter(deadline: .now() + 0.25" in source,
      "changed-size-only reload and fold coalescing")
check(source.count("ConsentInformation.shared.canRequestAds") == 3 and
      source.count("activationState == .foregroundActive") == 3 and
      "guard okchuBannerWanted" in source,
      "visible ownership, actual permission and foreground refresh gates")
check(source.count("guard self.bannerView === bannerView else { return }") == 2 and
      "bannerView.frame.width <= available.width + 0.5" in source and
      "bannerView.frame.height <= available.height + 0.5" in source and
      '(subView as? GADBannerView)?.delegate = nil' in source,
      "late success/failure ignores old banners and rejects oversized callbacks")
check("okchuAwaitingCreative = true" in source and
      "else if !okchuAwaitingCreative" in source and
      "okchuAwaitingCreative = false\n            bannerView.isHidden = false" in source,
      "replacement stays hidden until a fitting current creative is received")
check('call.reject("Ad viewport unavailable.")' in source and
      "dimensions.width <= available.width + 0.5" in source and
      "dimensions.height <= available.height + 0.5" in source,
      "initial request requires a positive fitting safe viewport")
check('Notification.Name("OkchuAdViewportDidChange")' in controller and
      'object: webView' in controller and "AdViewportSnapshot" in controller and
      "safeAreaInsets: webView.safeAreaInsets" in controller and
      "isHidden: webView.isHidden" in controller and
      'Notification.Name("OkchuAdViewportDidChange"), object: host' in source,
      "deduplicated app geometry event uses original bridged WebView")
print(f"PASS: {checks} installed-native banner source contracts; runtime ads/folds remain separate QA.")
