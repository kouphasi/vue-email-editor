import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import * as compiler from "@vue/compiler-sfc-vue3";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [vue({ compiler })],
  resolve: {
    alias: {
      vue: "vue3",
      "@vue/compiler-sfc": "@vue/compiler-sfc-vue3",
      "@vue/test-utils": fileURLToPath(new URL("./tests/test-utils-vue3-compat.ts", import.meta.url))
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "src/**/*.{test,spec}.{ts,tsx,vue}",
      "tests/**/*.{test,spec}.{ts,tsx,vue}"
    ],
    setupFiles: "tests/setup-vue3.ts",
    server: {
      deps: {
        inline: ["@vue/test-utils-vue3", "@vue/test-utils", "@vue/server-renderer"]
      }
    }
  }
});
