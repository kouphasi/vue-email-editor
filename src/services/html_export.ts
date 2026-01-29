import {
  CustomBlockDefinition,
  CustomBlockInstance,
  Document,
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
    }

    if (block.type === "button") {
      if (!isValidHttpUrl(block.url)) {
        errors.push(`Invalid button URL for block ${block.id}`);
      }

      if (!isValidHexColor(block.textColor) || !isValidHexColor(block.backgroundColor)) {
        errors.push(`Invalid button colors for block ${block.id}`);
      }

      if (!isValidFontSize(block.fontSize)) {
        errors.push(`Invalid button font size for block ${block.id}`);
      }
    }

    if (block.type === "image") {
      if (!isValidHttpUrl(block.url)) {
        errors.push(`Invalid image URL for block ${block.id}`);
      }

      if (block.status !== "ready") {
        errors.push(`Image block ${block.id} is not ready for export`);
      }
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
