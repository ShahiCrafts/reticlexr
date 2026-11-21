import Foundation
import simd
import UIKit

/// ARCoordinateMapper
///
/// Maps between coordinate systems, mirroring Android's
/// `ARCoordinateMapper.java`:
/// - Normalised screen coordinates [0, 1] (0,0 = top-left)
/// - View points (UIKit points, for RealityKit raycasts)
/// - 3D world transforms (`simd_float4x4`)
///
/// Hit results are reported to JS in the SAME format Android returns:
/// `position` is `[x, y, z]` and `rotation` is a quaternion
/// `[qx, qy, qz, qw]` (ARCore `Pose.getRotationQuaternion` order).
///
/// The pure functions here (unit clamping, hex parsing, euler →
/// quaternion, matrix → quaternion) are deliberately free of ARKit /
/// RealityKit session state so they can be unit-tested without a
/// device (see ios/Tests).
public enum ARCoordinateMapper {

    // MARK: - Normalised coordinates

    /// Clamp a normalised coordinate into [0, 1].
    public static func clampUnit(_ value: Double) -> Double {
        return min(max(value, 0.0), 1.0)
    }

    /// Convert normalised [0, 1] coordinates to a point in a view of
    /// the given size (UIKit points, origin top-left — the space
    /// `ARView.raycast(from:)` expects).
    public static func point(normalisedX x: Double, normalisedY y: Double, in size: CGSize) -> CGPoint {
        return CGPoint(
            x: clampUnit(x) * Double(size.width),
            y: clampUnit(y) * Double(size.height)
        )
    }

    // MARK: - World transform decomposition

    /// World position `[x, y, z]` from a 4x4 world transform
    /// (the translation lives in the fourth column).
    public static func position(from transform: simd_float4x4) -> [Double] {
        let t = transform.columns.3
        return [Double(t.x), Double(t.y), Double(t.z)]
    }

    /// Rotation quaternion `[qx, qy, qz, qw]` from a 4x4 world
    /// transform — the same array shape Android's hit test returns.
    public static func quaternion(from transform: simd_float4x4) -> [Double] {
        let c = transform.columns
        let rotation = simd_float3x3(
            simd_float3(c.0.x, c.0.y, c.0.z),
            simd_float3(c.1.x, c.1.y, c.1.z),
            simd_float3(c.2.x, c.2.y, c.2.z)
        )
        return quaternionArray(quaternion(fromRotationMatrix: rotation))
    }

    /// `[qx, qy, qz, qw]` array for a simd quaternion.
    public static func quaternionArray(_ q: simd_quatf) -> [Double] {
        return [Double(q.imag.x), Double(q.imag.y), Double(q.imag.z), Double(q.real)]
    }

    /// Quaternion from a pure rotation matrix (trace method; the
    /// matrix is assumed orthonormal, as ARKit/RealityKit world
    /// transforms are).
    public static func quaternion(fromRotationMatrix m: simd_float3x3) -> simd_quatf {
        // m(row, col) == m.columns[col][row]
        let m00 = m.columns.0.x, m01 = m.columns.1.x, m02 = m.columns.2.x
        let m10 = m.columns.0.y, m11 = m.columns.1.y, m12 = m.columns.2.y
        let m20 = m.columns.0.z, m21 = m.columns.1.z, m22 = m.columns.2.z

        let trace = m00 + m11 + m22
        var x: Float = 0, y: Float = 0, z: Float = 0, w: Float = 0
        if trace > 0 {
            let s = sqrt(trace + 1.0) * 2.0
            w = 0.25 * s
            x = (m21 - m12) / s
            y = (m02 - m20) / s
            z = (m10 - m01) / s
        } else if m00 > m11 && m00 > m22 {
            let s = sqrt(1.0 + m00 - m11 - m22) * 2.0
            w = (m21 - m12) / s
            x = 0.25 * s
            y = (m01 + m10) / s
            z = (m02 + m20) / s
        } else if m11 > m22 {
            let s = sqrt(1.0 + m11 - m00 - m22) * 2.0
            w = (m02 - m20) / s
            x = (m01 + m10) / s
            y = 0.25 * s
            z = (m12 + m21) / s
        } else {
            let s = sqrt(1.0 + m22 - m00 - m11) * 2.0
            w = (m10 - m01) / s
            x = (m02 + m20) / s
            y = (m12 + m21) / s
            z = 0.25 * s
        }
        return simd_quatf(ix: x, iy: y, iz: z, r: w).normalized
    }

    /// Plane type ("horizontal" / "vertical") for a world transform,
    /// derived from its up vector — a horizontal surface's up is
    /// parallel to world +Y. Used for RealityKit raycast results,
    /// whose alignment value is not exposed the way ARKit's
    /// `ARPlaneAnchor.alignment` is.
    public static func planeType(from transform: simd_float4x4) -> String {
        let up = transform.columns.1
        return abs(up.y) > 0.7 ? "horizontal" : "vertical"
    }

    // MARK: - Euler degrees (facade setTransform convention)

    /// Quaternion for facade Euler angles in DEGREES, applied in
    /// YXZ order (yaw, then pitch, then roll) — the same order the
    /// WebXR runtime uses when it builds a Y quaternion for
    /// placement rotation.
    public static func quaternion(eulerDegreesX x: Double, y: Double, z: Double) -> simd_quatf {
        let degToRad = Float.pi / 180.0
        let qx = simd_quatf(angle: Float(x) * degToRad, axis: simd_float3(1, 0, 0))
        let qy = simd_quatf(angle: Float(y) * degToRad, axis: simd_float3(0, 1, 0))
        let qz = simd_quatf(angle: Float(z) * degToRad, axis: simd_float3(0, 0, 1))
        return (qy * qx * qz).normalized
    }

    // MARK: - Hex colours (facade setMaterial convention)

    /// Parse a hex colour string ("#7D8B67", "7D8B67", "#RGB" or
    /// "#RRGGBBAA") into RGBA components in [0, 1].
    /// Returns nil for anything unparseable.
    public static func parseHexColor(_ hex: String) -> (red: Double, green: Double, blue: Double, alpha: Double)? {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") {
            s.removeFirst()
        }
        // Expand the short #RGB form.
        if s.count == 3 {
            s = s.map { "\($0)\($0)" }.joined()
        }
        guard s.count == 6 || s.count == 8, let value = UInt64(s, radix: 16) else {
            return nil
        }
        if s.count == 6 {
            return (
                red: Double((value >> 16) & 0xFF) / 255.0,
                green: Double((value >> 8) & 0xFF) / 255.0,
                blue: Double(value & 0xFF) / 255.0,
                alpha: 1.0
            )
        }
        return (
            red: Double((value >> 24) & 0xFF) / 255.0,
            green: Double((value >> 16) & 0xFF) / 255.0,
            blue: Double((value >> 8) & 0xFF) / 255.0,
            alpha: Double(value & 0xFF) / 255.0
        )
    }
}
