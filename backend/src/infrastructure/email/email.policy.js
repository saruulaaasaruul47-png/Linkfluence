const reservedDomains = new Set([
  'example.com',
  'example.net',
  'example.org',
  'invalid',
  'localhost',
  'test',
]);

export function emailDomain(email) {
  const separator = String(email || '').lastIndexOf('@');
  return separator >= 0 ? String(email).slice(separator + 1).trim().toLowerCase() : '';
}

export function isReservedEmailRecipient(email) {
  const domain = emailDomain(email);
  return reservedDomains.has(domain) || domain.endsWith('.test') || domain.endsWith('.invalid');
}

export function shouldUseLocalEmailDelivery(nodeEnv, email) {
  return nodeEnv === 'test' || (nodeEnv === 'development' && isReservedEmailRecipient(email));
}
