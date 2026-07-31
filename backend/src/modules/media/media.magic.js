const startsWith = (buffer, bytes) => bytes.every((byte, index) => buffer[index] === byte);

export function detectMedia(buffer) {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return { mimeType: 'image/jpeg', extension: 'jpg', kind: 'IMAGE' };
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: 'image/png', extension: 'png', kind: 'IMAGE' };
  }
  if (buffer.subarray(0, 6).toString('ascii') === 'GIF87a'
    || buffer.subarray(0, 6).toString('ascii') === 'GIF89a') {
    return { mimeType: 'image/gif', extension: 'gif', kind: 'IMAGE' };
  }
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { mimeType: 'image/webp', extension: 'webp', kind: 'IMAGE' };
  }
  const box = buffer.subarray(4, 12).toString('ascii');
  if (/^ftyp/.test(box) || box.includes('ftyp')) {
    return { mimeType: 'video/mp4', extension: 'mp4', kind: 'VIDEO' };
  }
  if (buffer.subarray(0, 4).toString('hex') === '1a45dfa3') {
    return { mimeType: 'video/webm', extension: 'webm', kind: 'VIDEO' };
  }
  return null;
}
