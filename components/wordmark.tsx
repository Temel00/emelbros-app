import { cn } from "@/lib/utils";

/**
 * The four brights cycling across the live-text wordmark — one lockup shared
 * by the sign-in page and the app header (#68), so the front door and the
 * signed-in shell agree.
 *
 * These are the *fill* tokens. #69 ruled the brights are fills only and a
 * parallel ink tier carries text, but the ink tokens do not exist yet (#73), so
 * this cycles fills in the meantime and carries a known defect: yellow is
 * 1.33:1 on the light ground, landing on the `m` and `r`. Move this to the ink
 * tier when #73 lands.
 */
const WORDMARK_CYCLE = [
  "text-c-pink",
  "text-c-yellow",
  "text-c-green",
  "text-c-blue",
] as const;

/** Size and layout come from the caller; the lockup itself is fixed. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Emelbros"
      className={cn("font-brand", className)}
    >
      {"emelbros".split("").map((letter, i) => (
        <span key={i} aria-hidden className={WORDMARK_CYCLE[i % 4]}>
          {letter}
        </span>
      ))}
    </span>
  );
}
