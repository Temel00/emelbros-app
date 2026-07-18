"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteGameAction } from "@/modules/darts/actions";

/**
 * Deletes a completed game (darts.md §6): allowed for the owner or any
 * member who played, removing it from both records. Hard delete with no
 * undo, so a native confirm is the one guard against a mis-tap — the spec's
 * "no confirmation step" is about game completion, not this destructive
 * button.
 */
export function DeleteGameButton({
  gameId,
  onDeleted,
}: {
  gameId: string;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Delete this game? This can't be undone.")) return;

        startTransition(async () => {
          await deleteGameAction(gameId);
          onDeleted();
        });
      }}
    >
      Delete game
    </Button>
  );
}
