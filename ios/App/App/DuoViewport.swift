import Foundation
import CoreGraphics

/// Geometry for keeping a coherent viewport outside system-reserved rectangles.
/// Inputs share one coordinate space; reserved frames already include margins.
enum DuoViewport {
    /// Returns the largest unobstructed axis-aligned rectangle. A previous center
    /// breaks equal-area ties without overriding the largest-area requirement.
    /// Nil means there is no positive-area viewport; callers must not show
    /// interactive content in the excluded region or assign a zero-sized frame.
    static func largestSafeRect(
        in proposedBounds: CGRect,
        avoiding reservedFrames: [CGRect],
        preferredCenter: CGPoint? = nil
    ) -> CGRect? {
        guard let bounds = finiteRect(proposedBounds) else { return nil }
        let obstacles = reservedFrames.compactMap { frame -> CGRect? in
            guard let rect = finiteRect(frame) else { return nil }
            return finiteRect(rect.intersection(bounds))
        }
        guard !obstacles.isEmpty else { return bounds }

        // An optimal rectangle's top/bottom lie on the bounds or obstacle edges.
        // For every such horizontal band, merge the obstacles' X intervals and
        // consider the remaining gaps. This also handles overlapping regions.
        let edges = Array(Set([bounds.minY, bounds.maxY] + obstacles.flatMap {
            [$0.minY, $0.maxY]
        })).sorted()
        var best: CGRect?
        let preference = preferredCenter.flatMap {
            $0.x.isFinite && $0.y.isFinite ? $0 : nil
        }

        func consider(_ candidate: CGRect) {
            guard candidate.width > 0, candidate.height > 0 else { return }
            guard let previous = best else { best = candidate; return }
            let area = candidate.width * candidate.height
            let previousArea = previous.width * previous.height
            if area > previousArea { best = candidate; return }
            guard area == previousArea else { return }
            if let center = preference {
                let distance = hypot(candidate.midX - center.x, candidate.midY - center.y)
                let previousDistance = hypot(previous.midX - center.x, previous.midY - center.y)
                if distance < previousDistance { best = candidate; return }
                guard distance == previousDistance else { return }
            }
            // Stable final tie: top pane in tabletop, trailing pane in book pose.
            if candidate.minY < previous.minY ||
                (candidate.minY == previous.minY && candidate.minX > previous.minX) {
                best = candidate
            }
        }

        for lower in 0..<(edges.count - 1) {
            for upper in (lower + 1)..<edges.count {
                let top = edges[lower], bottom = edges[upper]
                let intervals = obstacles.filter {
                    $0.minY < bottom && $0.maxY > top
                }.sorted {
                    $0.minX == $1.minX ? $0.maxX < $1.maxX : $0.minX < $1.minX
                }
                var left = bounds.minX
                for interval in intervals {
                    if interval.minX > left {
                        consider(CGRect(x: left, y: top, width: interval.minX - left, height: bottom - top))
                    }
                    left = max(left, interval.maxX)
                }
                if left < bounds.maxX {
                    consider(CGRect(x: left, y: top, width: bounds.maxX - left, height: bottom - top))
                }
            }
        }
        return best
    }

    private static func finiteRect(_ rect: CGRect) -> CGRect? {
        guard !rect.isNull, !rect.isInfinite,
              rect.origin.x.isFinite, rect.origin.y.isFinite,
              rect.size.width.isFinite, rect.size.height.isFinite else { return nil }
        let standardized = rect.standardized
        guard standardized.width > 0, standardized.height > 0,
              standardized.minX.isFinite, standardized.maxX.isFinite,
              standardized.minY.isFinite, standardized.maxY.isFinite else { return nil }
        return standardized
    }
}
