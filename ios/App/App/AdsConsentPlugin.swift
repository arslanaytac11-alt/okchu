import Capacitor
import UIKit
import UserMessagingPlatform

@objc(AdsConsentPlugin)
public final class AdsConsentPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AdsConsentPlugin"
    public let jsName = "AdsConsent"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "gatherConsent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showPrivacyOptions", returnType: CAPPluginReturnPromise)
    ]

    private var gatheringCalls: [CAPPluginCall] = []
    private var privacyFormOpen = false

    @objc public func getStatus(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(self.status())
        }
    }

    @objc public func gatherConsent(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard !self.privacyFormOpen else {
                call.resolve(self.status(error: "Privacy choices are already open."))
                return
            }
            // Several callers share one update/form, so a rapid replay of an
            // ad request cannot present multiple native privacy dialogs.
            self.gatheringCalls.append(call)
            guard self.gatheringCalls.count == 1 else { return }
            guard self.activeViewController() != nil else {
                self.completeGathering(error: "Privacy choices require an active application window.")
                return
            }

            let parameters = RequestParameters()
            ConsentInformation.shared.requestConsentInfoUpdate(with: parameters) { error in
                DispatchQueue.main.async {
                    guard error == nil else {
                        // UMP can still permit ads from a valid prior session.
                        // Return its actual state; never replace it with a
                        // fabricated permission or expose native error data.
                        self.completeGathering(error: "Privacy information could not be updated.")
                        return
                    }
                    guard let controller = self.activeViewController() else {
                        self.completeGathering(error: "Privacy choices require an active application window.")
                        return
                    }
                    ConsentForm.loadAndPresentIfRequired(from: controller) { formError in
                        DispatchQueue.main.async {
                            self.completeGathering(error: formError == nil ? nil : "Privacy choices could not be displayed.")
                        }
                    }
                }
            }
        }
    }

    @objc public func showPrivacyOptions(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.gatheringCalls.isEmpty, !self.privacyFormOpen else {
                call.resolve(self.status(error: "Privacy choices are already being updated."))
                return
            }
            guard ConsentInformation.shared.privacyOptionsRequirementStatus == .required else {
                call.resolve(self.status())
                return
            }
            guard let controller = self.activeViewController() else {
                call.resolve(self.status(error: "Privacy choices require an active application window."))
                return
            }
            self.privacyFormOpen = true
            ConsentForm.presentPrivacyOptionsForm(from: controller) { error in
                DispatchQueue.main.async {
                    self.privacyFormOpen = false
                    call.resolve(self.status(error: error == nil ? nil : "Privacy choices could not be displayed."))
                }
            }
        }
    }

    private func activeViewController() -> UIViewController? {
        guard let controller = bridge?.viewController,
              controller.view.window?.windowScene?.activationState == .foregroundActive else { return nil }
        return controller
    }

    private func status(error: String? = nil) -> [String: Any] {
        var result: [String: Any] = [
            "canRequestAds": ConsentInformation.shared.canRequestAds,
            "privacyOptionsRequired": ConsentInformation.shared.privacyOptionsRequirementStatus == .required
        ]
        if let error { result["error"] = error }
        return result
    }

    private func completeGathering(error: String? = nil) {
        let result = status(error: error)
        let calls = gatheringCalls
        gatheringCalls.removeAll()
        for call in calls { call.resolve(result) }
    }
}
