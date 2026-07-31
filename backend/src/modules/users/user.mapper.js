export function toUserProfile(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    location: user.location,
    bio: user.bio,
    roles: user.roles,
    status: user.status,
    emailVerified: Boolean(user.emailVerifiedAt),
    lastSeenAt: user.lastSeenAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profiles: {
      creator: Boolean(user.creatorProfile),
      business: Boolean(user.businessProfile),
    },
  };
}
