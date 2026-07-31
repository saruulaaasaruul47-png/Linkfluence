export const toLibraryKey = (item) => `${item.targetType.toLowerCase()}:${item.targetId}`;

export function toLibraryState(state) {
  return {
    saved: state.saved.map(toLibraryKey),
    following: state.following.map(toLibraryKey),
    recent: state.recent.map(toLibraryKey),
  };
}
