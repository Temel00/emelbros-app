"use client";

import type { ReactNode } from "react";

export type DiffOptions = {
  lineHighlight: boolean;
  charHighlight: boolean;
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
};

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4"
      />
      {label}
    </label>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-xs font-semibold tracking-wide uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

/** How many ignore toggles are on, for the closed-drawer hint. */
export function ignoreCount(o: DiffOptions): number {
  return Number(o.ignoreWhitespace) + Number(o.ignoreCase);
}

export function OptionsDrawer({
  id,
  options,
  onChange,
}: {
  id: string;
  options: DiffOptions;
  onChange: (next: DiffOptions) => void;
}) {
  const set = (patch: Partial<DiffOptions>) =>
    onChange({ ...options, ...patch });
  return (
    <div
      id={id}
      className="flex flex-col gap-4 rounded-lg border-2 border-input p-3 sm:w-48 sm:shrink-0"
    >
      <Group title="Highlight">
        <Check
          label="Line"
          checked={options.lineHighlight}
          onChange={(v) => set({ lineHighlight: v })}
        />
        <Check
          label="Character"
          checked={options.charHighlight}
          onChange={(v) => set({ charHighlight: v })}
        />
      </Group>
      <Group title="Ignore">
        <Check
          label="Whitespace"
          checked={options.ignoreWhitespace}
          onChange={(v) => set({ ignoreWhitespace: v })}
        />
        <Check
          label="Case"
          checked={options.ignoreCase}
          onChange={(v) => set({ ignoreCase: v })}
        />
      </Group>
    </div>
  );
}
