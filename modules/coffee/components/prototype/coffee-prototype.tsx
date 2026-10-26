"use client";

// PROTOTYPE (#223) — throwaway. Three variants of the Coffee UI on /coffee,
// switched with ?variant=A|B|C (arrow keys too). Mock data, simulated machine.
import { useEffect, useRef, useState } from "react";

import { BEANS, type MachineState, type MockBean } from "./mock-data";
import { PrototypeSwitcher } from "./switcher";
import { VariantA } from "./variant-a";
import { VariantB } from "./variant-b";
import { VariantC } from "./variant-c";

export type VariantProps = {
  beans: MockBean[];
  machine: MachineState;
  onConnect: () => void;
  onSend: () => void;
};

const NAMES: Record<string, string> = {
  A: "Photo grid + sheet",
  B: "Dense list + machine bar",
  C: "Swipe carousel + big readout",
};

export function CoffeePrototype({ variant }: { variant: string }) {
  const [machine, setMachine] = useState<MachineState>("connected");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const props: VariantProps = {
    beans: BEANS,
    machine,
    onConnect: () => setMachine("connected"),
    onSend: () => {
      setMachine("sending");
      timer.current = setTimeout(() => setMachine("sent"), 900);
    },
  };
  const key = variant in NAMES ? variant : "A";

  return (
    <>
      <h1 className="mb-4 text-lg font-bold">Coffee</h1>
      {key === "A" && <VariantA {...props} />}
      {key === "B" && <VariantB {...props} />}
      {key === "C" && <VariantC {...props} />}
      <PrototypeSwitcher
        variants={NAMES}
        current={key}
        machine={machine}
        onMachine={setMachine}
      />
    </>
  );
}
