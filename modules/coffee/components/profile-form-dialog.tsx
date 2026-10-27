"use client";

import { Pencil, Plus } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
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
import {
  createGrindProfileAction,
  updateGrindProfileAction,
} from "@/modules/coffee/actions";
import { GRIND_SIZE_MAX } from "@/modules/coffee/lib/validation";
import type { CoffeeGrindProfileRow } from "@/modules/coffee/queries";

/** Add profile (no `profile`) or Edit profile (with `profile`) in a dialog. */
export function ProfileFormDialog({
  beanId,
  profile,
}: {
  beanId: string;
  profile?: CoffeeGrindProfileRow;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          profile ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${profile.label}`}
            >
              <Pencil aria-hidden />
            </Button>
          ) : (
            <Button variant="outline" size="sm">
              <Plus data-icon="inline-start" />
              Add profile
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{profile ? "Edit profile" : "Add profile"}</DialogTitle>
        </DialogHeader>
        <ProfileForm
          beanId={beanId}
          profile={profile}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </DialogRoot>
  );
}

// Rendered only while the dialog is open, so its state resets on each open.
function ProfileForm({
  beanId,
  profile,
  onDone,
}: {
  beanId: string;
  profile?: CoffeeGrindProfileRow;
  onDone: () => void;
}) {
  const labelId = useId();
  const sizeId = useId();
  const descriptionId = useId();

  const [label, setLabel] = useState(profile?.label ?? "");
  const [grindSize, setGrindSize] = useState(
    profile ? String(profile.grind_size) : "",
  );
  const [description, setDescription] = useState(profile?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const fields = { label, grindSize, description };
        const result = profile
          ? await updateGrindProfileAction(beanId, profile.id, fields)
          : await createGrindProfileAction(beanId, fields);
        if (result.error !== undefined) {
          setError(result.error);
          return;
        }
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={labelId}>Label</Label>
        <Input
          id={labelId}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Espresso"
          autoFocus
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={sizeId}>Grind size (0–{GRIND_SIZE_MAX})</Label>
        <Input
          id={sizeId}
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          max={GRIND_SIZE_MAX}
          value={grindSize}
          onChange={(e) => setGrindSize(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={descriptionId}>Description</Label>
        <Input
          id={descriptionId}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button
          type="submit"
          disabled={pending || label.trim() === "" || grindSize.trim() === ""}
        >
          {profile ? "Save" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  );
}
