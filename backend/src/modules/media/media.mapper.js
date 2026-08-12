export const toMediaAsset = (asset) => ({
  id: asset.id,
  purpose: asset.purpose,
  url: `/api/v1/media/assets/${asset.id}/content`,
  mimeType: asset.mimeType,
  sizeBytes: asset.sizeBytes,
  originalName: asset.originalName,
  createdAt: asset.createdAt,
});
