import type { ButtonBlock, Document, ImageBlock, TableBlock, TextBlock } from "../src/core/types";
import { renderBlockHtml } from "../src/rendering/html_renderer";
import { validateDocument } from "../src/services/json_validation";
import {
  createTableBlock,
  updateTableColumnCount,
  addRowToTable,
  deleteRowFromTable,
  replaceBlockInCell,
  updateCellBlock,
  deleteCellBlock
} from "../src/services/document_service";
import { resolveCellWidths } from "../src/core/table_utils";

describe("table block", () => {
  const textBlock: TextBlock = {
    id: "text-1",
    type: "text",
    text: "Hello",
    runs: []
  };

  const baseTable: TableBlock = {
    id: "table-1",
    type: "table",
    columnCount: 2,
    cellPadding: 8,
    rows: [
      {
        id: "row-1",
        cells: [
          {
            id: "cell-1",
            widthPercent: 50,
            blocks: [textBlock]
          },
          {
            id: "cell-2",
            widthPercent: 50,
            blocks: []
          }
        ]
      }
    ]
  };

  const buildDocument = (block: TableBlock): Document => ({
    id: "doc-table-1",
    layout: {
      previewMode: "desktop",
      previewWidthPx: 640
    },
    blocks: [block]
  });

  it("validates a table block with valid structure", () => {
    const result = validateDocument(buildDocument(baseTable));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects table blocks with invalid width totals", () => {
    const invalidTable: TableBlock = {
      ...baseTable,
      rows: [
        {
          ...baseTable.rows[0],
          cells: [
            { ...baseTable.rows[0].cells[0], widthPercent: 30 },
            { ...baseTable.rows[0].cells[1], widthPercent: 30 }
          ]
        }
      ]
    };

    const result = validateDocument(buildDocument(invalidTable));
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects table blocks with multiple blocks in a cell", () => {
    const invalidTable: TableBlock = {
      ...baseTable,
      rows: [
        {
          ...baseTable.rows[0],
          cells: [
            {
              ...baseTable.rows[0].cells[0],
              blocks: [
                textBlock,
                {
                  id: "text-2",
                  type: "text",
                  text: "Another",
                  runs: []
                }
              ]
            },
            baseTable.rows[0].cells[1]
          ]
        }
      ]
    };

    const result = validateDocument(buildDocument(invalidTable));
    expect(result.valid).toBe(false);
  });

  it("renders table blocks as presentation tables", () => {
    const html = renderBlockHtml(baseTable);
    expect(html).toContain('role="presentation"');
    expect(html).toContain("Hello");
    expect(html).toContain('width="50%"');
  });

  describe("createTableBlock", () => {
    it("creates a table with the specified column count", () => {
      const table = createTableBlock(3);
      expect(table.type).toBe("table");
      expect(table.columnCount).toBe(3);
      expect(table.rows).toHaveLength(1);
      expect(table.rows[0].cells).toHaveLength(3);
    });

    it("clamps column count to valid range (1-4)", () => {
      expect(createTableBlock(0).columnCount).toBe(1);
      expect(createTableBlock(5).columnCount).toBe(4);
      expect(createTableBlock(-1).columnCount).toBe(1);
    });

    it("distributes widths evenly across cells", () => {
      const table = createTableBlock(3);
      const widths = table.rows[0].cells.map((c) => c.widthPercent);
      const sum = widths.reduce((a, b) => a! + b!, 0);
      expect(sum).toBe(100);
    });
  });

  describe("updateTableColumnCount", () => {
    it("adds columns when count increases", () => {
      const table = createTableBlock(2);
      const updated = updateTableColumnCount(table, 4);
      expect(updated.columnCount).toBe(4);
      expect(updated.rows[0].cells).toHaveLength(4);
    });

    it("removes columns when count decreases", () => {
      const table = createTableBlock(4);
      const updated = updateTableColumnCount(table, 2);
      expect(updated.columnCount).toBe(2);
      expect(updated.rows[0].cells).toHaveLength(2);
    });

    it("redistributes widths when column count changes", () => {
      const table = createTableBlock(2);
      const updated = updateTableColumnCount(table, 3);
      const widths = updated.rows[0].cells.map((c) => c.widthPercent);
      const sum = widths.reduce((a, b) => a! + b!, 0);
      expect(sum).toBe(100);
    });
  });

  describe("addRowToTable and deleteRowFromTable", () => {
    it("adds a new row with correct number of cells", () => {
      const table = createTableBlock(3);
      const updated = addRowToTable(table);
      expect(updated.rows).toHaveLength(2);
      expect(updated.rows[1].cells).toHaveLength(3);
    });

    it("deletes a row by id", () => {
      let table = createTableBlock(2);
      table = addRowToTable(table);
      const rowId = table.rows[0].id;
      const updated = deleteRowFromTable(table, rowId);
      expect(updated.rows).toHaveLength(1);
      expect(updated.rows[0].id).not.toBe(rowId);
    });

    it("prevents deleting the last row", () => {
      const table = createTableBlock(2);
      const rowId = table.rows[0].id;
      const updated = deleteRowFromTable(table, rowId);
      expect(updated.rows).toHaveLength(1);
    });
  });

  describe("replaceBlockInCell", () => {
    it("replaces block in specified cell", () => {
      const table = createTableBlock(2);
      const cellId = table.rows[0].cells[0].id;
      const newBlock: TextBlock = {
        id: "new-text",
        type: "text",
        text: "New content",
        runs: []
      };
      const updated = replaceBlockInCell(table, cellId, newBlock);
      expect(updated.rows[0].cells[0].blocks[0].id).toBe("new-text");
    });

    it("rejects invalid block types", () => {
      const table = createTableBlock(2);
      const cellId = table.rows[0].cells[0].id;
      const invalidBlock = {
        id: "invalid",
        type: "table",
        columnCount: 1,
        rows: []
      } as unknown as TextBlock;
      const updated = replaceBlockInCell(table, cellId, invalidBlock);
      expect(updated.rows[0].cells[0].blocks).toHaveLength(0);
    });
  });

  describe("updateCellBlock", () => {
    it("updates existing block in cell", () => {
      let table = createTableBlock(2);
      const cellId = table.rows[0].cells[0].id;
      const textBlock: TextBlock = {
        id: "text-1",
        type: "text",
        text: "Original",
        runs: []
      };
      table = replaceBlockInCell(table, cellId, textBlock);
      const updated = updateCellBlock(table, cellId, "text-1", (block) => ({
        ...block,
        text: "Updated"
      }));
      const cell = updated.rows[0].cells[0];
      expect(cell.blocks[0].type).toBe("text");
      expect((cell.blocks[0] as TextBlock).text).toBe("Updated");
    });
  });

  describe("deleteCellBlock", () => {
    it("removes block from cell", () => {
      let table = createTableBlock(2);
      const cellId = table.rows[0].cells[0].id;
      const textBlock: TextBlock = {
        id: "text-1",
        type: "text",
        text: "Test",
        runs: []
      };
      table = replaceBlockInCell(table, cellId, textBlock);
      const updated = deleteCellBlock(table, cellId, "text-1");
      expect(updated.rows[0].cells[0].blocks).toHaveLength(0);
    });
  });

  describe("resolveCellWidths", () => {
    it("returns even distribution when no widths are defined", () => {
      const table = createTableBlock(3);
      const row = {
        ...table.rows[0],
        cells: table.rows[0].cells.map((c) => ({ ...c, widthPercent: undefined }))
      };
      const widths = resolveCellWidths(row, 3);
      expect(widths).toHaveLength(3);
      expect(widths.every((w) => Math.abs(w - 33.33) < 1)).toBe(true);
    });

    it("fills missing widths from remaining space", () => {
      const row = {
        id: "row-1",
        cells: [
          { id: "c1", widthPercent: 60, blocks: [] },
          { id: "c2", widthPercent: undefined, blocks: [] },
          { id: "c3", widthPercent: undefined, blocks: [] }
        ]
      };
      const widths = resolveCellWidths(row, 3);
      expect(widths[0]).toBe(60);
      expect(widths[1]).toBe(20);
      expect(widths[2]).toBe(20);
    });

    it("normalizes widths when sum is not 100", () => {
      const row = {
        id: "row-1",
        cells: [
          { id: "c1", widthPercent: 30, blocks: [] },
          { id: "c2", widthPercent: 30, blocks: [] }
        ]
      };
      const widths = resolveCellWidths(row, 2);
      expect(widths[0]).toBe(50);
      expect(widths[1]).toBe(50);
    });
  });

  describe("validation edge cases", () => {
    it("accepts table with 1 column", () => {
      const table = createTableBlock(1);
      const result = validateDocument(buildDocument(table));
      expect(result.valid).toBe(true);
    });

    it("accepts table with 4 columns", () => {
      const table = createTableBlock(4);
      const result = validateDocument(buildDocument(table));
      expect(result.valid).toBe(true);
    });

    it("accepts cells with different block types", () => {
      let table = createTableBlock(3);
      const textBlock: TextBlock = { id: "t1", type: "text", text: "Text", runs: [] };
      const buttonBlock: ButtonBlock = {
        id: "b1",
        type: "button",
        label: "Click",
        url: "https://example.com",
        shape: "rounded",
        textColor: "#ffffff",
        backgroundColor: "#000000",
        fontSize: 16
      };
      const imageBlock: ImageBlock = {
        id: "i1",
        type: "image",
        url: "https://example.com/image.jpg",
        status: "ready",
        display: { align: "center" }
      };
      table = replaceBlockInCell(table, table.rows[0].cells[0].id, textBlock);
      table = replaceBlockInCell(table, table.rows[0].cells[1].id, buttonBlock);
      table = replaceBlockInCell(table, table.rows[0].cells[2].id, imageBlock);
      const result = validateDocument(buildDocument(table));
      expect(result.valid).toBe(true);
    });
  });

  describe("rendering with multiple rows and cell padding", () => {
    it("renders multiple rows correctly", () => {
      let table = createTableBlock(2);
      table = addRowToTable(table);
      const html = renderBlockHtml(table);
      expect(html).toContain("<tr>");
      const trCount = (html.match(/<tr>/g) || []).length;
      expect(trCount).toBe(2);
    });

    it("applies custom cell padding", () => {
      const table: TableBlock = {
        ...createTableBlock(2),
        cellPadding: 16
      };
      const html = renderBlockHtml(table);
      expect(html).toContain("padding:16px");
    });
  });
});
