/**
 * Display labels for darts participants/members. The platform has no member
 * directory yet (no queryable name across members — mirrors the stopgap in
 * `modules/habits/components/participants-manager.tsx`), so a member is
 * labelled by a truncated id; a guest is labelled by their free-text name.
 */
export function memberLabel(memberId: string): string {
  return `Member ${memberId.slice(0, 8)}`;
}

export function participantLabel(participant: {
  memberId: string | null;
  guestName: string | null;
}): string {
  if (participant.guestName) return participant.guestName;
  if (participant.memberId) return memberLabel(participant.memberId);
  return "Unknown player";
}
