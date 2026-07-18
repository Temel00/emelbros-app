/**
 * A member's display label. The platform has no name/email directory
 * queryable from a member id yet (same stopgap used by
 * `modules/habits/components/participants-manager.tsx` and
 * `modules/lists/components/list-settings-dialog.tsx`) — a truncated id
 * stands in until one exists.
 */
export function shortMemberLabel(memberId: string): string {
  return `${memberId.slice(0, 8)}…`;
}
