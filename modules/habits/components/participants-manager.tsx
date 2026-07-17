"use client";

import { X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  addParticipantAction,
  removeParticipantAction,
} from "@/modules/habits/actions";

/**
 * Manages a Participants-scope trackable's viewer list (docs/modules/
 * habits.md §2, §5). The platform has no member directory yet (no email/
 * name is queryable across members), so a participant is added by member
 * id rather than a picker — a stopgap until that platform piece exists.
 */
export function ParticipantsManager({
  trackableId,
  participants,
}: {
  trackableId: string;
  participants: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [memberId, setMemberId] = useState("");

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-2">
      <p className="text-xs text-muted-foreground">
        Participants (viewer-only)
      </p>

      {participants.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {participants.map((id) => (
            <li
              key={id}
              className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"
            >
              {id.slice(0, 8)}…
              <button
                type="button"
                aria-label={`Remove participant ${id}`}
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await removeParticipantAction(trackableId, id);
                  })
                }
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          placeholder="Member id"
          className="h-7 flex-1 rounded-lg border border-border bg-background px-2 text-xs"
          aria-label="Participant member id"
        />
        <Button
          type="button"
          size="xs"
          disabled={isPending || memberId.trim() === ""}
          onClick={() =>
            startTransition(async () => {
              await addParticipantAction(trackableId, memberId.trim());
              setMemberId("");
            })
          }
        >
          Add
        </Button>
      </div>
    </div>
  );
}
