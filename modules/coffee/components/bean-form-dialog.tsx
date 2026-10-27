"use client";

import { useRouter } from "next/navigation";
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
import { Select } from "@/components/ui/select";
import { createBeanAction, updateBeanAction } from "@/modules/coffee/actions";
import { ROAST_LEVELS } from "@/modules/coffee/lib/validation";
import type { CoffeeBeanRow } from "@/modules/coffee/queries";

/** Add bean (no `bean`) or Edit bean (with `bean`) in a dialog. */
export function BeanFormDialog({ bean }: { bean?: CoffeeBeanRow }) {
  const [open, setOpen] = useState(false);
  const editing = bean !== undefined;

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          editing ? (
            <Button variant="outline" size="sm">
              <Pencil data-icon="inline-start" />
              Edit
            </Button>
          ) : (
            <Button size="sm">
              <Plus data-icon="inline-start" />
              Add bean
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit bean" : "Add bean"}</DialogTitle>
        </DialogHeader>
        <BeanForm bean={bean} onDone={() => setOpen(false)} />
      </DialogContent>
    </DialogRoot>
  );
}

// Rendered only while the dialog is open, so its state resets on each open.
function BeanForm({
  bean,
  onDone,
}: {
  bean?: CoffeeBeanRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const nameId = useId();
  const roasterId = useId();
  const originId = useId();
  const roastId = useId();
  const notesId = useId();

  const [name, setName] = useState(bean?.name ?? "");
  const [roaster, setRoaster] = useState(bean?.roaster ?? "");
  const [origin, setOrigin] = useState(bean?.origin ?? "");
  const [roastLevel, setRoastLevel] = useState(bean?.roast_level ?? "");
  const [notes, setNotes] = useState(bean?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const fields = { name, roaster, origin, notes, roastLevel };
        const result = bean
          ? await updateBeanAction(bean.id, fields)
          : await createBeanAction(fields);
        if (result.error !== undefined) {
          setError(result.error);
          return;
        }
        onDone();
        if (!bean && "id" in result && result.id) {
          router.push(`/coffee/${result.id}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={nameId}>Name</Label>
        <Input
          id={nameId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={roasterId}>Roaster</Label>
        <Input
          id={roasterId}
          value={roaster}
          onChange={(e) => setRoaster(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={originId}>Origin</Label>
        <Input
          id={originId}
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={roastId}>Roast level</Label>
        <Select
          id={roastId}
          value={roastLevel}
          onChange={(e) => setRoastLevel(e.target.value)}
        >
          <option value="">Not set</option>
          {ROAST_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={notesId}>Notes</Label>
        <textarea
          id={notesId}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border-2 border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="submit" disabled={pending || name.trim() === ""}>
          {bean ? "Save" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  );
}
