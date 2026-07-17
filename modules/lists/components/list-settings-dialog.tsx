"use client";

import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ACCENT_BG } from "@/lib/accent";
import { cn } from "@/lib/utils";
import {
  addParticipantAction,
  archiveListAction,
  changeListScopeAction,
  deleteListAction,
  removeParticipantAction,
  renameListAction,
  unarchiveListAction,
} from "@/modules/lists/actions";

import type {
  ListRow,
  ParticipantRow,
  ProfileRow,
  Scope,
} from "@/modules/lists/queries";

/**
 * Owner-only list settings (lists.md §2): rename, change scope, manage
 * participants, archive/unarchive, and delete. Every write here still rides
 * RLS's owner-only policy on `lists_list`/`lists_participant` — this dialog
 * simply isn't rendered for a non-owner (`list-detail.tsx` gates it).
 */
export function ListSettingsDialog({
  list,
  participants,
  candidates,
}: {
  list: ListRow;
  participants: ParticipantRow[];
  candidates: ProfileRow[];
}) {
  const router = useRouter();
  const titleId = useId();
  const scopeId = useId();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const participantIds = new Set(participants.map((p) => p.member_id));

  function saveTitle() {
    if (title.trim() === list.title || title.trim().length === 0) return;
    startTransition(async () => {
      try {
        await renameListAction(list.id, title);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function handleScopeChange(scope: Scope) {
    startTransition(async () => {
      await changeListScopeAction(list.id, scope);
    });
  }

  function toggleParticipant(memberId: string, checked: boolean) {
    startTransition(async () => {
      if (checked) {
        await addParticipantAction(list.id, memberId);
      } else {
        await removeParticipantAction(list.id, memberId);
      }
    });
  }

  function handleArchiveToggle() {
    startTransition(async () => {
      if (list.archived_at) {
        await unarchiveListAction(list.id);
      } else {
        await archiveListAction(list.id);
      }
      setOpen(false);
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${list.title}"? This can't be undone.`)) {
      return;
    }
    startTransition(async () => {
      await deleteListAction(list.id);
      router.push("/lists");
    });
  }

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="icon" aria-label="List settings">
            <Settings />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>List settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={titleId}>Title</Label>
            <Input
              id={titleId}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={saveTitle}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={scopeId}>Scope</Label>
            <Select
              id={scopeId}
              value={list.scope}
              onChange={(event) =>
                handleScopeChange(event.target.value as Scope)
              }
            >
              <option value="private">Private</option>
              <option value="participants">Participants</option>
              <option value="family">Family</option>
            </Select>
          </div>

          {list.scope === "participants" && (
            <div className="flex flex-col gap-1.5">
              <Label>Participants</Label>
              {candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No other members to add.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {candidates.map((profile) => (
                    <li key={profile.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`participant-${profile.id}`}
                        checked={participantIds.has(profile.id)}
                        onCheckedChange={(checked) =>
                          toggleParticipant(profile.id, checked)
                        }
                      />
                      <label
                        htmlFor={`participant-${profile.id}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "size-3 rounded-full",
                            ACCENT_BG[profile.accent],
                          )}
                        />
                        {profile.id.slice(0, 8)}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="justify-between sm:justify-between">
            <Button
              variant="destructive"
              disabled={pending}
              onClick={handleDelete}
            >
              Delete
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={handleArchiveToggle}
            >
              {list.archived_at ? "Unarchive" : "Archive"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
