import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-with-at-least-32-characters';
process.env.JWT_PASSWORD_RESET_SECRET ||= 'test-reset-secret-with-at-least-32-characters';

const { app } = await import('../../src/app.js');
const { prisma } = await import('../../src/config/database.js');

const stamp = Date.now();
const prefix = `day7-${stamp}`;
let creator;
let business;
let showcase;

before(async () => {
  const creatorUser = await prisma.user.create({
    data: { email: `${prefix}-creator@example.com`, displayName: 'Day 7 Creator', roles: ['VIEWER', 'CREATOR'], status: 'ACTIVE', emailVerifiedAt: new Date() },
  });
  const businessUser = await prisma.user.create({
    data: { email: `${prefix}-business@example.com`, displayName: 'Day 7 Business', roles: ['VIEWER', 'BUSINESS'], status: 'ACTIVE', emailVerifiedAt: new Date() },
  });
  const suspendedUser = await prisma.user.create({
    data: { email: `${prefix}-suspended@example.com`, displayName: 'Suspended Creator', roles: ['VIEWER', 'CREATOR'], status: 'SUSPENDED', emailVerifiedAt: new Date() },
  });
  creator = await prisma.creatorProfile.create({ data: { userId: creatorUser.id, channelName: 'Day 7 Creator', slug: `${prefix}-creator` } });
  business = await prisma.businessProfile.create({ data: { userId: businessUser.id, companyName: 'Day 7 Business', slug: `${prefix}-business` } });
  await prisma.creatorProfile.create({ data: { userId: suspendedUser.id, channelName: 'Suspended Creator', slug: `${prefix}-hidden` } });
  showcase = await prisma.showcasePost.create({
    data: { creatorId: creator.id, title: 'Day 7 Showcase', description: 'Release metadata fixture.', mediaType: 'IMAGE', mediaUrl: '/day7.jpg', status: 'PUBLISHED', publishedAt: new Date() },
  });
});

after(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await prisma.$disconnect();
});

describe('Requirement Day 7 SEO release gate', () => {
  test('robots allows public pages, blocks private workspaces and points to a sitemap', async () => {
    const response = await request(app).get('/robots.txt');
    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /^text\/plain/);
    assert.match(response.text, /Allow: \//);
    assert.match(response.text, /Disallow: \/admin\//);
    assert.match(response.text, /Disallow: \/creator\//);
    assert.match(response.text, /Sitemap: .*\/sitemap\.xml/);
  });

  test('dynamic sitemap includes active creator, business and published showcase routes', async () => {
    const response = await request(app).get('/sitemap.xml');
    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /application\/xml/);
    assert.match(response.text, new RegExp(`/creators/${creator.slug}`));
    assert.match(response.text, new RegExp(`/businesses/${business.slug}`));
    assert.match(response.text, new RegExp(`/showcase/${showcase.id}`));
  });

  test('sitemap excludes suspended channels', async () => {
    const response = await request(app).get('/sitemap.xml');
    assert.doesNotMatch(response.text, new RegExp(`/creators/${prefix}-hidden`));
  });

  test('sitemap is cacheable and carries canonical last-modified dates', async () => {
    const response = await request(app).get('/sitemap.xml');
    assert.match(response.headers['cache-control'], /stale-while-revalidate/);
    assert.match(response.text, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  });
});
