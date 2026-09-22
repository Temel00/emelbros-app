"use client";
// PROTOTYPE: Input style variants — round 2
// Route: /nutrition/prototype/input-styles?variant=C|D|E
// Throwaway. Do not promote to main.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

export type Variant = "C" | "D" | "E";

export function InputStyleVariants({ variant }: { variant: Variant }) {
  if (variant === "D") return <VariantD />;
  if (variant === "E") return <VariantE />;
  return <VariantC />;
}

// ── Variant C: Rounded Soft (updated — inline ▲▼ arrows, custom select) ─────

function VariantC() {
  const [qty, setQty] = useState("2");
  const [mQty, setMQty] = useState("1");
  const [unit, setUnit] = useState("g");
  const [mUnit, setMUnit] = useState("each");
  const [loc, setLoc] = useState("Fridge");

  const inp =
    "h-10 w-full rounded-2xl border-0 bg-secondary px-4 text-sm placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30 transition-all";

  return (
    <div className="flex flex-col gap-8">
      <Badge>C — Rounded Soft</Badge>
      <Blurb>
        Pill-shaped fields with a soft secondary fill. Inline stacked ▲▼ arrows
        replace native spin buttons. The select opens a rounded floating panel.
      </Blurb>

      <Subhead>On page</Subhead>
      <Field label="Recipe title" id="c-title" bold>
        <input id="c-title" placeholder="Weeknight garlic pasta" className={inp} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity" bold>
          <SpinnerInput value={qty} onChange={setQty} theme="pill" />
        </Field>
        <Field label="Unit" bold>
          <RoundedSelect value={unit} onChange={setUnit}
            options={["g", "ml", "each", "tsp", "tbsp"]} theme="pill" />
        </Field>
      </div>
      <Field label="Notes" id="c-notes" bold>
        <textarea id="c-notes" rows={3} placeholder="Any prep notes…"
          className={cn(inp, "h-auto py-3 resize-none rounded-2xl")} />
      </Field>

      <Subhead>In a modal</Subhead>
      <ModalCard title="Add to shopping list">
        <Field label="Item name" bold>
          <input placeholder="e.g. Garlic" className={inp} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Qty" bold>
            <SpinnerInput value={mQty} onChange={setMQty} theme="pill" />
          </Field>
          <Field label="Unit" bold>
            <RoundedSelect value={mUnit} onChange={setMUnit}
              options={["each", "g", "ml"]} theme="pill" />
          </Field>
        </div>
        <Field label="Location" bold>
          <RoundedSelect value={loc} onChange={setLoc}
            options={["Fridge", "Pantry", "Freezer"]} theme="pill" />
        </Field>
        <ModalActions />
      </ModalCard>
    </div>
  );
}

// ── Variant D: Sharp Outline ─────────────────────────────────────────────────
// No fill at rest. Bold 2-px border snaps to primary pink on focus.
// Clean, high-contrast, professional look — opposite end from C.

function VariantD() {
  const [qty, setQty] = useState("2");
  const [mQty, setMQty] = useState("1");
  const [unit, setUnit] = useState("g");
  const [mUnit, setMUnit] = useState("each");
  const [loc, setLoc] = useState("Fridge");

  const inp =
    "h-9 w-full rounded-lg border-2 border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground outline-none focus-visible:border-primary transition-colors";

  return (
    <div className="flex flex-col gap-8">
      <Badge>D — Sharp Outline</Badge>
      <Blurb>
        No fill — just a bold 2-px border that snaps to primary pink on focus.
        Square-ish corners, zero background. The arrow column mirrors the border
        weight; the select panel stays crisp and bordered.
      </Blurb>

      <Subhead>On page</Subhead>
      <Field label="Recipe title" id="d-title">
        <input id="d-title" placeholder="Weeknight garlic pasta" className={inp} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity">
          <SpinnerInput value={qty} onChange={setQty} theme="outline" />
        </Field>
        <Field label="Unit">
          <RoundedSelect value={unit} onChange={setUnit}
            options={["g", "ml", "each", "tsp", "tbsp"]} theme="outline" />
        </Field>
      </div>
      <Field label="Notes" id="d-notes">
        <textarea id="d-notes" rows={3} placeholder="Any prep notes…"
          className={cn(inp, "h-auto py-2 resize-none")} />
      </Field>

      <Subhead>In a modal</Subhead>
      <ModalCard title="Add to shopping list">
        <Field label="Item name">
          <input placeholder="e.g. Garlic" className={inp} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Qty">
            <SpinnerInput value={mQty} onChange={setMQty} theme="outline" />
          </Field>
          <Field label="Unit">
            <RoundedSelect value={mUnit} onChange={setMUnit}
              options={["each", "g", "ml"]} theme="outline" />
          </Field>
        </div>
        <Field label="Location">
          <RoundedSelect value={loc} onChange={setLoc}
            options={["Fridge", "Pantry", "Freezer"]} theme="outline" />
        </Field>
        <ModalActions accent />
      </ModalCard>
    </div>
  );
}

// ── Variant E: Deep Fill ─────────────────────────────────────────────────────
// Tall, roomy fields (h-12) with heavy muted fill. All-caps micro-labels.
// Feels more like a native mobile form — chunky and direct.

function VariantE() {
  const [qty, setQty] = useState("2");
  const [mQty, setMQty] = useState("1");
  const [unit, setUnit] = useState("g");
  const [mUnit, setMUnit] = useState("each");
  const [loc, setLoc] = useState("Fridge");

  const inp =
    "h-12 w-full rounded-xl bg-muted px-4 text-sm font-medium placeholder:text-muted-foreground placeholder:font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring/25 transition-all";

  return (
    <div className="flex flex-col gap-8">
      <Badge>E — Deep Fill</Badge>
      <Blurb>
        Tall 48-px fields with a muted fill and no border. All-caps micro-labels
        above. Heavier weight — closer to a native mobile form. Arrows and select
        panel share the same fill depth.
      </Blurb>

      <Subhead>On page</Subhead>
      <Field label="Recipe title" id="e-title" micro>
        <input id="e-title" placeholder="Weeknight garlic pasta" className={inp} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity" micro>
          <SpinnerInput value={qty} onChange={setQty} theme="fill" />
        </Field>
        <Field label="Unit" micro>
          <RoundedSelect value={unit} onChange={setUnit}
            options={["g", "ml", "each", "tsp", "tbsp"]} theme="fill" />
        </Field>
      </div>
      <Field label="Notes" id="e-notes" micro>
        <textarea id="e-notes" rows={3} placeholder="Any prep notes…"
          className={cn(inp, "h-auto py-3 resize-none")} />
      </Field>

      <Subhead>In a modal</Subhead>
      <ModalCard title="Add to shopping list">
        <Field label="Item name" micro>
          <input placeholder="e.g. Garlic" className={inp} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Qty" micro>
            <SpinnerInput value={mQty} onChange={setMQty} theme="fill" />
          </Field>
          <Field label="Unit" micro>
            <RoundedSelect value={mUnit} onChange={setMUnit}
              options={["each", "g", "ml"]} theme="fill" />
          </Field>
        </div>
        <Field label="Location" micro>
          <RoundedSelect value={loc} onChange={setLoc}
            options={["Fridge", "Pantry", "Freezer"]} theme="fill" />
        </Field>
        <ModalActions />
      </ModalCard>
    </div>
  );
}

// ── SpinnerInput ──────────────────────────────────────────────────────────────
// Number input with custom stacked ▲▼ buttons inside the field boundary.
// [appearance:textfield] hides native spin buttons across browsers.

type SpinnerTheme = "pill" | "outline" | "fill";

const SPINNER: Record<SpinnerTheme, {
  wrap: string; input: string; col: string; btn: string; divider: string;
}> = {
  pill: {
    wrap: "flex items-stretch rounded-2xl overflow-hidden bg-secondary",
    input:
      "h-10 flex-1 min-w-0 bg-transparent px-4 text-sm no-spinners outline-none focus-visible:ring-2 focus-visible:ring-ring/30 transition-all",
    col: "flex flex-col border-l border-border/40",
    btn: "flex flex-1 items-center justify-center w-8 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-colors",
    divider: "border-t border-border/40",
  },
  outline: {
    wrap: "flex items-stretch rounded-lg border-2 border-input overflow-hidden focus-within:border-primary transition-colors",
    input:
      "h-9 flex-1 min-w-0 bg-transparent px-3 text-sm no-spinners outline-none",
    col: "flex flex-col border-l-2 border-input",
    btn: "flex flex-1 items-center justify-center w-8 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
    divider: "border-t-2 border-input",
  },
  fill: {
    wrap: "flex items-stretch rounded-xl overflow-hidden bg-muted",
    input:
      "h-12 flex-1 min-w-0 bg-transparent px-4 text-sm font-medium no-spinners outline-none",
    col: "flex flex-col border-l border-border/50",
    btn: "flex flex-1 items-center justify-center w-10 text-muted-foreground hover:bg-border/60 hover:text-foreground transition-colors",
    divider: "border-t border-border/50",
  },
};

function SpinnerInput({
  value,
  onChange,
  min = 0,
  theme,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: number;
  theme: SpinnerTheme;
}) {
  const s = SPINNER[theme];
  const n = parseFloat(value) || 0;
  return (
    <div className={s.wrap}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        className={s.input}
        aria-label="Quantity"
      />
      <div className={s.col}>
        <button
          type="button"
          aria-label="Increase"
          onClick={() => onChange(String(n + 1))}
          className={s.btn}
        >
          <ChevronUp className="size-3" />
        </button>
        <button
          type="button"
          aria-label="Decrease"
          onClick={() => onChange(String(Math.max(min, n - 1)))}
          className={cn(s.btn, s.divider)}
        >
          <ChevronDown className="size-3" />
        </button>
      </div>
    </div>
  );
}

// ── RoundedSelect ─────────────────────────────────────────────────────────────
// Custom select with a rounded floating panel instead of the OS default.

type SelectTheme = "pill" | "outline" | "fill";

const SELECT: Record<SelectTheme, {
  trigger: string; popup: string; item: string;
}> = {
  pill: {
    trigger:
      "h-10 w-full rounded-2xl bg-secondary px-4 text-sm flex items-center justify-between gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/30 transition-all",
    popup: "rounded-2xl",
    item: "px-4 py-2 text-sm",
  },
  outline: {
    trigger:
      "h-9 w-full rounded-lg border-2 border-input bg-transparent px-3 text-sm flex items-center justify-between gap-2 outline-none focus-visible:border-primary transition-colors",
    popup: "rounded-lg",
    item: "px-3 py-1.5 text-sm",
  },
  fill: {
    trigger:
      "h-12 w-full rounded-xl bg-muted px-4 text-sm font-medium flex items-center justify-between gap-2 outline-none",
    popup: "rounded-xl",
    item: "px-4 py-2.5 text-sm",
  },
};

function RoundedSelect({
  value,
  onChange,
  options,
  theme,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  theme: SelectTheme;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const s = SELECT[theme];

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={s.trigger}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{value}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden border border-border bg-card shadow-lg",
            s.popup,
          )}
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className={cn(
                "w-full text-left transition-colors hover:bg-muted",
                s.item,
                opt === value && "font-medium text-primary",
              )}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
      {children}
    </span>
  );
}

function Blurb({ children }: { children: ReactNode }) {
  return <p className="-mt-5 text-sm text-muted-foreground">{children}</p>;
}

function Subhead({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

function Field({
  label,
  id,
  children,
  bold = false,
  micro = false,
}: {
  label: string;
  id?: string;
  children: ReactNode;
  bold?: boolean;
  micro?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={cn(
          micro
            ? "text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            : bold
              ? "text-sm font-semibold"
              : "text-sm font-medium",
        )}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ModalCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-lg shadow-black/5">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function ModalActions({ accent = false }: { accent?: boolean }) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button
        type="button"
        className="rounded-lg px-4 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
      >
        Cancel
      </button>
      <button
        type="button"
        className={cn(
          "rounded-lg px-4 py-1.5 text-sm font-semibold",
          accent
            ? "border-2 border-primary text-primary hover:bg-primary/5"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
      >
        Add
      </button>
    </div>
  );
}

// ── Prototype switcher bar ────────────────────────────────────────────────────

const LABELS: Record<string, string> = {
  C: "Rounded Soft",
  D: "Sharp Outline",
  E: "Deep Fill",
};
const VARIANTS: Variant[] = ["C", "D", "E"];

export function PrototypeSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const idx = VARIANTS.indexOf(current as Variant);

  const go = useCallback(
    (dir: 1 | -1) => {
      const next = VARIANTS[(idx + dir + VARIANTS.length) % VARIANTS.length];
      router.replace(`${pathname}?variant=${next}`);
    },
    [idx, pathname, router],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.isContentEditable
      )
        return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full bg-foreground/90 px-1 py-1 shadow-xl backdrop-blur-sm">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous variant"
          className="flex size-8 items-center justify-center rounded-full text-background hover:bg-background/15"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-[160px] text-center text-sm font-medium text-background">
          {current} — {LABELS[current] ?? current}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next variant"
          className="flex size-8 items-center justify-center rounded-full text-background hover:bg-background/15"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
