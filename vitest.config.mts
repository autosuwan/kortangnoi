import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      "server-only": new URL("./test/server-only-stub.ts", import.meta.url)
        .pathname,
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/**/*.int.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
