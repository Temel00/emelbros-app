"use client";

import { useState } from "react";

import { BagPhoto } from "./bag-photo";
import { SendButton } from "./send-button";

import type { VariantProps } from "./coffee-prototype";

/** C: one bean per screen, swipe carousel; grind size is a big readout. */
export function VariantC({ beans, machine, onConnect, onSend }: VariantProps) {
  const [picks, setPicks] = useState<Record<string, number>>({});
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-44">
      {beans.map((b) => {
        const idx = picks[b.id] ?? 0;
        const p = b.profiles[idx];
        return (
          <section
            key={b.id}
            className="bg-card w-[85%] max-w-sm shrink-0 snap-center overflow-hidden rounded-2xl border sm:w-80"
          >
            <div className="relative">
              <BagPhoto bean={b} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                <h2 className="text-xl font-bold">{b.name}</h2>
                <p className="text-xs opacity-80">
                  {b.roaster} · {b.origin} · {b.roast}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 p-4">
              <p className="text-sm">{b.notes}</p>
              {p ? (
                <>
                  <div className="text-center">
                    <p className="text-5xl font-bold tabular-nums">
                      {p.grindSize.toFixed(2)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      finer ◄ grind size ► coarser
                    </p>
                    <p className="mt-1 font-medium">{p.label}</p>
                    <p className="text-muted-foreground text-xs">
                      {p.description}
                    </p>
                  </div>
                  <div className="flex justify-center gap-2">
                    {b.profiles.map((q, i) => (
                      <button
                        key={q.id}
                        aria-label={q.label}
                        onClick={() => setPicks({ ...picks, [b.id]: i })}
                        className={`size-3 rounded-full ${
                          i === idx ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <SendButton
                    state={machine}
                    label={`${p.label} (${p.grindSize.toFixed(2)})`}
                    onConnect={onConnect}
                    onSend={onSend}
                  />
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No grind profiles yet.
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
