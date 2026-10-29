import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["server/tests/**/*.test.js"],
    fileParallelism: false,
    hookTimeout: 120000,
    testTimeout: 30000,
  },
});
