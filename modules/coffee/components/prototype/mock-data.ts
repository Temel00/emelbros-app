// PROTOTYPE (#223) — throwaway. Mock data, no Supabase.
export type MockProfile = {
  id: string;
  label: string;
  description: string;
  grindSize: number;
};
export type MockBean = {
  id: string;
  name: string;
  roaster: string;
  origin: string;
  roast: "light" | "medium-light" | "medium" | "medium-dark" | "dark";
  notes: string;
  hue: number;
  profiles: MockProfile[];
};

export const BEANS: MockBean[] = [
  {
    id: "a",
    name: "Morning Lantern",
    roaster: "Lantern & Co.",
    origin: "Ethiopia, Guji",
    roast: "light",
    notes: "Blueberry, jasmine, bright finish. Rest 10 days.",
    hue: 28,
    profiles: [
      {
        id: "a1",
        label: "Espresso",
        description: "Sweet, syrupy, 30g out",
        grindSize: 12.5,
      },
      {
        id: "a2",
        label: "V60",
        description: "Clean and floral",
        grindSize: 48,
      },
      {
        id: "a3",
        label: "French press",
        description: "Rounder, heavier body",
        grindSize: 74.25,
      },
    ],
  },
  {
    id: "b",
    name: "Fieldstone Reserve",
    roaster: "Fieldstone Roasters",
    origin: "Colombia, Huila",
    roast: "medium-dark",
    notes: "Dark chocolate, toasted almond.",
    hue: 12,
    profiles: [
      {
        id: "b1",
        label: "Moka pot",
        description: "Strong, low acidity",
        grindSize: 30,
      },
      { id: "b2", label: "Drip", description: "Everyday pot", grindSize: 55 },
    ],
  },
  {
    id: "c",
    name: "Porch Light Decaf",
    roaster: "Lantern & Co.",
    origin: "Peru, Cajamarca",
    roast: "medium",
    notes: "Caramel, red apple. Swiss-water process.",
    hue: 40,
    profiles: [
      {
        id: "c1",
        label: "Drip",
        description: "Mellow evening cup",
        grindSize: 52,
      },
    ],
  },
  {
    id: "d",
    name: "Harbor Dark",
    roaster: "Tidewater",
    origin: "Sumatra, Gayo",
    roast: "dark",
    notes:
      "Smoky, cedar, low acid. A bag with a very long name to test wrapping.",
    hue: 8,
    profiles: [],
  },
];

export type MachineState =
  "unsupported" | "disconnected" | "connected" | "sending" | "sent" | "failed";
