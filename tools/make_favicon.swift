import AppKit
import CoreGraphics
import Foundation

let brandGold = (r: UInt8(184), g: UInt8(130), b: UInt8(66))
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let inputURL = root.appendingPathComponent("footer-logo.png")

guard
  let image = NSImage(contentsOf: inputURL),
  let tiff = image.tiffRepresentation,
  let sourceRep = NSBitmapImageRep(data: tiff),
  let sourceImage = sourceRep.cgImage
else {
  fputs("Failed to load footer-logo.png\n", stderr)
  exit(1)
}

let width = sourceImage.width
let height = sourceImage.height
let bytesPerPixel = 4
let bytesPerRow = width * bytesPerPixel
let colorSpace = CGColorSpaceCreateDeviceRGB()
let bitmapInfo = CGImageAlphaInfo.premultipliedLast.rawValue

let sourceData = UnsafeMutablePointer<UInt8>.allocate(capacity: height * bytesPerRow)
defer { sourceData.deallocate() }
sourceData.initialize(repeating: 0, count: height * bytesPerRow)

guard let sourceContext = CGContext(
  data: sourceData,
  width: width,
  height: height,
  bitsPerComponent: 8,
  bytesPerRow: bytesPerRow,
  space: colorSpace,
  bitmapInfo: bitmapInfo
) else {
  fputs("Failed to create source context\n", stderr)
  exit(1)
}

sourceContext.draw(sourceImage, in: CGRect(x: 0, y: 0, width: width, height: height))

let tintedData = UnsafeMutablePointer<UInt8>.allocate(capacity: height * bytesPerRow)
defer { tintedData.deallocate() }
tintedData.initialize(repeating: 0, count: height * bytesPerRow)

var minX = width
var minY = height
var maxX = 0
var maxY = 0

for y in 0..<height {
  for x in 0..<width {
    let offset = y * bytesPerRow + x * bytesPerPixel
    let r = Int(sourceData[offset])
    let g = Int(sourceData[offset + 1])
    let b = Int(sourceData[offset + 2])
    let a = Int(sourceData[offset + 3])

    let luminance = Int(0.299 * Double(r) + 0.587 * Double(g) + 0.114 * Double(b))
    let mask = max(0, 255 - luminance)
    let alpha = Int((Double(mask) / 255.0) * Double(a))

    if alpha > 18 {
      minX = min(minX, x)
      minY = min(minY, y)
      maxX = max(maxX, x)
      maxY = max(maxY, y)
      tintedData[offset] = brandGold.r
      tintedData[offset + 1] = brandGold.g
      tintedData[offset + 2] = brandGold.b
      tintedData[offset + 3] = UInt8(min(alpha, 255))
    } else {
      tintedData[offset] = 0
      tintedData[offset + 1] = 0
      tintedData[offset + 2] = 0
      tintedData[offset + 3] = 0
    }
  }
}

guard minX <= maxX, minY <= maxY else {
  fputs("No visible logo pixels found\n", stderr)
  exit(1)
}

guard let tintedContext = CGContext(
  data: tintedData,
  width: width,
  height: height,
  bitsPerComponent: 8,
  bytesPerRow: bytesPerRow,
  space: colorSpace,
  bitmapInfo: bitmapInfo
),
let tintedImage = tintedContext.makeImage(),
let croppedImage = tintedImage.cropping(
  to: CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
)
else {
  fputs("Failed to create cropped image\n", stderr)
  exit(1)
}

func writePNG(size: Int, name: String) throws {
  let outBytesPerRow = size * bytesPerPixel
  let outData = UnsafeMutablePointer<UInt8>.allocate(capacity: size * outBytesPerRow)
  defer { outData.deallocate() }
  outData.initialize(repeating: 0, count: size * outBytesPerRow)

  guard let outContext = CGContext(
    data: outData,
    width: size,
    height: size,
    bitsPerComponent: 8,
    bytesPerRow: outBytesPerRow,
    space: colorSpace,
    bitmapInfo: bitmapInfo
  ) else {
    throw NSError(domain: "favicon", code: 1)
  }

  outContext.clear(CGRect(x: 0, y: 0, width: size, height: size))
  outContext.interpolationQuality = .high

  let padding = CGFloat(size) * 0.07
  let available = CGFloat(size) - (padding * 2)
  let aspect = CGFloat(croppedImage.width) / CGFloat(croppedImage.height)
  let drawWidth: CGFloat
  let drawHeight: CGFloat

  if aspect >= 1 {
    drawWidth = available
    drawHeight = available / aspect
  } else {
    drawHeight = available
    drawWidth = available * aspect
  }

  let drawRect = CGRect(
    x: (CGFloat(size) - drawWidth) / 2,
    y: (CGFloat(size) - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight
  )

  outContext.draw(croppedImage, in: drawRect)

  guard let outImage = outContext.makeImage() else {
    throw NSError(domain: "favicon", code: 2)
  }

  let rep = NSBitmapImageRep(cgImage: outImage)
  rep.size = NSSize(width: size, height: size)
  guard let png = rep.representation(using: .png, properties: [:]) else {
    throw NSError(domain: "favicon", code: 3)
  }

  try png.write(to: root.appendingPathComponent(name))
}

do {
  try writePNG(size: 256, name: "favicon.png")
  try writePNG(size: 32, name: "favicon-32.png")
  try writePNG(size: 16, name: "favicon-16.png")
  try writePNG(size: 180, name: "apple-touch-icon.png")
} catch {
  fputs("Failed to write favicon assets: \(error)\n", stderr)
  exit(1)
}

print("Generated favicon assets from footer-logo.png")
