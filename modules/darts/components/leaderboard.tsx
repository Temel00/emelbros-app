import { ACCENT_BG } from "@/lib/accent";
import { cn } from "@/lib/utils";

import type { CareerRecord, HeadToHead } from "@/modules/darts/lib/stats";
import type { MemberAccent } from "@/lib/accent";

export type LeaderboardRow = {
  memberId: string;
  label: string;
  accent: MemberAccent;
  record: CareerRecord;
  headToHead: (HeadToHead & { opponentLabel: string })[];
};

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * The darts stats / leaderboard page (darts.md §5, §10): every member's
 * career record, open to all members regardless of who's signed in (fixed
 * Family scope, darts.md §7). Rows are pre-computed by the page from
 * `modules/darts/lib/stats.ts` — this component only renders.
 */
export function Leaderboard({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-lg font-bold">Darts leaderboard</h1>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Player</th>
              <th className="p-3 font-medium">Record</th>
              <th className="p-3 font-medium">Win %</th>
              <th className="p-3 font-medium">Avg</th>
              <th className="p-3 font-medium">Best avg</th>
              <th className="p-3 font-medium">Highest checkout</th>
              <th className="p-3 font-medium">Highest turn</th>
              <th className="p-3 font-medium">Best leg</th>
              <th className="p-3 font-medium">180s</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.memberId} className="border-b border-border last:border-0">
                <td className="flex items-center gap-2 p-3 font-medium">
                  <span
                    aria-hidden
                    className={cn("size-2.5 rounded-full", ACCENT_BG[row.accent])}
                  />
                  {row.label}
                </td>
                <td className="p-3 tabular-nums">
                  {row.record.wins}–{row.record.losses}
                </td>
                <td className="p-3 tabular-nums">
                  {Math.round(row.record.winPct * 100)}%
                </td>
                <td className="p-3 tabular-nums">
                  {round(row.record.threeDartAverage)}
                </td>
                <td className="p-3 tabular-nums">
                  {round(row.record.bestGameAverage)}
                </td>
                <td className="p-3 tabular-nums">{row.record.highestCheckout}</td>
                <td className="p-3 tabular-nums">{row.record.highestTurn}</td>
                <td className="p-3 tabular-nums">{row.record.bestLeg ?? "—"}</td>
                <td className="p-3 tabular-nums">{row.record.count180}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-muted-foreground">
          Head-to-head
        </h2>
        <ul className="flex flex-col gap-2">
          {rows
            .filter((row) => row.headToHead.length > 0)
            .map((row) => (
              <li
                key={row.memberId}
                className="rounded-lg border border-border bg-card p-3"
              >
                <p className="text-sm font-medium">{row.label}</p>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {row.headToHead.map((h2h) => (
                    <li
                      key={h2h.opponentMemberId}
                      className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      vs {h2h.opponentLabel} {h2h.wins}–{h2h.losses}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          {rows.every((row) => row.headToHead.length === 0) && (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No member-vs-member games yet.
            </p>
          )}
        </ul>
      </div>
    </div>
  );
}
