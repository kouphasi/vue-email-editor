import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Module = require("module") as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};
const originalLoad = Module._load;
Module._load = (request, parent, isMain) => {
  if (request === "vue") {
    return require("vue3");
  }
  return originalLoad(request, parent, isMain);
};

const { config } = await import("@vue/test-utils");

config.global.stubs = {
  transition: false,
  "transition-group": false
};
