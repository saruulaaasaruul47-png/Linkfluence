const item = (value) => ({
  id: value.id,
  key: `${value.targetType.toLowerCase()}:${value.targetId}`,
  targetType: value.targetType,
  targetId: value.targetId,
  note: value.note || '',
  createdAt: value.createdAt,
});

export function toCollection(value, { includeShareToken = false } = {}) {
  return {
    id: value.id,
    name: value.name,
    description: value.description || '',
    cover: value.coverUrl || '',
    coverUrl: value.coverUrl || '',
    visibility: value.visibility.toLowerCase(),
    shareToken: includeShareToken ? value.shareToken : undefined,
    isDefault: value.isDefault,
    count: value._count?.items ?? value.items?.length ?? 0,
    items: value.items?.map(item) || [],
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}
