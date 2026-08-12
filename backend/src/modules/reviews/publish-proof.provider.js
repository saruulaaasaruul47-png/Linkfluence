import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';
import { decryptSocialToken } from '../social-sync/token-encryption.js';

const allowedHosts = {
  INSTAGRAM: ['instagram.com', 'www.instagram.com'],
  FACEBOOK: ['facebook.com', 'www.facebook.com'],
};

function safePostUrl(platform, value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (allowedHosts[platform] || []).includes(url.hostname);
  } catch { return false; }
}

function sandboxMetrics(value) {
  const seed = Number.parseInt(createHash('sha256').update(value).digest('hex').slice(0, 8), 16);
  const views = 5000 + (seed % 50000);
  const likes = 100 + (seed % 4000);
  const comments = 10 + (seed % 400);
  const shares = 5 + (seed % 250);
  return { reach: Math.round(views * 0.78), views, likes, comments, shares, engagement: likes + comments + shares };
}

export async function verifyPublicationProof({ postUrl, providerPostId, socialAccount }) {
  if (!socialAccount || socialAccount.verificationStatus !== 'VERIFIED' || !providerPostId || !safePostUrl(socialAccount.platform, postUrl)) {
    return { available: false, verified: false, source: 'manual' };
  }
  if (env.socialProviderMode === 'sandbox') {
    return { available: true, verified: true, live: !postUrl.includes('/removed/'), source: 'sandbox-provider', metrics: sandboxMetrics(providerPostId) };
  }
  if (!['INSTAGRAM', 'FACEBOOK'].includes(socialAccount.platform) || !/^[A-Za-z0-9_:-]{3,200}$/.test(providerPostId)) {
    return { available: false, verified: false, source: 'manual' };
  }
  const token = decryptSocialToken(socialAccount.accessTokenEncrypted);
  const url = new URL(`https://graph.facebook.com/${env.metaGraphVersion}/${encodeURIComponent(providerPostId)}`);
  url.searchParams.set('fields', 'id,permalink,timestamp,like_count,comments_count');
  url.searchParams.set('access_token', token);
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.id) return { available: true, verified: false, live: false, source: 'meta' };
  const likes = Number(data.like_count || 0);
  const comments = Number(data.comments_count || 0);
  return { available: true, verified: true, live: true, source: 'meta', metrics: { likes, comments, engagement: likes + comments } };
}

export async function checkPublicationRetention(proof) {
  if (env.socialProviderMode === 'sandbox') return { live: !proof.postUrl.includes('/removed/'), source: 'sandbox-provider' };
  if (!proof.socialAccount || !proof.providerPostId) return { live: null, source: 'manual' };
  return verifyPublicationProof({ postUrl: proof.postUrl, providerPostId: proof.providerPostId, socialAccount: proof.socialAccount });
}
