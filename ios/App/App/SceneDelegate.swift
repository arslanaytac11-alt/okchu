import UIKit
import Capacitor

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        // UIKit loads Main.storyboard and associates its window with this scene.
        guard scene is UIWindowScene else { return }
        forward(urlContexts: connectionOptions.urlContexts)
        for userActivity in connectionOptions.userActivities {
            forward(userActivity: userActivity)
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        forward(urlContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        forward(userActivity: userActivity)
    }

    private func forward(urlContexts: Set<UIOpenURLContext>) {
        for context in urlContexts {
            var options: [UIApplication.OpenURLOptionsKey: Any] = [
                .openInPlace: context.options.openInPlace
            ]
            if let sourceApplication = context.options.sourceApplication {
                options[.sourceApplication] = sourceApplication
            }
            if let annotation = context.options.annotation {
                options[.annotation] = annotation
            }
            _ = ApplicationDelegateProxy.shared.application(
                UIApplication.shared, open: context.url, options: options)
        }
    }

    private func forward(userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(
            UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}
