import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import * as compiler from "@vue/compiler-sfc-vue3";

export default defineConfig({
  plugins: [vue({ compiler })],
  build: {
    target: "es2022",
    sourcemap: true,
    outDir: "dist/vue3",
    lib: {
      entry: "src/index.ts",
      name: "EmailEditor",
      formats: ["es", "iife"],
      fileName: (format) => `email-editor.${format}.js`
    },
    rollupOptions: {
      external: ["vue"],
      output: {
        globals: {
          vue: "Vue"
        }
      }
    }
  }
});
