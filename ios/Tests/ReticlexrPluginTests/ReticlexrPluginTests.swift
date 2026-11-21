import XCTest
@testable import ReticlexrPlugin

/// Device-free tests for the iOS plugin's pure logic: support-result
/// shaping, hex colour parsing and coordinate/euler maths. Anything
/// that needs a live ARSession / RealityKit scene is NOT covered
/// here — that requires a real device (the iOS Simulator has no
/// ARKit world tracking).
final class ReticlexrPluginTests: XCTestCase {

    // MARK: - Support result (checkSupport shaping, NAT-12 parity)

    func testSupportResultWhenSupported() {
        let result = ARSessionManager.supportResult(isSupported: true)
        XCTAssertTrue(result.supported)
        XCTAssertEqual(result.reason, "ARKit supported")
        XCTAssertNil(result.code)
    }

    func testSupportResultWhenUnsupported() {
        let result = ARSessionManager.supportResult(isSupported: false)
        XCTAssertFalse(result.supported)
        XCTAssertEqual(result.code, "UNSUPPORTED_DEVICE_NOT_CAPABLE")
        XCTAssertFalse(result.reason.isEmpty)
    }

    // MARK: - Hex colour parsing (setMaterial)

    func testParseHexColorRRGGBB() {
        let rgba = ARCoordinateMapper.parseHexColor("#7D8B67")
        XCTAssertNotNil(rgba)
        XCTAssertEqual(rgba?.red ?? 0, 0x7D / 255.0, accuracy: 0.001)
        XCTAssertEqual(rgba?.green ?? 0, 0x8B / 255.0, accuracy: 0.001)
        XCTAssertEqual(rgba?.blue ?? 0, 0x67 / 255.0, accuracy: 0.001)
        XCTAssertEqual(rgba?.alpha ?? 0, 1.0, accuracy: 0.001)
    }

    func testParseHexColorShortFormAndInvalid() {
        XCTAssertNotNil(ARCoordinateMapper.parseHexColor("#FFF"))
        XCTAssertNotNil(ARCoordinateMapper.parseHexColor("FF0000"))
        XCTAssertNil(ARCoordinateMapper.parseHexColor("not-a-color"))
        XCTAssertNil(ARCoordinateMapper.parseHexColor("#12345"))
        XCTAssertNil(ARCoordinateMapper.parseHexColor(""))
    }

    // MARK: - Coordinates

    func testClampUnit() {
        XCTAssertEqual(ARCoordinateMapper.clampUnit(-0.5), 0)
        XCTAssertEqual(ARCoordinateMapper.clampUnit(0.5), 0.5)
        XCTAssertEqual(ARCoordinateMapper.clampUnit(1.5), 1)
    }

    func testNormalisedPointMapping() {
        let size = CGSize(width: 200, height: 400)
        let centre = ARCoordinateMapper.point(normalisedX: 0.5, normalisedY: 0.5, in: size)
        XCTAssertEqual(centre.x, 100, accuracy: 0.001)
        XCTAssertEqual(centre.y, 200, accuracy: 0.001)
        let corner = ARCoordinateMapper.point(normalisedX: 2, normalisedY: -1, in: size)
        XCTAssertEqual(corner.x, 200, accuracy: 0.001)
        XCTAssertEqual(corner.y, 0, accuracy: 0.001)
    }

    // MARK: - Rotations

    func testIdentityEulerGivesIdentityQuaternion() {
        let q = ARCoordinateMapper.quaternion(eulerDegreesX: 0, y: 0, z: 0)
        let array = ARCoordinateMapper.quaternionArray(q)
        XCTAssertEqual(array[0], 0, accuracy: 0.001)
        XCTAssertEqual(array[1], 0, accuracy: 0.001)
        XCTAssertEqual(array[2], 0, accuracy: 0.001)
        XCTAssertEqual(abs(array[3]), 1, accuracy: 0.001)
    }

    func testYaw90EulerQuaternion() {
        let q = ARCoordinateMapper.quaternion(eulerDegreesX: 0, y: 90, z: 0)
        let array = ARCoordinateMapper.quaternionArray(q)
        // 90° about Y: (0, sin45°, 0, cos45°)
        XCTAssertEqual(array[1], 0.7071, accuracy: 0.001)
        XCTAssertEqual(abs(array[3]), 0.7071, accuracy: 0.001)
    }

    func testUSDZCandidateMapping() {
        XCTAssertEqual(ARCorePlugin.usdzCandidate(for: "models/chair.glb"), "models/chair.usdz")
        XCTAssertEqual(ARCorePlugin.usdzCandidate(for: "https://x.test/a/sofa.gltf"), "https://x.test/a/sofa.usdz")
        XCTAssertEqual(ARCorePlugin.usdzCandidate(for: "models/chair.usdz"), "models/chair.usdz")
        XCTAssertNil(ARCorePlugin.usdzCandidate(for: "models/chair.png"))
    }
}
