import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyGoogleCredential } from '../../src/modules/auth/auth.google.js';

const audience = 'test-web-client.apps.googleusercontent.com';

test('Google credential verification validates the intended audience and maps safe claims', async () => {
  const client = {
    async verifyIdToken(input) {
      assert.deepEqual(input, { idToken: 'signed-google-token', audience });
      return {
        getPayload: () => ({
          sub: 'google-subject-123',
          email: 'USER@Example.com',
          email_verified: true,
          name: 'Google User',
          picture: 'https://example.test/avatar.jpg',
        }),
      };
    },
  };

  const result = await verifyGoogleCredential('signed-google-token', { client, audience });
  assert.deepEqual(result, {
    subject: 'google-subject-123',
    email: 'user@example.com',
    displayName: 'Google User',
    avatarUrl: 'https://example.test/avatar.jpg',
  });
});

test('Google credential verification rejects provider errors and unverified email claims', async () => {
  const failingClient = { verifyIdToken: async () => { throw new Error('bad signature'); } };
  await assert.rejects(
    verifyGoogleCredential('invalid-token', { client: failingClient, audience }),
    (error) => error.statusCode === 401 && error.code === 'INVALID_GOOGLE_CREDENTIAL',
  );

  const unverifiedClient = {
    verifyIdToken: async () => ({
      getPayload: () => ({ sub: 'subject', email: 'user@example.com', email_verified: false }),
    }),
  };
  await assert.rejects(
    verifyGoogleCredential('signed-token', { client: unverifiedClient, audience }),
    (error) => error.statusCode === 401 && error.code === 'INVALID_GOOGLE_CREDENTIAL',
  );
});
