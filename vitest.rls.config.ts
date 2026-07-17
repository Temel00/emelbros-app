import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = dirname(fileURLToPath(import.meta.url));

/**
 * RLS integration suite (#13): runs `*.rls.test.ts` only, against a live
 * local Supabase stack (`supabase start`). Kept out of `vitest.config.ts`'s
 * default run.
 */
export default defineConfig({
  resolve: {
    alias: { "@": root },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.rls.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**"],
  },
});
