import { defineConfig } from "vite";
import vue2 from "@vitejs/plugin-vue2";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: __dirname,
  plugins: [vue2()],
  resolve: {
    alias: {
      "email-editor": path.resolve(__dirname, "../src/index.ts")
    }
  },
  server: {
    port: 5174,
    open: true
  }
});
