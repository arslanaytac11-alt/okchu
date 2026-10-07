import Capacitor
import StoreKit
import UIKit

@objc(AppReviewPlugin)
public final class AppReviewPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppReviewPlugin"
    public let jsName = "AppReview"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise)
    ]

    @objc public func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            // Use this WebView's foreground scene, which remains correct when
            // the device has multiple displays or the app shares the screen.
            guard let scene = self?.bridge?.viewController?.view.window?.windowScene,
                  scene.activationState == .foregroundActive else {
                call.reject("A review request requires an active application window.")
                return
            }
            if #available(iOS 16.0, *) {
                AppStore.requestReview(in: scene)
            } else {
                SKStoreReviewController.requestReview(in: scene)
            }
            // StoreKit decides whether to display a prompt; this confirms only
            // that the request was sent, not that a rating was shown or submitted.
            call.resolve(["requested": true])
        }
    }
}
