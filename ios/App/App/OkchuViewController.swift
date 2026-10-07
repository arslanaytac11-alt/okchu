import Capacitor
import UIKit
import WebKit

@objc(OkchuViewController)
final class OkchuViewController: CAPBridgeViewController {
    private var viewportContainer: UIView?
    private var pageBackgroundObservation: NSKeyValueObservation?
    private var applyingViewport = false
    private struct AdViewportSnapshot: Equatable {
        let frame: CGRect
        let safeAreaInsets: UIEdgeInsets
        let isHidden: Bool
    }
    private var lastAdViewportSnapshot: AdViewportSnapshot?

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppReviewPlugin())
        bridge?.registerPluginInstance(AdsConsentPlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        guard #available(iOS 27.1, *), let webView else { return }

        // Capacitor's final loadView uses the WKWebView as its root view. Keep
        // that same bridged instance, but give it a full-window parent so its
        // viewport can occupy a safe pane without changing the window bounds.
        let container = UIView(frame: webView.frame)
        viewportContainer = container
        webView.removeFromSuperview()
        view = container
        webView.autoresizingMask = []
        webView.translatesAutoresizingMaskIntoConstraints = true
        container.addSubview(webView)

        // This public, KVO-compliant WebKit property derives its default from
        // the HTML/body background, including the player's in-game dark theme.
        pageBackgroundObservation = webView.observe(\.underPageBackgroundColor, options: [.initial, .new]) {
            [weak container] webView, _ in
            let color = webView.underPageBackgroundColor ?? webView.backgroundColor
            if Thread.isMainThread {
                container?.backgroundColor = color
            } else {
                DispatchQueue.main.async { [weak container] in container?.backgroundColor = color }
            }
        }

        container.addInteraction(UIHingeInteraction { [weak self] _, _ in
            // Geometry comes from ReservedRegion, never from an angle heuristic.
            self?.setNeedsUpdateProperties()
            self?.view.setNeedsLayout()
        })
        applyDuoViewport()
    }

    @available(iOS 26.0, *)
    override func updateProperties() {
        super.updateProperties()
        // Reading the regions here participates in UIKit observation tracking.
        applyDuoViewport()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        applyDuoViewport()
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        applyDuoViewport()
    }

    private func applyDuoViewport() {
        guard #available(iOS 27.1, *), !applyingViewport,
              let container = viewportContainer, let webView,
              webView.superview === container,
              container.bounds.width > 0, container.bounds.height > 0 else { return }
        applyingViewport = true
        defer { applyingViewport = false }

        let reserved = [UIView.ReservedRegion.Kind.division, .occlusion].flatMap {
            container.reservedRegions(kind: $0, options: .includeInactive)
        }.filter(\.isActive).map(\.frame)
        let center = webView.isHidden ? nil : CGPoint(x: webView.frame.midX, y: webView.frame.midY)
        guard let frame = DuoViewport.largestSafeRect(in: container.bounds, avoiding: reserved, preferredCenter: center) else {
            // Defensive full-occlusion case: retain a nonzero frame but do not
            // expose controls in an area the system says is entirely reserved.
            webView.isHidden = true
            publishAdViewportIfChanged(webView)
            return
        }
        webView.isHidden = false
        if webView.frame != frame {
            UIView.performWithoutAnimation { webView.frame = frame }
        }
        publishAdViewportIfChanged(webView)
        // The WKWebView's resulting viewport resize naturally updates CSS and
        // the canvas ResizeObserver. No level reload or touch-coordinate offset.
    }

    private func publishAdViewportIfChanged(_ webView: WKWebView) {
        let snapshot = AdViewportSnapshot(frame: webView.frame,
                                          safeAreaInsets: webView.safeAreaInsets,
                                          isHidden: webView.isHidden)
        guard snapshot != lastAdViewportSnapshot else { return }
        lastAdViewportSnapshot = snapshot
        // Our app event lets native banners follow the same coherent viewport.
        // It is not a UIKit reserved-region notification. Consumers receive the
        // original bridged WebView and can read its current metrics directly.
        NotificationCenter.default.post(name: Notification.Name("OkchuAdViewportDidChange"), object: webView)
    }
}
