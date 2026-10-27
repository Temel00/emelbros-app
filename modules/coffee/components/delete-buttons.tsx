"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  deleteBeanAction,
  deleteGrindProfileAction,
} from "@/modules/coffee/actions";

function useDelete(run: () => Promise<void>) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    startTransition(async () => {
      try {
        await run();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return { pending, error, start };
}

/** Deletes a bean after confirming; its profiles are deleted with it. */
export function DeleteBeanButton({
  beanId,
  name,
}: {
  beanId: string;
  name: string;
}) {
  const router = useRouter();
  const { pending, error, start } = useDelete(async () => {
    await deleteBeanAction(beanId);
    router.push("/coffee");
  });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (
            confirm(`Delete "${name}"? Its grind profiles will be deleted too.`)
          ) {
            start();
          }
        }}
      >
        <Trash2 data-icon="inline-start" />
        Delete
      </Button>
      {error && (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      )}
    </>
  );
}

export function DeleteProfileButton({
  beanId,
  profileId,
  label,
}: {
  beanId: string;
  profileId: string;
  label: string;
}) {
  const { pending, error, start } = useDelete(() =>
    deleteGrindProfileAction(beanId, profileId),
  );

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${label}`}
        disabled={pending}
        onClick={() => {
          if (confirm(`Delete the "${label}" profile?`)) start();
        }}
      >
        <Trash2 aria-hidden />
      </Button>
      {error && (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      )}
    </>
  );
}
