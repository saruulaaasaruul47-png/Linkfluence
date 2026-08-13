import { Router } from 'express';

export const apiDocsRouter = Router();

const document = {
  openapi: '3.1.0',
  info: {
    title: 'Influence Hub API',
    version: '1.0.0',
    description: 'REST API for creator, business, collaboration, messaging and finance workflows.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      refreshCookie: { type: 'apiKey', in: 'cookie', name: 'refreshToken' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', const: false },
          error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, details: {} } },
        },
      },
    },
  },
  paths: {
    '/health': { get: { summary: 'Basic API health', responses: { 200: { description: 'Healthy' } } } },
    '/auth/login': { post: { summary: 'Sign in', responses: { 200: { description: 'Authenticated' }, 401: { description: 'Invalid credentials' } } } },
    '/auth/refresh': { post: { summary: 'Rotate refresh token', responses: { 200: { description: 'Session refreshed' } } } },
    '/auth/reauthenticate': { post: { summary: 'Confirm password for a sensitive action', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Five-minute reauthentication token' }, 401: { description: 'Password confirmation failed' } } } },
    '/users/me': {
      get: { summary: 'Current account', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Account' } } },
      patch: { summary: 'Update current account', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Updated' } } },
      delete: { summary: 'Soft-delete account', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Deleted' } } },
    },
    '/users/me/export': { get: { summary: 'Export account data', security: [{ bearerAuth: [] }], responses: { 200: { description: 'JSON export' } } } },
    '/creator/media-kit.pdf': { get: { summary: 'Generate creator media kit PDF', security: [{ bearerAuth: [] }], responses: { 200: { description: 'PDF document' } } } },
    '/campaigns': { get: { summary: 'Discover campaigns', responses: { 200: { description: 'Paginated campaigns' } } } },
    '/conversations': { get: { summary: 'List conversations', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Paginated conversations' } } } },
    '/payments/wallet': { get: { summary: 'Wallet summary', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Wallet' } } } },
    '/admin/access-control/permissions': { get: { summary: 'List granular permission definitions', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Permissions' }, 403: { description: 'Admin role required' } } } },
    '/admin/access-control/users/{userId}/permissions/{permissionKey}': {
      put: { summary: 'Grant a permission after reauthentication', security: [{ bearerAuth: [] }], parameters: [{ in: 'header', name: 'x-reauth-token', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Permission granted' } } },
      delete: { summary: 'Revoke a permission after reauthentication', security: [{ bearerAuth: [] }], parameters: [{ in: 'header', name: 'x-reauth-token', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Permission revoked' } } },
    },
  },
};

apiDocsRouter.get('/openapi.json', (_req, res) => res.json(document));
apiDocsRouter.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html><html><head><title>Influence Hub API</title><meta charset="utf-8"><style>body{font:16px system-ui;max-width:880px;margin:48px auto;padding:0 24px;background:#101010;color:#eee}a{color:#ff76bd}code{background:#222;padding:3px 7px;border-radius:6px}</style></head><body><h1>Influence Hub API</h1><p>OpenAPI 3.1 document: <a href="/api-docs/openapi.json"><code>/api-docs/openapi.json</code></a></p><p>All application endpoints are versioned under <code>/api/v1</code>.</p></body></html>`);
});
