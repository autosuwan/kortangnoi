import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

// integration test กับ Supabase ในเครื่อง — รันผ่าน `npm run test:int`
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "server-only": new URL("./test/server-only-stub.ts", import.meta.url)
        .pathname,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
