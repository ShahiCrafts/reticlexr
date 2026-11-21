// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Reticlexr",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "ReticlexrPlugin", targets: ["ReticlexrPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/cap-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "ReticlexrPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "cap-swift-pm"),
                .product(name: "Cordova", package: "cap-swift-pm")
            ],
            path: "ios/Sources/ReticlexrPlugin"
        ),
        .testTarget(
            name: "ReticlexrPluginTests",
            dependencies: ["ReticlexrPlugin"],
            path: "ios/Tests/ReticlexrPluginTests"
        )
    ]
)
