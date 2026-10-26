"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { BagPhoto } from "./bag-photo";
import { SendButton } from "./send-button";

import type { VariantProps } from "./coffee-prototype";

/** B: dense list, inline accordion, profile chips, persistent machine bar. */
export function VariantB({ beans, machine, onConnect, onSend }: VariantProps) {
  const [openId, setOpenId] = useState<string | null>(beans[0]?.id ?? null);
  const [pick, setPick] = useState<{ bean: string; profile: string } | null>(
    null,
  );
  const bean = beans.find((b) => b.id === pick?.bean);
  const profile = bean?.profiles.find((p) => p.id === pick?.profile);

  return (
    <div className="pb-64">
      <ul className="divide-y rounded-xl border">
        {beans.map((b) => {
          const open = openId === b.id;
          return (
            <li
              key={b.id}
              className="bg-card first:rounded-t-xl last:rounded-b-xl"
            >
              <button
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : b.id)}
                className="flex w-full items-center gap-3 p-3 text-left"
              >
                <BagPhoto bean={b} className="w-10 shrink-0 rounded" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{b.name}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {b.origin} · {b.roast}
                  </span>
                </span>
                <span className="text-muted-foreground text-xs">
                  {b.profiles.length}
                </span>
                <ChevronDown
                  className={`size-4 transition ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open && (
                <div className="flex flex-col gap-3 px-3 pb-3">
                  <p className="text-sm">{b.notes}</p>
                  <div className="flex flex-wrap gap-2">
                    {b.profiles.length === 0 && (
                      <span className="text-muted-foreground text-sm">
                        No grind profiles yet.
                      </span>
                    )}
                    {b.profiles.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPick({ bean: b.id, profile: p.id })}
                        className={`rounded-full border px-3 py-1.5 text-sm ${
                          pick?.profile === p.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : ""
                        }`}
                      >
                        {p.label} ·{" "}
                        <span className="tabular-nums">
                          {p.grindSize.toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                  {pick?.bean === b.id && profile && (
                    <p className="text-muted-foreground text-xs">
                      {profile.description}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="bg-background fixed inset-x-0 bottom-0 z-30 border-t p-4 pb-28">
        <p className="mb-1 truncate text-sm font-medium">
          {profile && bean
            ? `${bean.name} — ${profile.label}`
            : "Pick a grind profile"}
        </p>
        <SendButton
          state={machine}
          label={profile ? profile.grindSize.toFixed(2) : ""}
          disabled={!profile}
          onConnect={onConnect}
          onSend={onSend}
        />
      </div>
    </div>
  );
}
