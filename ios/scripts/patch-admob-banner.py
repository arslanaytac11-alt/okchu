#!/usr/bin/env python3
"""Keep AdMob 6.2.0 banners inside the original bridged Duo WebView.

The patch is exact-source/version guarded, idempotent, and preserves the SDK's
root presentation controller and recursive banner lookup. No ad IDs, consent
state, testing geography, or account settings are changed.
"""
import hashlib
import json
from pathlib import Path

UPSTREAM_SHA256 = "6e192f290f0d58ff7d0d4be47347865e95ff3a4751b0a663b88ca024334d8035"
PATCHED_SHA256 = "a337c47031b1fa8c7d5f546489911753ac5ff3a318b1033d53b819e2a5118b1e"

HELPERS = """
    // OKCHU_DUO_BANNER_V1: own app event, not a UIKit reserved-region event.
    private var okchuViewportObserver: NSObjectProtocol?
    private var okchuForegroundObserver: NSObjectProtocol?
    private var okchuPendingRefresh: DispatchWorkItem?
    private var okchuRequest: GADRequest?
    private var okchuAdaptiveBanner = false
    private var okchuBannerWanted = false
    private var okchuAwaitingCreative = false

    deinit {
        okchuPendingRefresh?.cancel()
        if let observer = okchuViewportObserver { NotificationCenter.default.removeObserver(observer) }
        if let observer = okchuForegroundObserver { NotificationCenter.default.removeObserver(observer) }
    }

    private func okchuBannerHost(_ controller: UIViewController) -> UIView {
        if #available(iOS 27.1, *), let webView = plugin?.bridge?.webView,
           webView.isDescendant(of: controller.view) {
            return webView
        }
        return controller.view
    }

    private func okchuObserveViewport(_ host: UIView) {
        guard #available(iOS 27.1, *) else { return }
        if let observer = okchuViewportObserver { NotificationCenter.default.removeObserver(observer) }
        if let observer = okchuForegroundObserver { NotificationCenter.default.removeObserver(observer) }
        okchuViewportObserver = NotificationCenter.default.addObserver(
            forName: Notification.Name("OkchuAdViewportDidChange"), object: host, queue: .main
        ) { [weak self] _ in self?.okchuScheduleRefresh() }
        okchuForegroundObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main
        ) { [weak self] _ in self?.okchuScheduleRefresh() }
    }

    private func okchuScheduleRefresh() {
        guard #available(iOS 27.1, *) else { return }
        guard okchuBannerWanted, let banner = bannerView,
              let controller = plugin?.getRootVC() else { return }
        let host = okchuBannerHost(controller)
        let available = host.bounds.inset(by: host.safeAreaInsets)
        // Hide an oversized old creative immediately, before its replacement.
        if host.isHidden || banner.frame.width > available.width + 0.5 {
            banner.isHidden = true
        }
        okchuPendingRefresh?.cancel()
        let refresh = DispatchWorkItem { [weak self] in self?.okchuRefreshBanner() }
        okchuPendingRefresh = refresh
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25, execute: refresh)
    }

    private func okchuRefreshBanner() {
        guard okchuBannerWanted, let banner = bannerView, let request = okchuRequest,
              let controller = plugin?.getRootVC() else { return }
        let host = okchuBannerHost(controller)
        guard !host.isHidden, host.window?.windowScene?.activationState == .foregroundActive,
              ConsentInformation.shared.canRequestAds else {
            banner.isHidden = true
            plugin?.notifyListeners(BannerAdPluginEvents.SizeChanged.rawValue, data: ["width": 0, "height": 0])
            return
        }
        let available = host.bounds.inset(by: host.safeAreaInsets)
        let size = okchuAdaptiveBanner
            ? GADCurrentOrientationAnchoredAdaptiveBannerAdSizeWithWidth(available.width)
            : banner.adSize
        let dimensions = CGSizeFromGADAdSize(size)
        guard IsGADAdSizeValid(size), dimensions.width > 0, dimensions.height > 0,
              dimensions.width <= available.width + 0.5,
              dimensions.height <= available.height + 0.5 else {
            banner.isHidden = true
            plugin?.notifyListeners(BannerAdPluginEvents.SizeChanged.rawValue, data: ["width": 0, "height": 0])
            return
        }
        let changed = !GADAdSizeEqualToSize(banner.adSize, size)
        let wasHidden = banner.isHidden
        banner.adSize = size
        if changed {
            okchuAwaitingCreative = true
            banner.isHidden = true
        } else if !okchuAwaitingCreative {
            banner.isHidden = false
        }
        if changed || wasHidden {
            plugin?.notifyListeners(BannerAdPluginEvents.SizeChanged.rawValue, data: [
                "width": dimensions.width, "height": dimensions.height
            ])
        }
        // Google recommends a new appropriately sized request after rotation.
        // Equal geometry never reloads; fold updates are coalesced above.
        if changed { banner.load(request) }
    }
"""

def patch_source(text, version):
    if version != "6.2.0":
        raise ValueError("Reassess banner viewport patch after upgrading AdMob.")
    digest = hashlib.sha256(text.encode()).hexdigest()
    if PATCHED_SHA256 and digest == PATCHED_SHA256:
        return text
    if digest != UPSTREAM_SHA256:
        raise ValueError("Unknown or partially patched AdMob banner source; no changes made.")
    replacements = {
        "import GoogleMobileAds\n": "import GoogleMobileAds\nimport UserMessagingPlatform\n",
        "    var bannerView: GADBannerView!\n": "    var bannerView: GADBannerView!\n" + HELPERS,
        '            let adSize = call.getString("adSize") ?? "ADAPTIVE_BANNER"\n':
            '            let host = self.okchuBannerHost(rootViewController)\n'
            '            let adSize = call.getString("adSize") ?? "ADAPTIVE_BANNER"\n',
        "rootViewController.view.frame.inset(by: rootViewController.view.safeAreaInsets)":
            "host.bounds.inset(by: host.safeAreaInsets)",
        "return rootViewController.view.frame": "return host.bounds",
        "            self.bannerView = GADBannerView(adSize: bannerSize)\n":
            "            if #available(iOS 27.1, *) {\n"
            "                let available = host.bounds.inset(by: host.safeAreaInsets)\n"
            "                let dimensions = CGSizeFromGADAdSize(bannerSize)\n"
            "                guard !host.isHidden, ConsentInformation.shared.canRequestAds,\n"
            "                      host.window?.windowScene?.activationState == .foregroundActive,\n"
            "                      IsGADAdSizeValid(bannerSize), dimensions.width > 0, dimensions.height > 0,\n"
            "                      dimensions.width <= available.width + 0.5,\n"
            "                      dimensions.height <= available.height + 0.5 else {\n"
            "                    self.okchuBannerWanted = false\n"
            "                    self.bannerView?.isHidden = true\n"
            "                    call.reject(\"Ad viewport unavailable.\")\n"
            "                    return\n"
            "                }\n"
            "            }\n"
            "            self.bannerView = GADBannerView(adSize: bannerSize)\n",
        "            self.bannerView.load(request)\n            self.bannerView.delegate = self\n":
            "            self.okchuRequest = request\n"
            '            self.okchuAdaptiveBanner = !["BANNER", "LARGE_BANNER", "FULL_BANNER", "LEADERBOARD", "MEDIUM_RECTANGLE", "SMART_BANNER"].contains(adSize)\n'
            "            self.okchuBannerWanted = true\n"
            "            self.okchuAwaitingCreative = true\n"
            "            self.okchuObserveViewport(host)\n"
            "            self.bannerView.delegate = self\n"
            "            self.bannerView.load(request)\n",
        "        DispatchQueue.main.async {\n            if let rootViewController":
            "        DispatchQueue.main.async {\n            self.okchuBannerWanted = false\n"
            "            self.okchuPendingRefresh?.cancel()\n            if let rootViewController",
        "                subView.isHidden = false\n":
            "                subView.isHidden = false\n"
            "                self.okchuBannerWanted = true\n"
            "                self.okchuScheduleRefresh()\n",
        "            rootViewController.view.addSubview(bannerView)\n            rootViewController.view.addConstraints(":
            "            let host = self.okchuBannerHost(rootViewController)\n"
            "            host.addSubview(bannerView)\n            host.addConstraints(",
        "toItem: rootViewController.view.safeAreaLayoutGuide": "toItem: host.safeAreaLayoutGuide",
        "toItem: rootViewController.view,": "toItem: host,",
        "    private func removeBannerViewToView() {\n":
            "    private func removeBannerViewToView() {\n"
            "        okchuBannerWanted = false\n"
            "        okchuRequest = nil\n"
            "        okchuAwaitingCreative = false\n"
            "        okchuPendingRefresh?.cancel()\n",
        "                bannerView.delegate = nil\n":
            "                (subView as? GADBannerView)?.delegate = nil\n",
        "    func bannerViewDidReceiveAd(_ bannerView: GADBannerView) {\n":
            "    func bannerViewDidReceiveAd(_ bannerView: GADBannerView) {\n"
            "        guard self.bannerView === bannerView else { return }\n"
            "        if #available(iOS 27.1, *) {\n"
            "            guard okchuBannerWanted, let controller = plugin?.getRootVC() else {\n"
            "                bannerView.isHidden = true\n"
            "                plugin?.notifyListeners(BannerAdPluginEvents.SizeChanged.rawValue, data: [\"width\": 0, \"height\": 0])\n"
            "                return\n"
            "            }\n"
            "            let host = okchuBannerHost(controller)\n"
            "            host.layoutIfNeeded()\n"
            "            let available = host.bounds.inset(by: host.safeAreaInsets)\n"
            "            guard !host.isHidden, ConsentInformation.shared.canRequestAds,\n"
            "                  host.window?.windowScene?.activationState == .foregroundActive,\n"
            "                  bannerView.frame.width > 0, bannerView.frame.height > 0,\n"
            "                  bannerView.frame.width <= available.width + 0.5,\n"
            "                  bannerView.frame.height <= available.height + 0.5 else {\n"
            "                bannerView.isHidden = true\n"
            "                plugin?.notifyListeners(BannerAdPluginEvents.SizeChanged.rawValue, data: [\"width\": 0, \"height\": 0])\n"
            "                okchuScheduleRefresh()\n"
            "                return\n"
            "            }\n"
            "            okchuAwaitingCreative = false\n"
            "            bannerView.isHidden = false\n"
            "        }\n",
        "                    didFailToReceiveAdWithError error: Error) {\n":
            "                    didFailToReceiveAdWithError error: Error) {\n"
            "        guard self.bannerView === bannerView else { return }\n",
    }
    for old, new in replacements.items():
        expected = 1
        if text.count(old) != expected:
            raise ValueError("Unexpected banner source shape; no changes made.")
        text = text.replace(old, new)
    return text

def main():
    root = Path(__file__).resolve().parents[2]
    plugin = root / "node_modules/@capacitor-community/admob"
    version = json.loads((plugin / "package.json").read_text())["version"]
    source = plugin / "ios/Sources/AdMobPlugin/Banner/BannerExecutor.swift"
    original = source.read_text()
    result = patch_source(original, version)
    if result != original:
        source.write_text(result)
    print("AdMob 6.2.0 safe-viewport banner patch verified/applied.")

if __name__ == "__main__":
    main()
