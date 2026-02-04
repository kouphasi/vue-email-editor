# Block Types

The Email Editor includes five built-in block types that cover common email content needs.

## Text Block

The text block displays formatted text content with support for bold styling, colors, alignment, and font size.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `text` | `string` | The plain text content |
| `runs` | `TextRun[]` | Formatting runs for styling portions of text |
| `fontSize` | `number` | Optional font size in pixels |
| `align` | `'left' \| 'center' \| 'right'` | Optional text alignment |

### Text Runs

Text runs define formatting for character ranges within the text. Each run specifies:

- `start`: Starting character index (inclusive)
- `end`: Ending character index (exclusive)
- `bold`: Whether the text is bold
- `color`: Hex color code or `null`

```typescript
// Example: "Hello World" with "World" in bold red
{
  type: 'text',
  id: 'text-1',
  text: 'Hello World',
  runs: [
    { start: 6, end: 11, bold: true, color: '#ff0000' }
  ],
  fontSize: 16,
  align: 'left'
}
```

### Features

- Select text in the editor to apply bold or color formatting
- Runs must be sorted, non-overlapping, and within the text length
- Empty or invalid runs are cleaned up on edit

---

## Button Block

The button block creates a clickable call-to-action element.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `label` | `string` | Button text |
| `url` | `string` | Link URL (must be http:// or https://) |
| `shape` | `'square' \| 'rounded' \| 'pill'` | Button corner style |
| `textColor` | `string` | Text color (hex) |
| `backgroundColor` | `string` | Background color (hex) |
| `fontSize` | `number` | Optional font size in pixels |
| `paddingVerticalPx` | `number` | Optional vertical padding in pixels |
| `paddingHorizontalPx` | `number` | Optional horizontal padding in pixels |
| `paddingLocked` | `boolean` | Optional padding lock state |
| `align` | `'left' \| 'center' \| 'right'` | Optional button alignment |

### Example

```typescript
{
  type: 'button',
  id: 'button-1',
  label: 'Shop Now',
  url: 'https://example.com/shop',
  shape: 'rounded',
  textColor: '#ffffff',
  backgroundColor: '#2b6cb0',
  fontSize: 16,
  paddingVerticalPx: 12,
  paddingHorizontalPx: 20,
  align: 'center'
}
```

### Shape Options

- **square**: No border radius (sharp corners)
- **rounded**: Moderate border radius (8px)
- **pill**: Maximum border radius (fully rounded ends)

---

## Image Block

The image block displays images with configurable dimensions and alignment.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `url` | `string` | Image URL |
| `status` | `'pending' \| 'ready' \| 'uploading' \| 'error'` | Upload status |
| `display` | `ImageDisplay` | Display options for size and alignment |

```typescript
interface ImageDisplay {
  widthPx?: number
  heightPx?: number
  align?: 'left' | 'center' | 'right'
}
```

### Example

```typescript
{
  type: 'image',
  id: 'image-1',
  url: 'https://example.com/hero.jpg',
  status: 'ready',
  display: {
    widthPx: 600,
    heightPx: 400,
    align: 'center'
  }
}
```

### Upload Status

The status property tracks the image upload lifecycle:

1. **pending**: Initial state, no image selected
2. **uploading**: File is being uploaded
3. **ready**: Upload complete, image is available
4. **error**: Upload failed

### Image Upload Handler

Provide an `onImageUpload` prop to the EmailEditor to handle file uploads:

```typescript
const handleImageUpload = async (file: File): Promise<string> => {
  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  })

  const { url } = await response.json()
  return url  // Return the uploaded image URL
}
```

---

## HTML Block

The HTML block allows embedding raw HTML content for advanced customization.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `content` | `string` | Raw HTML content |

### Example

```typescript
{
  type: 'html',
  id: 'html-1',
  content: '<table><tr><td>Custom HTML content</td></tr></table>'
}
```

### Use Cases

- Embedding complex layouts not supported by other block types
- Including third-party widgets or tracking pixels
- Adding custom styling or scripts

### Important Notes

- HTML content is rendered directly without sanitization
- Ensure you trust the source of HTML content
- Test HTML content across email clients for compatibility

---

## Table Block

The table block creates a row/column layout using email-safe table markup.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `rows` | `TableRow[]` | Table rows and cells |
| `columnCount` | `number` | Number of columns (1 to 4) |
| `cellPadding` | `number` | Optional padding inside each cell in pixels |

### Table Rows and Cells

```typescript
interface TableRow {
  id: string
  cells: TableCell[]
}

interface TableCell {
  id: string
  widthPercent?: number
  blocks: CellBlock[]
}

type CellBlock = TextBlock | ButtonBlock | ImageBlock | HtmlBlock
```

### Example

```typescript
{
  type: 'table',
  id: 'table-1',
  columnCount: 2,
  cellPadding: 8,
  rows: [
    {
      id: 'row-1',
      cells: [
        {
          id: 'cell-1',
          widthPercent: 50,
          blocks: [
            {
              type: 'text',
              id: 'text-2',
              text: 'Left column',
              runs: [],
              fontSize: 16
            }
          ]
        },
        {
          id: 'cell-2',
          widthPercent: 50,
          blocks: []
        }
      ]
    }
  ]
}
```

### Notes

- Each row must include exactly `columnCount` cells
- Each cell may include **at most one** block
- Cell blocks are limited to `text`, `button`, `image`, and `html`
- `widthPercent` is optional; missing widths share the remaining space
- When all widths are provided, they should total 100 (validation enforces this)

---

## Alignment

- **Text** and **Button** use the `align` property
- **Image** uses `display.align`
- **Table** alignment is controlled by cell widths; there is no `align` property

---

## Default Values

When creating new blocks via the editor, the defaults are:

### Text Block Defaults
```typescript
{
  text: 'New text',
  runs: [],
  fontSize: 16
}
```

### Button Block Defaults
```typescript
{
  label: 'Button',
  url: 'https://example.com',
  shape: 'rounded',
  textColor: '#ffffff',
  backgroundColor: '#2b6cb0',
  fontSize: 16,
  paddingVerticalPx: 12,
  paddingHorizontalPx: 20,
  paddingLocked: false
}
```

### Image Block Defaults
```typescript
{
  url: '',
  status: 'pending',
  display: {
    align: 'center'
  }
}
```

### HTML Block Defaults
```typescript
{
  content: ''
}
```

### Table Block Defaults
```typescript
{
  columnCount: 2,
  cellPadding: 8,
  rows: [
    {
      cells: [
        { widthPercent: 50, blocks: [] },
        { widthPercent: 50, blocks: [] }
      ]
    }
  ]
}
```

---

## Block Operations

### Adding Blocks

Use the block picker in the editor toolbar to add new blocks. Click the "+" button or select from the available block types.

### Reordering Blocks

Drag and drop blocks in the canvas to reorder them. The editor provides visual feedback during drag operations.

### Editing Blocks

Click on a block in the canvas to select it. The properties sidebar will show editable options for the selected block.

### Deleting Blocks

Select a block and use the delete button in the properties sidebar to remove it.

---

## Next Steps

- Create [Custom Blocks](./custom-blocks.md) for specialized content
- See the [API Reference](./api-reference.md) for programmatic block manipulation
