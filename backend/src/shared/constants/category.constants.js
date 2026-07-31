export const MARKETPLACE_CATEGORIES = Object.freeze([
  'Fashion',
  'Beauty',
  'Food',
  'Travel',
  'Gaming',
  'Technology',
  'Sport',
  'Lifestyle',
  'Entertainment',
  'Education',
  'Wellness',
  'Culture',
  'Music',
]);

export function canonicalCategory(value) {
  if (!value) return null;
  return MARKETPLACE_CATEGORIES.find(
    (category) => category.toLowerCase() === String(value).trim().toLowerCase(),
  ) || null;
}
