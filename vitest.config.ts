import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // Mirror the `@/*` path alias from tsconfig.json so tests import the same way as the app.
    alias: { "@": root },
  },
  test: {
    // Pure-logic unit tests, co-located beside the code they cover (#13).
    environment: "node",
    globals: true,
    include: ["**/*.test.{ts,tsx}"],
    // RLS integration tests run against a live Supabase stack in a separate
    // suite (#13); they are kept out of the default runner.
    exclude: ["**/node_modules/**", "**/.next/**", "**/*.rls.test.{ts,tsx}"],
  },
});
