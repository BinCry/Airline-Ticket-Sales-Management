import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { transformWithEsbuild } from "vite";

const transformTsxForTests = {
  name: "transform-tsx-for-tests",
  enforce: "pre" as const,
  async transform(code: string, id: string) {
    if (!id.includes("/src/") || !id.endsWith(".tsx")) {
      return null;
    }

    return transformWithEsbuild(code, id, {
      loader: "tsx",
      jsx: "automatic",
      sourcemap: true
    });
  }
};

export default defineConfig({
  plugins: [transformTsxForTests, react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@qlvmb/shared-types": fileURLToPath(
        new URL("../../packages/shared-types/src/index.ts", import.meta.url)
      )
    }
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"]
  }
});
