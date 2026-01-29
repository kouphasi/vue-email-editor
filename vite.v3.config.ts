import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      vue: "vue3",
      "@vue/compiler-sfc": "@vue/compiler-sfc-vue3"
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests-vue3/**/*.{test,spec}.{ts,tsx,vue}"],
    setupFiles: "tests/setup-vue3.ts"
  }
});
