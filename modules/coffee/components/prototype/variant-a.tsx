"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { BagPhoto } from "./bag-photo";
import { SendButton } from "./send-button";

import type { VariantProps } from "./coffee-prototype";

/** A: photo-first 2-col card grid; tap opens a bottom sheet with profiles. */
export function VariantA({ beans, machine, onConnect, onSend }: VariantProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const bean = beans.find((b) => b.id === openId);
  const profile =
    bean?.profiles.find((p) => p.id === pick) ?? bean?.profiles[0];

  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {beans.map((b) => (
          <li key={b.id}>
            <button
              onClick={() => {
                setOpenId(b.id);
                setPick(null);
              }}
              className="bg-card w-full overflow-hidden rounded-xl border text-left"
            >
              <BagPhoto bean={b} />
              <div className="p-3">
                <p className="font-semibold">{b.name}</p>
                <p className="text-muted-foreground text-xs">
                  {b.roaster} · {b.origin}
                </p>
                <p className="mt-1 text-xs capitalize">{b.roast} roast</p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {bean && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-black/50"
          onClick={() => setOpenId(null)}
        >
          <div
            className="bg-background max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl p-4 pb-48"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{bean.name}</h2>
                <p className="text-muted-foreground text-sm">
                  {bean.roaster} · {bean.origin} · {bean.roast}
                </p>
              </div>
              <button aria-label="Close" onClick={() => setOpenId(null)}>
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-2 text-sm">{bean.notes}</p>
            <ul className="mt-4 flex flex-col gap-2">
              {bean.profiles.length === 0 && (
                <li className="text-muted-foreground text-sm">
                  No grind profiles yet.
                </li>
              )}
              {bean.profiles.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setPick(p.id)}
                    className={`flex w-full items-center justify-between rounded-lg border p-3 text-left ${
                      profile?.id === p.id ? "border-primary bg-primary/10" : ""
                    }`}
                  >
                    <span>
                      <span className="block font-medium">{p.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {p.description}
                      </span>
                    </span>
                    <span className="text-lg font-bold tabular-nums">
                      {p.grindSize.toFixed(2)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="bg-background fixed inset-x-0 bottom-0 border-t p-4 pb-28">
              <SendButton
                state={machine}
                label={
                  profile
                    ? `${profile.label} (${profile.grindSize.toFixed(2)})`
                    : ""
                }
                disabled={!profile}
                onConnect={onConnect}
                onSend={onSend}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
