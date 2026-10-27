import type { ToolManifest } from "@/modules/dev-tools/lib/tool-manifest";

export const bluetoothSerialManifest = {
  slug: "bluetooth-serial",
  name: "Bluetooth Serial",
  description: "Connect to a serial device and send and read raw text.",
  icon: "Bluetooth",
} satisfies ToolManifest;
