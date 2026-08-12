import { env } from '../../config/env.js';
import { seoRepository } from './seo.repository.js';

const escapeXml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const isoDate = (value) => new Date(value).toISOString().slice(0, 10);

function siteUrl() {
  return env.clientUrl.replace(/\/$/, '');
}

function urlEntry(path, { lastModified, changeFrequency = 'weekly', priority = '0.7' } = {}) {
  return [
    '  <url>',
    `    <loc>${escapeXml(`${siteUrl()}${path}`)}</loc>`,
    ...(lastModified ? [`    <lastmod>${isoDate(lastModified)}</lastmod>`] : []),
    `    <changefreq>${changeFrequency}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n');
}

export const seoService = {
  async sitemap() {
    const routes = await seoRepository.listPublicRoutes();
    const entries = [
      urlEntry('/', { changeFrequency: 'daily', priority: '1.0' }),
      urlEntry('/showcase', { changeFrequency: 'hourly', priority: '0.9' }),
      urlEntry('/search/creators', { changeFrequency: 'daily', priority: '0.8' }),
      urlEntry('/search/businesses', { changeFrequency: 'daily', priority: '0.7' }),
      ...routes.creators.map((item) => urlEntry(`/creators/${encodeURIComponent(item.slug)}`, { lastModified: item.updatedAt, priority: '0.8' })),
      ...routes.businesses.map((item) => urlEntry(`/businesses/${encodeURIComponent(item.slug)}`, { lastModified: item.updatedAt, priority: '0.7' })),
      ...routes.showcase.map((item) => urlEntry(`/showcase/${encodeURIComponent(item.id)}`, { lastModified: item.updatedAt, priority: '0.8' })),
    ];
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
  },

  robots() {
    return [
      'User-agent: *',
      'Allow: /',
      'Disallow: /account',
      'Disallow: /admin/',
      'Disallow: /business/',
      'Disallow: /collections',
      'Disallow: /creator/',
      'Disallow: /following',
      'Disallow: /login',
      'Disallow: /onboarding/',
      'Disallow: /register',
      'Disallow: /saved',
      'Disallow: /verify-email',
      'Disallow: /welcome',
      `Sitemap: ${env.apiPublicUrl.replace(/\/$/, '')}/sitemap.xml`,
      '',
    ].join('\n');
  },
};
