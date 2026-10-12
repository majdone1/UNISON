export interface Mentionable {
  userId: string;
  displayName: string;
}

/** Resolve @DisplayName and @[uuid] mentions from comment body. */
export function resolveMentions(body: string, members: Mentionable[]): string[] {
  const ids = new Set<string>();

  for (const match of body.matchAll(/@\[([0-9a-f-]{36})\]/gi)) {
    if (match[1]) ids.add(match[1]);
  }

  // Prefer longer names first to avoid partial overlaps
  const sorted = [...members].sort((a, b) => b.displayName.length - a.displayName.length);
  for (const member of sorted) {
    const needle = `@${member.displayName}`;
    if (body.includes(needle)) ids.add(member.userId);
  }

  return [...ids];
}

export function highlightMentions(body: string, members: Mentionable[]): string {
  let out = body;
  const sorted = [...members].sort((a, b) => b.displayName.length - a.displayName.length);
  for (const member of sorted) {
    out = out.split(`@${member.displayName}`).join(`**@${member.displayName}**`);
  }
  return out;
}
