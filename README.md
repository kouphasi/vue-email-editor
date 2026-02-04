![002A0280-DEDC-41CB-BB4E-6F87F89F97DB_1_201_a](https://github.com/user-attachments/assets/af5ef402-86ff-49f8-9c2f-98f05d44d727)


# Simple Vue Email Editor

Block-based email editor library for Vue 2.7 / Vue 3.


<img width="1466" height="836" alt="image" src="https://github.com/user-attachments/assets/9ff817e3-c305-4a22-8f4a-5c8021d02874" />

[demo page](https://simple-vue-email-editor.vercel.app/)

## Features

- Block-based editing (text, button, image, HTML, table, custom)
- JSON document model with validation
- HTML export for email delivery
- Custom blocks with schema, defaults, validation, and HTML rendering
- Preview modes (mobile/desktop) and image upload hook

## Requirements

- Vue 2.7 or Vue 3 (peer dependency: vue ^2.7 || ^3.0)
- Modern browser with File/Blob APIs

## Install

```bash
npm install email-editor
# or
pnpm add email-editor
# or
yarn add email-editor
```

## Quick Start (Vue 3)

```vue
<script setup lang="ts">
import EmailEditor from "email-editor";
import { ref } from "vue";

const json = ref("");

const handleJsonUpdate = (value: string) => {
  json.value = value;
};

const handleImageUpload = async (file: File) => {
  const url = await uploadImage(file);
  return url;
};
</script>

<template>
  <EmailEditor :json="json" :on-image-upload="handleImageUpload" @update:json="handleJsonUpdate" />
</template>
```

## Vue 2.7 Usage

Use the Vue 2.7 build via the subpath import:

```ts
import EmailEditor, { exportHtml } from "email-editor/vue2";
```

## Component API

### Props

- `json?: string`
  - JSON string representation of the `Document`.
  - If `document` is also provided, `document` takes precedence.
- `document?: Document | null`
  - Document object to load. Use `@change` to capture edits.
- `previewMode?: "mobile" | "desktop"`
  - Initial preview mode. Default: `"mobile"`.
- `onImageUpload?: (file: File) => Promise<string>`
  - Called when an image is uploaded. Return a public URL.

### Events

- `update:json` (value: string)
  - Emitted when the document changes.
- `change` (value: Document)
  - Emitted when the document changes.
- `error` (value: Error)
  - Emitted when JSON parsing or validation fails.

### Exposed Methods

```ts
// via template ref
loadJson(json: string): void
loadDocument(doc: Document): void
exportJson(): string
exportHtml(): string
```

## Data Model

```ts
interface Document {
  id: string;
  blocks: Block[];
  layout: {
    previewMode: "mobile" | "desktop";
    previewWidthPx: 375 | 640;
  };
}
```

Built-in block types: `text`, `button`, `image`, `html`, `table`, `custom`.

## Programmatic API

Vue 2.7 users should import from `email-editor/vue2`.

```ts
import {
  exportHtml,
  parseDocument,
  serializeDocument,
  validateDocument,
  createCustomBlockInstance,
  createTableBlock,
  updateTableColumnCount,
  addRowToTable,
  deleteRowFromTable,
  replaceBlockInCell,
  updateCellBlock,
  deleteCellBlock,
  moveBlockToCell,
  moveCellBlockToCell,
  moveCellBlockToTopLevel,
  registerCustomBlock,
  getCustomBlockDefinition,
  listCustomBlockDefinitions,
  subscribeCustomBlockDefinitions,
  DuplicateCustomBlockDefinitionError
} from "email-editor";
```

- `parseDocument(json)`: JSON string -> `Document`
- `serializeDocument(doc)`: `Document` -> JSON string
- `validateDocument(doc)`: validate a `Document`
- `exportHtml(doc)`: render final HTML for email delivery

## Custom Blocks

Register custom blocks to appear in the picker and render with your own HTML.

```ts
import {
  registerCustomBlock,
  createCustomBlockInstance,
  serializeDocument
} from "email-editor";

registerCustomBlock({
  id: "hero",
  displayName: "Hero",
  settingsSchema: {
    fields: [
      { key: "headline", label: "Headline", type: "string", required: true, default: "Hello" },
      { key: "ctaUrl", label: "CTA URL", type: "url", required: true, default: "https://example.com" }
    ]
  },
  defaultConfig: { headline: "Hello", ctaUrl: "https://example.com" },
  validate(config) {
    const missingFields: string[] = [];
    if (!config.headline) missingFields.push("headline");
    if (!config.ctaUrl) missingFields.push("ctaUrl");
    return { ok: missingFields.length === 0, missingFields };
  },
  renderHtml(config) {
    return `<div class="hero"><h1>${config.headline}</h1><a href="${config.ctaUrl}">Learn more</a></div>`;
  }
});

const customBlock = createCustomBlockInstance("hero", { headline: "Welcome" });
const documentJson = serializeDocument({
  id: "doc-1",
  layout: { previewMode: "desktop", previewWidthPx: 640 },
  blocks: [customBlock]
});
```

Settings field types: `string`, `number`, `boolean`, `color`, `select`, `url`, `html`, `richtext`.

## Demos

```bash
pnpm run demo
pnpm run demo:vue3
```

## Development

```bash
pnpm run dev
pnpm run build
pnpm run test
pnpm run test:vue3
pnpm run lint
pnpm run typecheck
```

## Contributing

Issues and pull requests are welcome. Please run tests and linting before submitting.
