"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ACCENT_BG } from "@/lib/accent";
import { cn } from "@/lib/utils";
import { createGameAction } from "@/modules/darts/actions";

import type { ProfileRow } from "@/modules/darts/queries";

const GUEST_VALUE = "__guest__";

type PlayerChoice = { profileId: string; guestName: string };

function emptyChoice(defaultProfileId: string): PlayerChoice {
  return { profileId: defaultProfileId, guestName: "" };
}

/** Resolves a player picker's selection into the participant shape the action expects, or null if incomplete. */
function resolveParticipant(
  choice: PlayerChoice,
): { memberId: string } | { guestName: string } | null {
  if (choice.profileId === GUEST_VALUE) {
    const name = choice.guestName.trim();
    return name.length > 0 ? { guestName: name } : null;
  }
  return choice.profileId.length > 0 ? { memberId: choice.profileId } : null;
}

/**
 * New game setup (darts.md §3): variant, Player 1 & Player 2 (each a family
 * member or a typed guest name), and who starts. The signed-in member is
 * always recorded as the tracker/owner, whether or not they're playing.
 */
export function NewGameForm({ profiles }: { profiles: ProfileRow[] }) {
  const router = useRouter();
  const variantId = useId();
  const player1Id = useId();
  const player2Id = useId();

  const defaultProfileId = profiles[0]?.id ?? GUEST_VALUE;

  const [variant, setVariant] = useState<301 | 501>(501);
  const [player1, setPlayer1] = useState<PlayerChoice>(() =>
    emptyChoice(defaultProfileId),
  );
  const [player2, setPlayer2] = useState<PlayerChoice>(() =>
    emptyChoice(profiles[1]?.id ?? GUEST_VALUE),
  );
  const [startingSlot, setStartingSlot] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const resolved1 = resolveParticipant(player1);
  const resolved2 = resolveParticipant(player2);
  const sameMember =
    resolved1 &&
    resolved2 &&
    "memberId" in resolved1 &&
    "memberId" in resolved2 &&
    resolved1.memberId === resolved2.memberId;
  const canSubmit = resolved1 !== null && resolved2 !== null && !sameMember;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!resolved1 || !resolved2) return;
    if (sameMember) {
      setError("Player 1 and Player 2 must be different.");
      return;
    }

    startTransition(async () => {
      try {
        const { gameId } = await createGameAction({
          variant,
          player1: resolved1,
          player2: resolved2,
          startingSlot,
        });
        router.push(`/darts/${gameId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={variantId}>Variant</Label>
        <Select
          id={variantId}
          value={variant}
          onChange={(event) => setVariant(Number(event.target.value) as 301 | 501)}
        >
          <option value={501}>501</option>
          <option value={301}>301</option>
        </Select>
      </div>

      <PlayerPicker
        id={player1Id}
        label="Player 1"
        profiles={profiles}
        choice={player1}
        onChange={setPlayer1}
      />
      <PlayerPicker
        id={player2Id}
        label="Player 2"
        profiles={profiles}
        choice={player2}
        onChange={setPlayer2}
      />

      <div className="flex flex-col gap-1.5">
        <Label>Who starts?</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name="starting-slot"
              checked={startingSlot === 1}
              onChange={() => setStartingSlot(1)}
            />
            Player 1
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="radio"
              name="starting-slot"
              checked={startingSlot === 2}
              onChange={() => setStartingSlot(2)}
            />
            Player 2
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending || !canSubmit}>
        Start game
      </Button>
    </form>
  );
}

function PlayerPicker({
  id,
  label,
  profiles,
  choice,
  onChange,
}: {
  id: string;
  label: string;
  profiles: ProfileRow[];
  choice: PlayerChoice;
  onChange: (choice: PlayerChoice) => void;
}) {
  const profile = profiles.find((p) => p.id === choice.profileId);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        {profile && (
          <span
            aria-hidden
            className={cn("size-3 shrink-0 rounded-full", ACCENT_BG[profile.accent])}
          />
        )}
        <Select
          id={id}
          value={choice.profileId}
          onChange={(event) =>
            onChange({ ...choice, profileId: event.target.value })
          }
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id.slice(0, 8)}…
            </option>
          ))}
          <option value={GUEST_VALUE}>Guest…</option>
        </Select>
      </div>
      {choice.profileId === GUEST_VALUE && (
        <Input
          value={choice.guestName}
          onChange={(event) =>
            onChange({ ...choice, guestName: event.target.value })
          }
          placeholder="Guest name"
          aria-label={`${label} guest name`}
        />
      )}
    </div>
  );
}
