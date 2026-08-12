import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const assetsDirectory = path.resolve('dist/assets')
const files = await readdir(assetsDirectory)
const assets = await Promise.all(files
  .filter((file) => /\.(js|css)$/.test(file))
  .map(async (file) => ({ file, bytes: (await stat(path.join(assetsDirectory, file))).size })))

const jsAssets = assets.filter(({ file }) => file.endsWith('.js'))
const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0)
const limits = {
  chunkBytes: Number(process.env.BUNDLE_CHUNK_BUDGET_BYTES || 420 * 1024),
  totalBytes: Number(process.env.BUNDLE_TOTAL_BUDGET_BYTES || 2 * 1024 * 1024),
}
const oversized = jsAssets.filter(({ bytes }) => bytes > limits.chunkBytes)
const result = {
  chunks: jsAssets.length,
  largestChunkBytes: Math.max(0, ...jsAssets.map(({ bytes }) => bytes)),
  totalAssetBytes: totalBytes,
  limits,
}

console.log(JSON.stringify(result, null, 2))
if (oversized.length || totalBytes > limits.totalBytes) {
  const details = oversized.map(({ file, bytes }) => `${file} (${bytes} bytes)`).join(', ')
  throw new Error(`Bundle budget exceeded${details ? `: ${details}` : ''}${totalBytes > limits.totalBytes ? `; total ${totalBytes} bytes` : ''}.`)
}
