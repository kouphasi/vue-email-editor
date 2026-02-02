import {
  Block,
  CellBlock,
  CustomBlockDefinition,
  CustomBlockInstance,
  Document,
  LayoutSettings,
  PreviewMode,
  PREVIEW_WIDTHS,
  TableBlock,
  TableCell,
  TableRow
} from "../core/types";
import { getCustomBlockDefinition } from "../core/custom_block_registry";

export const createLayoutSettings = (mode: PreviewMode): LayoutSettings => {
  return {
    previewMode: mode,
    previewWidthPx: PREVIEW_WIDTHS[mode]
  };
};

export const createDocument = (id: string): Document => {
  return {
    id,
    blocks: [],
    layout: createLayoutSettings("mobile")
  };
};

export const setLayout = (document: Document, layout: LayoutSettings): Document => {
  return {
    ...document,
    layout
  };
};

export const updateLayout = setLayout;

export const setPreviewMode = (document: Document, mode: PreviewMode): Document => {
  return setLayout(document, createLayoutSettings(mode));
};

export const addBlock = (document: Document, block: Block): Document => {
  return {
    ...document,
    blocks: [...document.blocks, block]
  };
};

const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `block_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const TABLE_COLUMN_MIN = 1;
const TABLE_COLUMN_MAX = 4;

const clampColumnCount = (count: number): number => {
  if (!Number.isFinite(count)) {
    return TABLE_COLUMN_MIN;
  }
  return Math.min(TABLE_COLUMN_MAX, Math.max(TABLE_COLUMN_MIN, Math.round(count)));
};

const splitEvenly = (total: number, count: number): number[] => {
  if (count <= 0) {
    return [];
  }
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
};

const createTableCell = (widthPercent: number): TableCell => {
  return {
    id: createId(),
    widthPercent,
    blocks: []
  };
};

const createTableRow = (columnCount: number): TableRow => {
  const widths = splitEvenly(100, columnCount);
  return {
    id: createId(),
    cells: widths.map((width) => createTableCell(width))
  };
};

const isAllowedCellBlock = (block: Block | CellBlock): block is CellBlock => {
  return (
    block.type === "text" ||
    block.type === "button" ||
    block.type === "image" ||
    block.type === "html"
  );
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const deepMerge = (base: unknown, overrides: unknown): unknown => {
  if (Array.isArray(base) || Array.isArray(overrides)) {
    return overrides !== undefined ? overrides : base;
  }

  if (isPlainObject(base) && isPlainObject(overrides)) {
    const merged: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(overrides)) {
      merged[key] = deepMerge(base[key], value);
    }
    return merged;
  }

  return overrides !== undefined ? overrides : base;
};

const buildSchemaDefaults = (definition: CustomBlockDefinition): Record<string, unknown> => {
  const defaults: Record<string, unknown> = {};
  for (const field of definition.settingsSchema.fields) {
    if (field.default !== undefined) {
      defaults[field.key] = field.default;
    }
  }
  return defaults;
};

export const createCustomBlockInstance = (
  definitionId: string,
  overrides: Record<string, unknown> = {},
  id: string = createId()
): CustomBlockInstance => {
  const definition = getCustomBlockDefinition(definitionId);
  const baseConfig = definition
    ? deepMerge(buildSchemaDefaults(definition), definition.defaultConfig)
    : {};
  const config = deepMerge(baseConfig, overrides) as Record<string, unknown>;
  const state = definition ? "ready" : "missing-definition";

  return {
    id,
    type: "custom",
    definitionId,
    config,
    state,
    readOnly: state === "missing-definition"
  };
};

export const createTableBlock = (columnCount: number): TableBlock => {
  const safeCount = clampColumnCount(columnCount);
  return {
    id: createId(),
    type: "table",
    rows: [createTableRow(safeCount)],
    columnCount: safeCount,
    cellPadding: 8
  };
};

export const updateTableColumnCount = (block: TableBlock, newCount: number): TableBlock => {
  const nextCount = clampColumnCount(newCount);
  if (nextCount === block.columnCount) {
    return block;
  }

  const widths = splitEvenly(100, nextCount);
  const sourceRows = block.rows.length > 0 ? block.rows : [createTableRow(nextCount)];
  const rows = sourceRows.map((row) => {
    const trimmedCells = row.cells.slice(0, nextCount);
    const cells: TableCell[] = [...trimmedCells];
    while (cells.length < nextCount) {
      cells.push(createTableCell(0));
    }
    return {
      ...row,
      cells: cells.map((cell, index) => ({
        ...cell,
        widthPercent: widths[index] ?? cell.widthPercent
      }))
    };
  });

  return {
    ...block,
    columnCount: nextCount,
    rows
  };
};

export const addRowToTable = (block: TableBlock): TableBlock => {
  const safeCount = clampColumnCount(block.columnCount);
  return {
    ...block,
    columnCount: safeCount,
    rows: [...block.rows, createTableRow(safeCount)]
  };
};

export const deleteRowFromTable = (block: TableBlock, rowId: string): TableBlock => {
  if (block.rows.length <= 1) {
    return block;
  }
  const rows = block.rows.filter((row) => row.id !== rowId);
  if (rows.length === block.rows.length || rows.length === 0) {
    return block;
  }
  return {
    ...block,
    rows
  };
};

/**
 * セルのブロックを置き換えます。
 * セルには常に最大1つのブロックのみが含まれます。
 */
export const replaceBlockInCell = (
  block: TableBlock,
  cellId: string,
  newBlock: CellBlock
): TableBlock => {
  if (!isAllowedCellBlock(newBlock)) {
    return block;
  }

  const rows = block.rows.map((row) => ({
    ...row,
    cells: row.cells.map((cell) => {
      if (cell.id !== cellId) {
        return cell;
      }
      return {
        ...cell,
        blocks: [newBlock]
      };
    })
  }));

  return {
    ...block,
    rows
  };
};

/**
 * 後方互換性のため、replaceBlockInCell のエイリアスを残します。
 * @deprecated replaceBlockInCell を使用してください
 */
export const addBlockToCell = replaceBlockInCell;

/**
 * セル内のブロックを更新します。
 * updater関数が不正なブロックタイプを返した場合、変更は適用されません。
 */
export const updateCellBlock = (
  block: TableBlock,
  cellId: string,
  blockId: string,
  updater: (block: CellBlock) => CellBlock
): TableBlock => {
  const rows = block.rows.map((row) => ({
    ...row,
    cells: row.cells.map((cell) => {
      if (cell.id !== cellId) {
        return cell;
      }
      const target = cell.blocks.find((cellBlock) => cellBlock.id === blockId);
      if (!target) {
        return cell;
      }
      const next = updater(target);
      const resolved = isAllowedCellBlock(next) ? next : target;
      return {
        ...cell,
        blocks: [resolved]
      };
    })
  }));

  return {
    ...block,
    rows
  };
};

export const deleteCellBlock = (
  block: TableBlock,
  cellId: string,
  blockId: string
): TableBlock => {
  const rows = block.rows.map((row) => ({
    ...row,
    cells: row.cells.map((cell) => {
      if (cell.id !== cellId) {
        return cell;
      }
      return {
        ...cell,
        blocks: cell.blocks.filter((cellBlock) => cellBlock.id !== blockId)
      };
    })
  }));

  return {
    ...block,
    rows
  };
};

export const updateBlock = (
  document: Document,
  blockId: string,
  updater: (block: Block) => Block
): Document => {
  const blocks = document.blocks.map((block) =>
    block.id === blockId ? updater(block) : block
  );

  return {
    ...document,
    blocks
  };
};

export const replaceBlock = (document: Document, blockId: string, next: Block): Document => {
  return updateBlock(document, blockId, () => next);
};

export const deleteBlock = (document: Document, blockId: string): Document => {
  return {
    ...document,
    blocks: document.blocks.filter((block) => block.id !== blockId)
  };
};

export const reorderBlocks = (
  document: Document,
  fromIndex: number,
  toIndex: number
): Document => {
  if (fromIndex === toIndex) {
    return document;
  }

  const blocks = [...document.blocks];
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= blocks.length ||
    toIndex >= blocks.length
  ) {
    return document;
  }

  const [moved] = blocks.splice(fromIndex, 1);
  if (!moved) {
    return document;
  }
  blocks.splice(toIndex, 0, moved);

  return {
    ...document,
    blocks
  };
};
