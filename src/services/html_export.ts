import {
  CustomBlockDefinition,
  CustomBlockInstance,
  Document,
  TableBlock,
  TextBlock,
  ButtonBlock,
  ImageBlock,
  CellBlock,
  ValidationResult
} from "../core/types";
import { getCustomBlockDefinition } from "../core/custom_block_registry";
import { validateSettingsSchema } from "../core/custom_block_validation";
import {
  areTextRunsValid,
  isValidFontSize,
  isValidHexColor,
  isValidHttpUrl
} from "../core/validation";
import { renderBlockHtml } from "../rendering/html_renderer";
import { wrapEmailHtml } from "../rendering/html_templates";

const validateForExport = (document: Document): string[] => {
  const errors: string[] = [];

  if (document.blocks.length === 0) {
    errors.push("Document must contain at least one block.");
  }

  for (const block of document.blocks) {
    if (block.type === "text") {
      errors.push(...validateTextBlockForExport(block));
    } else if (block.type === "button") {
      errors.push(...validateButtonBlockForExport(block));
    } else if (block.type === "image") {
      errors.push(...validateImageBlockForExport(block));
    } else if (block.type === "table") {
      errors.push(...validateTableBlockForExport(block));
    }
  }

  return errors;
};

const validateTextBlockForExport = (block: TextBlock): string[] => {
  const errors: string[] = [];
  if (!areTextRunsValid(block.text, block.runs)) {
    errors.push(`Invalid text runs for block ${block.id}`);
  }

  for (const run of block.runs) {
    if (!isValidHexColor(run.color)) {
      errors.push(`Invalid text color for block ${block.id}`);
      break;
    }
  }

  if (!isValidFontSize(block.fontSize)) {
    errors.push(`Invalid text font size for block ${block.id}`);
  }

  return errors;
};

const validateButtonBlockForExport = (block: ButtonBlock): string[] => {
  const errors: string[] = [];
  if (!isValidHttpUrl(block.url)) {
    errors.push(`Invalid button URL for block ${block.id}`);
  }

  if (!isValidHexColor(block.textColor) || !isValidHexColor(block.backgroundColor)) {
    errors.push(`Invalid button colors for block ${block.id}`);
  }

  if (!isValidFontSize(block.fontSize)) {
    errors.push(`Invalid button font size for block ${block.id}`);
  }

  return errors;
};

const validateImageBlockForExport = (block: ImageBlock): string[] => {
  const errors: string[] = [];
  if (!isValidHttpUrl(block.url)) {
    errors.push(`Invalid image URL for block ${block.id}`);
  }

  if (block.status !== "ready") {
    errors.push(`Image block ${block.id} is not ready for export`);
  }

  return errors;
};

const validateCellBlockForExport = (block: CellBlock, tableId: string): string[] => {
  switch (block.type) {
    case "text":
      return validateTextBlockForExport(block);
    case "button":
      return validateButtonBlockForExport(block);
    case "image":
      return validateImageBlockForExport(block);
    case "html":
      return [];
    default:
      return [`Table block ${tableId} has invalid cell block type ${(block as CellBlock).type}`];
  }
};

const validateTableBlockForExport = (block: TableBlock): string[] => {
  const errors: string[] = [];
  if (
    !Number.isInteger(block.columnCount) ||
    block.columnCount < 1 ||
    block.columnCount > 4
  ) {
    errors.push(`Table block ${block.id} has invalid column count`);
  }

  if (!Array.isArray(block.rows) || block.rows.length === 0) {
    errors.push(`Table block ${block.id} must include at least one row`);
    return errors;
  }

    for (const row of block.rows) {
      if (!Array.isArray(row.cells) || row.cells.length !== block.columnCount) {
        errors.push(`Table block ${block.id} has invalid row structure`);
        continue;
      }

      let sum = 0;
      let definedCount = 0;
      for (const cell of row.cells) {
        if (cell.blocks.length > 1) {
          errors.push(`Table block ${block.id} cell ${cell.id} has multiple blocks`);
        }
        if (cell.widthPercent !== undefined) {
          if (
            typeof cell.widthPercent !== "number" ||
          !Number.isFinite(cell.widthPercent) ||
          cell.widthPercent <= 0 ||
          cell.widthPercent > 100
        ) {
          errors.push(`Table block ${block.id} cell ${cell.id} has invalid width`);
        } else {
          sum += cell.widthPercent;
          definedCount += 1;
        }
      }

      for (const cellBlock of cell.blocks) {
        if (
          cellBlock.type !== "text" &&
          cellBlock.type !== "button" &&
          cellBlock.type !== "image" &&
          cellBlock.type !== "html"
        ) {
          errors.push(`Table block ${block.id} cell ${cell.id} has invalid block type`);
          continue;
        }
        errors.push(...validateCellBlockForExport(cellBlock, block.id));
      }
    }

    if (definedCount === row.cells.length && Math.abs(sum - 100) > 0.01) {
      errors.push(`Table block ${block.id} row ${row.id} width must total 100%`);
    }

    if (definedCount < row.cells.length && sum >= 100) {
      errors.push(`Table block ${block.id} row ${row.id} width leaves no space for missing cells`);
    }
  }

  return errors;
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

const resolveCustomBlockForExport = (block: CustomBlockInstance): CustomBlockInstance => {
  const definition = getCustomBlockDefinition(block.definitionId);
  if (!definition) {
    return {
      ...block,
      state: "missing-definition",
      readOnly: true
    };
  }

  const baseConfig = deepMerge(
    buildSchemaDefaults(definition),
    definition.defaultConfig
  ) as Record<string, unknown>;
  const mergedConfig = deepMerge(baseConfig, block.config) as Record<string, unknown>;

  const schemaValidation = validateSettingsSchema(definition.settingsSchema, mergedConfig);
  let definitionValidation: ValidationResult = { ok: true, missingFields: [], errors: [] };
  try {
    definitionValidation = definition.validate(mergedConfig);
  } catch {
    definitionValidation = { ok: false, missingFields: [], errors: [] };
  }

  if (!schemaValidation.ok || !definitionValidation.ok) {
    return {
      ...block,
      state: "invalid",
      readOnly: false
    };
  }

  return {
    ...block,
    state: "ready",
    readOnly: false
  };
};

export const exportHtml = (document: Document): string => {
  const errors = validateForExport(document);
  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  const content = document.blocks
    .map((block) => {
      if (block.type === "custom") {
        return renderBlockHtml(resolveCustomBlockForExport(block), { mode: "export" });
      }
      return renderBlockHtml(block, { mode: "export" });
    })
    .join("");
  return wrapEmailHtml(content, document.layout.previewWidthPx);
};
