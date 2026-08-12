const numberOr = (value, fallback) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const dateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function contractSnapshotFromTerms(terms = {}) {
  return {
    revisionLimit: Math.min(20, Math.max(0, numberOr(terms.revisionLimit, 2))),
    publishBy: dateOrNull(terms.publishBy ?? terms.publishDate ?? terms.finalDeadline),
    retentionDays: Math.min(3650, Math.max(1, numberOr(terms.retentionDays, 30))),
    disputeWindowDays: Math.min(90, Math.max(1, numberOr(terms.disputeWindowDays, 7))),
    disclosureRequired: terms.disclosureRequired ?? terms.paidPartnershipDisclosure ?? true,
  };
}

