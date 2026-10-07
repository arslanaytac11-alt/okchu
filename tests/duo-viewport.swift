import Foundation
import CoreGraphics

@main
enum DuoViewportTests {
    static var checks = 0
    static var exhaustivePatterns = 0
    static var fractionalLayouts = 0

    static func require(_ condition: @autoclosure () -> Bool, _ message: String) {
        checks += 1
        precondition(condition(), message)
    }

    static func intersects(_ a: CGRect, _ b: CGRect) -> Bool {
        a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY
    }

    static func checkSafe(_ rect: CGRect?, bounds: CGRect, obstacles: [CGRect]) {
        guard let rect else { return }
        require(rect.width > 0 && rect.height > 0, "Never return a zero viewport")
        require(rect.minX >= bounds.minX && rect.maxX <= bounds.maxX &&
                rect.minY >= bounds.minY && rect.maxY <= bounds.maxY, "Viewport is inside bounds")
        for obstacle in obstacles where obstacle.width > 0 && obstacle.height > 0 {
            require(!intersects(rect, obstacle), "Viewport intersects an active reserved region")
        }
    }

    // Independent rectangle oracle, enumerating both X and Y edge pairs. Unlike
    // production it never merges intervals or derives one axis from the other.
    static func oracleArea(bounds: CGRect, obstacles: [CGRect]) -> CGFloat {
        let clipped = obstacles.map { $0.intersection(bounds) }.filter { !$0.isNull && !$0.isEmpty }
        let xs = Array(Set([bounds.minX, bounds.maxX] + clipped.flatMap { [$0.minX, $0.maxX] })).sorted()
        let ys = Array(Set([bounds.minY, bounds.maxY] + clipped.flatMap { [$0.minY, $0.maxY] })).sorted()
        var area: CGFloat = 0
        for a in 0..<(xs.count - 1) { for b in (a + 1)..<xs.count {
            for c in 0..<(ys.count - 1) { for d in (c + 1)..<ys.count {
                let candidate = CGRect(x: xs[a], y: ys[c], width: xs[b] - xs[a], height: ys[d] - ys[c])
                if !clipped.contains(where: { intersects(candidate, $0) }) {
                    area = max(area, candidate.width * candidate.height)
                }
            }}
        }}
        return area
    }

    static func main() throws {
        let bounds = CGRect(x: 0, y: 0, width: 900, height: 600)
        require(DuoViewport.largestSafeRect(in: bounds, avoiding: []) == bounds, "No active regions uses full bounds")
        let vertical = CGRect(x: 440, y: -20, width: 20, height: 650)
        let right = CGRect(x: 460, y: 0, width: 440, height: 600)
        require(DuoViewport.largestSafeRect(in: bounds, avoiding: [vertical]) == right, "Vertical hinge selects trailing equal pane")
        require(DuoViewport.largestSafeRect(in: bounds, avoiding: [vertical], preferredCenter: CGPoint(x: 220, y: 300)) ==
                CGRect(x: 0, y: 0, width: 440, height: 600), "Previous pane stabilizes equal-area choices")
        let horizontal = CGRect(x: -10, y: 290, width: 920, height: 20)
        require(DuoViewport.largestSafeRect(in: bounds, avoiding: [horizontal]) ==
                CGRect(x: 0, y: 0, width: 900, height: 290), "Horizontal hinge selects top equal pane")
        let camera = CGRect(x: 840, y: 0, width: 60, height: 50)
        require(DuoViewport.largestSafeRect(in: bounds, avoiding: [camera]) ==
                CGRect(x: 0, y: 0, width: 840, height: 600), "Corner camera chooses maximum area")
        let multiple = [vertical, camera, CGRect(x: 0, y: 500, width: 300, height: 100)]
        let multipleRect = DuoViewport.largestSafeRect(in: bounds, avoiding: multiple)
        checkSafe(multipleRect, bounds: bounds, obstacles: multiple)
        require(multipleRect!.width * multipleRect!.height == oracleArea(bounds: bounds, obstacles: multiple), "Multiple exclusions choose globally largest rectangle")

        let outside = [CGRect(x: -90, y: -30, width: 20, height: 20), CGRect(x: 900, y: 0, width: 20, height: 20)]
        require(DuoViewport.largestSafeRect(in: bounds, avoiding: outside) == bounds, "Outside/edge-touching regions are harmless")
        let zero = [CGRect(x: 450, y: 0, width: 0, height: 600), CGRect(x: 0, y: 300, width: 900, height: 0)]
        require(DuoViewport.largestSafeRect(in: bounds, avoiding: zero) == bounds, "Inactive zero-width fold geometry is ignored")
        let partial = CGRect(x: -20, y: -20, width: 100, height: 100)
        let partialRect = DuoViewport.largestSafeRect(in: bounds, avoiding: [partial])
        checkSafe(partialRect, bounds: bounds, obstacles: [partial])
        require(partialRect!.width * partialRect!.height == oracleArea(bounds: bounds, obstacles: [partial]), "Negative origins clip to bounds")
        require(DuoViewport.largestSafeRect(in: bounds, avoiding: [CGRect(x: 80, y: 80, width: -100, height: -100)]) == partialRect,
                "Negative sizes standardize consistently")
        require(DuoViewport.largestSafeRect(in: bounds, avoiding: [bounds]) == nil, "Full occlusion returns nil, never zero CGRect")
        require(DuoViewport.largestSafeRect(in: bounds, avoiding: [CGRect(x: 0, y: 0, width: 450, height: 600),
                                                                  CGRect(x: 450, y: 0, width: 450, height: 600)]) == nil,
                "Union of exclusions can fully occlude")
        require(DuoViewport.largestSafeRect(in: .zero, avoiding: []) == nil, "Zero bounds are not a viewport")
        require(DuoViewport.largestSafeRect(in: .null, avoiding: []) == nil, "Null bounds are rejected")
        require(DuoViewport.largestSafeRect(in: .infinite, avoiding: []) == nil, "Infinite bounds are rejected")
        require(DuoViewport.largestSafeRect(in: bounds, avoiding: [CGRect(x: CGFloat.nan, y: 0, width: 10, height: 10)]) == bounds,
                "Invalid reserved frame cannot poison layout")
        require(DuoViewport.largestSafeRect(in: bounds, avoiding: [vertical, vertical]) == right, "Duplicate regions do not alter the choice")
        require(DuoViewport.largestSafeRect(in: bounds, avoiding: []) == bounds, "Unfold/inactive snapshot restores full viewport")
        let translated = CGRect(x: -100, y: 35, width: 400, height: 800)
        let translatedHinge = CGRect(x: 90, y: 35, width: 20, height: 800)
        let translatedRect = DuoViewport.largestSafeRect(in: translated, avoiding: [translatedHinge])
        checkSafe(translatedRect, bounds: translated, obstacles: [translatedHinge])
        require(translatedRect == CGRect(x: 110, y: 35, width: 190, height: 800), "Nonzero bounds origin uses its own coordinate space")

        // Exhaust every 3x3 reserved-cell occupancy pattern, including holes,
        // disconnected cells, overlap unions, thin gaps and complete occlusion.
        let small = CGRect(x: 0, y: 0, width: 3, height: 3)
        for mask in 0..<512 {
            let occupied = (0..<9).filter { mask & (1 << $0) != 0 }
            let obstacles = occupied.map { CGRect(x: $0 % 3, y: $0 / 3, width: 1, height: 1) }
            let rect = DuoViewport.largestSafeRect(in: small, avoiding: obstacles)
            checkSafe(rect, bounds: small, obstacles: obstacles)
            let returnedArea = rect.map { $0.width * $0.height } ?? 0
            require(returnedArea == oracleArea(bounds: small, obstacles: obstacles), "Exhaustive maximum differs at mask \(mask)")
            require(DuoViewport.largestSafeRect(in: small, avoiding: obstacles.reversed()) == rect, "Region order cannot change placement")
            exhaustivePatterns += 1
        }

        // Fractional coordinates and varied portrait/landscape dimensions, with
        // unequal pane areas and simultaneous camera exclusions.
        for index in 0..<120 {
            let width = CGFloat(300 + (index * 73) % 950) + 0.25
            let height = CGFloat(250 + (index * 47) % 1100) + 0.75
            let viewport = CGRect(x: 0.125, y: -4.5, width: width, height: height)
            let x = viewport.minX + width * CGFloat(30 + index % 35) / 100
            let hinge = CGRect(x: x, y: viewport.minY - 10, width: 12.375, height: height + 20)
            let camera = CGRect(x: viewport.maxX - 38.25, y: viewport.minY, width: 38.25, height: 34.125)
            let obstacles = [hinge, camera]
            let rect = DuoViewport.largestSafeRect(in: viewport, avoiding: obstacles)
            checkSafe(rect, bounds: viewport, obstacles: obstacles)
            require(abs(rect!.width * rect!.height - oracleArea(bounds: viewport, obstacles: obstacles)) < 0.000001,
                    "Fractional maximum differs at layout \(index)")
            fractionalLayouts += 1
        }

        let result: [String: Any] = ["ok": true, "checks": checks, "exhaustivePatterns": exhaustivePatterns,
                                   "fractionalLayouts": fractionalLayouts, "productionHelperCompiled": true]
        let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
        print(String(data: data, encoding: .utf8)!)
    }
}
