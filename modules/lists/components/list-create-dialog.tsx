"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { listKinds } from "@/modules/lists/kinds";
import { createListAction } from "@/modules/lists/actions";
import { SCOPE_OPTIONS } from "@/modules/lists/components/scope-options";

import type { Scope } from "@/modules/lists/queries";

/**
 * The lists module home's "New list" entry point (lists.md §4, §8): title,
 * kind, and scope are all chosen at creation; kind and scope may be changed
 * later by the owner from the list's settings.
 */
export function ListCreateDialog() {
  const router = useRouter();
  const titleId = useId();
  const kindId = useId();
  const scopeId = useId();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState(listKinds()[0].key);
  const [scope, setScope] = useState<Scope>("private");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const list = await createListAction({ title, kind, scope });
        setOpen(false);
        setTitle("");
        setKind(listKinds()[0].key);
        setScope("private");
        router.push(`/lists/${list.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus data-icon="inline-start" />
            New list
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New list</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={titleId}>Title</Label>
            <Input
              id={titleId}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Weekly groceries"
              autoFocus
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={kindId}>Kind</Label>
            <Select
              id={kindId}
              value={kind}
              onChange={(event) => setKind(event.target.value)}
            >
              {listKinds().map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={scopeId}>Scope</Label>
            <Select
              id={scopeId}
              value={scope}
              onChange={(event) => setScope(event.target.value as Scope)}
            >
              {SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="submit"
              disabled={pending || title.trim().length === 0}
            >
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
