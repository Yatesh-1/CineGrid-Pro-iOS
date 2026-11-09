import Foundation
import Photos
import Capacitor

@objc(MediaSaverPlugin)
public class MediaSaverPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MediaSaverPlugin"
    public let jsName = "MediaSaver"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveMedia", returnType: CAPPluginReturnPromise)
    ]

    private let albumName = "CineGrid Pro"

    @objc public func saveMedia(_ call: CAPPluginCall) {
        let mediaType = call.getString("mediaType") ?? "photo"
        let dataStr = call.getString("data")
        let tempFilePath = call.getString("tempFilePath")
        let fileName = call.getString("fileName") ?? "CineGrid_\(Int(Date().timeIntervalSince1970 * 1000))"

        var mediaData: Data? = nil

        if let dataStr = dataStr {
            if dataStr.hasPrefix("data:") {
                if let commaIndex = dataStr.firstIndex(of: ",") {
                    let base64 = String(dataStr[dataStr.index(after: commaIndex)...])
                    mediaData = Data(base64Encoded: base64, options: .ignoreUnknownCharacters)
                }
            } else {
                mediaData = Data(base64Encoded: dataStr, options: .ignoreUnknownCharacters)
            }
        } else if let tempFilePath = tempFilePath {
            let path = tempFilePath.hasPrefix("file://") ? String(tempFilePath.dropFirst(7)) : tempFilePath
            if let fileData = try? Data(contentsOf: URL(fileURLWithPath: path)) {
                mediaData = fileData
            }
        }

        guard let validData = mediaData, !validData.isEmpty else {
            call.reject("No valid media data provided to save.")
            return
        }

        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else {
                call.reject("Photo library permission was denied.")
                return
            }

            self.performSave(data: validData, mediaType: mediaType, baseName: fileName, call: call)
        }
    }

    private func performSave(data: Data, mediaType: String, baseName: String, call: CAPPluginCall) {
        var placeholder: PHObjectPlaceholder?

        let isVideo = (mediaType == "video")
        let ext = isVideo ? ".mp4" : ".jpg"
        let cleanBase = (baseName as NSString).deletingPathExtension
        let finalFileName = cleanBase + ext

        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ext)
        do {
            try data.write(to: tempURL)
        } catch {
            call.reject("Failed to write temporary file for media import: \(error.localizedDescription)")
            return
        }

        PHPhotoLibrary.shared().performChanges({
            let request: PHAssetChangeRequest?
            if isVideo {
                request = PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: tempURL)
            } else {
                request = PHAssetChangeRequest.creationRequestForAssetFromImage(atFileURL: tempURL)
            }

            if let request = request {
                placeholder = request.placeholderForCreatedAsset
            }
        }) { success, error in
            try? FileManager.default.removeItem(at: tempURL)

            if !success || placeholder == nil {
                call.reject("Failed to save media to photo library: \(error?.localizedDescription ?? "Unknown error")")
                return
            }

            let assetId = placeholder!.localIdentifier
            self.addAssetToAlbum(assetIdentifier: assetId, albumTitle: self.albumName)

            call.resolve([
                "success": true,
                "fileName": finalFileName,
                "uri": "photos://asset?id=\(assetId)",
                "bytesWritten": data.count
            ])
        }
    }

    private func addAssetToAlbum(assetIdentifier: String, albumTitle: String) {
        let fetchOptions = PHFetchOptions()
        fetchOptions.predicate = NSPredicate(format: "title = %@", albumTitle)
        let collection = PHAssetCollection.fetchAssetCollections(with: .album, subtype: .any, options: fetchOptions)

        var album: PHAssetCollection? = collection.firstObject

        if album == nil {
            var albumPlaceholder: PHObjectPlaceholder?
            try? PHPhotoLibrary.shared().performChangesAndWait {
                let createRequest = PHAssetCollectionChangeRequest.creationRequestForAssetCollection(withTitle: albumTitle)
                albumPlaceholder = createRequest.placeholderForCreatedAssetCollection
            }
            if let placeholder = albumPlaceholder {
                let newCollection = PHAssetCollection.fetchAssetCollections(withLocalIdentifiers: [placeholder.localIdentifier], options: nil)
                album = newCollection.firstObject
            }
        }

        guard let targetAlbum = album else { return }

        let assets = PHAsset.fetchAssets(withLocalIdentifiers: [assetIdentifier], options: nil)
        guard let asset = assets.firstObject else { return }

        try? PHPhotoLibrary.shared().performChangesAndWait {
            let albumRequest = PHAssetCollectionChangeRequest(for: targetAlbum)
            albumRequest?.addAssets([asset] as NSArray)
        }
    }
}
