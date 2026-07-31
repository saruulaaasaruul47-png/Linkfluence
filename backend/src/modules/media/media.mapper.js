export const toMediaAsset = (asset) => ({
  id: asset.id,
  purpose: asset.purpose,
  url: asset.url,
  mimeType: asset.mimeType,
  sizeBytes: asset.sizeBytes,
  originalName: asset.originalName,
  createdAt: asset.createdAt,
});
