const requiredMethods = [
  'authorizeUrl',
  'exchangeCode',
  'refreshToken',
  'listAccounts',
  'fetchProfile',
  'fetchStats',
  'fetchMedia',
];

export function assertSocialProvider(provider) {
  for (const method of requiredMethods) {
    if (typeof provider?.[method] !== 'function') {
      throw new TypeError(`Social provider must implement ${method}().`);
    }
  }
  return provider;
}
