# API Reference

Complete reference for the Email Editor library's public API.

## EmailEditor Component

The main Vue component for rendering the email editor.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `json` | `string` | `undefined` | JSON-serialized document to load |
| `document` | `Document \| null` | `undefined` | Document object to load directly |
| `previewMode` | `'mobile' \| 'desktop'` | `'mobile'` | Preview mode for the canvas |
| `onImageUpload` | `ImageUploadHandler` | `undefined` | Handler function for image uploads |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:json` | `string` | Emitted when the document changes, with the JSON string |
| `change` | `Document` | Emitted when the document changes, with the Document object |
| `error` | `Error` | Emitted when validation or loading errors occur |

### Exposed Methods

Access these methods via a template ref:

```vue
<template>
  <EmailEditor ref="editor" />
</template>

<script setup>
const editor = ref(null)
// Access: editor.value.exportHtml()
</script>
```

#### `loadJson(json: string): void`

Load a document from a JSON string.

```typescript
editor.value.loadJson('{"id":"doc-1","blocks":[],"layout":{...}}')
```

#### `loadDocument(doc: Document): void`

Load a document from a Document object.

```typescript
editor.value.loadDocument({
  id: 'doc-1',
  blocks: [],
  layout: { previewMode: 'desktop', previewWidthPx: 640 }
})
```

#### `exportJson(): string`

Export the current document as a JSON string.

```typescript
const json = editor.value.exportJson()
// Returns: '{"id":"doc-1","blocks":[...],"layout":{...}}'
```

#### `exportHtml(): string`

Export the current document as email-ready HTML.

```typescript
const html = editor.value.exportHtml()
// Returns complete HTML document with inline styles
```

---

## Types

### Document

The root document structure.

```typescript
interface Document {
  id: string
  blocks: Block[]
  layout: LayoutSettings
}
```

### LayoutSettings

Document layout configuration.

```typescript
interface LayoutSettings {
  previewMode: 'mobile' | 'desktop'
  previewWidthPx: 375 | 640
}
```

### Block

Union type of all block types.

```typescript
type Block = TextBlock | ButtonBlock | ImageBlock | HtmlBlock | CustomBlockInstance | TableBlock
```

### CellBlock

Blocks that can appear inside table cells.

```typescript
type CellBlock = TextBlock | ButtonBlock | ImageBlock | HtmlBlock
```

### TextBlock

```typescript
interface TextBlock {
  type: 'text'
  id: string
  text: string
  runs: TextRun[]
  fontSize?: number
  align?: 'left' | 'center' | 'right'
}

interface TextRun {
  start: number
  end: number
  bold: boolean
  color: string | null  // Hex color (#RGB or #RRGGBB)
}
```

### ButtonBlock

```typescript
interface ButtonBlock {
  type: 'button'
  id: string
  label: string
  url: string
  shape: 'square' | 'rounded' | 'pill'
  textColor: string        // Text color (hex)
  backgroundColor: string  // Background color (hex)
  fontSize?: number
  paddingVerticalPx?: number
  paddingHorizontalPx?: number
  paddingLocked?: boolean
  align?: 'left' | 'center' | 'right'
}
```

### ImageBlock

```typescript
interface ImageBlock {
  type: 'image'
  id: string
  url: string
  status: 'pending' | 'ready' | 'uploading' | 'error'
  display: {
    widthPx?: number
    heightPx?: number
    align?: 'left' | 'center' | 'right'
  }
}
```

### HtmlBlock

```typescript
interface HtmlBlock {
  type: 'html'
  id: string
  content: string  // Raw HTML content
}
```

### TableBlock

```typescript
interface TableBlock {
  type: 'table'
  id: string
  rows: TableRow[]
  columnCount: number
  cellPadding?: number
}

interface TableRow {
  id: string
  cells: TableCell[]
}

interface TableCell {
  id: string
  widthPercent?: number
  blocks: CellBlock[]
}
```

### CustomBlockInstance

```typescript
interface CustomBlockInstance {
  type: 'custom'
  id: string
  definitionId: string
  config: Record<string, unknown>
  state: 'ready' | 'invalid' | 'missing-definition'
  readOnly: boolean
}
```

### ImageUploadHandler

```typescript
type ImageUploadHandler = (file: File) => Promise<string>
```

A function that receives a File object and returns a Promise resolving to the uploaded image URL.

---

## Functions

### Document Serialization

#### `serializeDocument(doc: Document): string`

Convert a Document object to a JSON string.

```typescript
import { serializeDocument } from 'email-editor'

const json = serializeDocument(document)
```

#### `parseDocument(json: string): Document`

Parse a JSON string into a Document object. Throws on invalid input.

```typescript
import { parseDocument } from 'email-editor'

try {
  const document = parseDocument(jsonString)
} catch (error) {
  console.error('Invalid document:', error.message)
}
```

#### `validateDocument(doc: Document): { valid: boolean; errors: string[] }`

Validate a Document object's structure and content.

```typescript
import { validateDocument } from 'email-editor'

const result = validateDocument(document)
if (!result.valid) {
  console.error('Validation errors:', result.errors)
}
```

### HTML Export

#### `exportHtml(doc: Document): string`

Render a Document to email-ready HTML with inline styles.

```typescript
import { exportHtml } from 'email-editor'

const html = exportHtml(document)
```

---

## Table Functions

Helpers for creating and editing table blocks.

### `createTableBlock(columnCount: number): TableBlock`

Create a new table block. The column count is clamped to 1-4.

### `updateTableColumnCount(block: TableBlock, newCount: number): TableBlock`

Update the column count and resize existing rows/cells.

### `addRowToTable(block: TableBlock): TableBlock`

Append a new row using the current column count.

### `deleteRowFromTable(block: TableBlock, rowId: string): TableBlock`

Remove a row. The last row cannot be deleted.

### `replaceBlockInCell(block: TableBlock, cellId: string, newBlock: CellBlock): TableBlock`

Replace the block inside a cell (only `text`, `button`, `image`, or `html` are allowed).

### `addBlockToCell(block: TableBlock, cellId: string, newBlock: CellBlock): TableBlock`

Deprecated alias of `replaceBlockInCell`.

### `updateCellBlock(block: TableBlock, cellId: string, blockId: string, updater: (block: CellBlock) => CellBlock): TableBlock`

Update the block inside a cell.

### `deleteCellBlock(block: TableBlock, cellId: string, blockId: string): TableBlock`

Remove the block from a cell.

### `moveBlockToCell(document: Document, blockIndex: number, tableBlockId: string, cellId: string): Document | null`

Move a top-level block into a table cell if the cell is empty.

### `moveCellBlockToCell(document: Document, sourceTableId: string, sourceCellId: string, blockId: string, targetTableId: string, targetCellId: string): Document | null`

Move a block between table cells.

### `moveCellBlockToTopLevel(document: Document, tableBlockId: string, cellId: string, blockId: string, targetIndex: number): Document`

Move a cell block back to the top-level blocks list.

### `resolveCellWidths(row: TableRow, columnCount: number): number[]`

Resolve final cell widths by distributing missing widths and normalizing to 100%.

### Example

```typescript
import { createTableBlock, replaceBlockInCell } from 'email-editor'

const table = createTableBlock(2)
const firstCellId = table.rows[0].cells[0].id

const updated = replaceBlockInCell(table, firstCellId, {
  type: 'text',
  id: 'text-1',
  text: 'Hello',
  runs: []
})
```

---

## Custom Block Functions

See [Custom Blocks](./custom-blocks.md) for detailed usage.

### `registerCustomBlock(definition: CustomBlockDefinition): void`

Register a custom block definition globally.

```typescript
import { registerCustomBlock } from 'email-editor'

registerCustomBlock({
  id: 'hero',
  displayName: 'Hero Section',
  settingsSchema: { fields: [...] },
  defaultConfig: { ... },
  validate: (config) => ({ ok: true, missingFields: [] }),
  renderHtml: (config) => '<div>...</div>'
})
```

### `getCustomBlockDefinition(id: string): CustomBlockDefinition | undefined`

Retrieve a registered custom block definition by ID.

```typescript
import { getCustomBlockDefinition } from 'email-editor'

const definition = getCustomBlockDefinition('hero')
```

### `listCustomBlockDefinitions(): CustomBlockDefinition[]`

Get all registered custom block definitions.

```typescript
import { listCustomBlockDefinitions } from 'email-editor'

const definitions = listCustomBlockDefinitions()
```

### `subscribeCustomBlockDefinitions(callback: (definitions: CustomBlockDefinition[]) => void): () => void`

Subscribe to changes in registered custom block definitions. Returns an unsubscribe function.

```typescript
import { subscribeCustomBlockDefinitions } from 'email-editor'

const unsubscribe = subscribeCustomBlockDefinitions((definitions) => {
  console.log('Definitions updated:', definitions)
})

// Later: unsubscribe()
```

### `createCustomBlockInstance(definitionId: string, configOverrides?: object): CustomBlockInstance`

Create a new instance of a custom block with optional config overrides.

```typescript
import { createCustomBlockInstance } from 'email-editor'

const block = createCustomBlockInstance('hero', {
  headline: 'Welcome!'
})
```

---

## Validation Types

### ValidationResult

```typescript
interface ValidationResult {
  ok: boolean
  missingFields: string[]
  errors?: ValidationError[]
}
```

### ValidationError

```typescript
interface ValidationError {
  field: string
  message: string
  code?: string
}
```
