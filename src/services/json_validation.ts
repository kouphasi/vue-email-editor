import {
  Block,
  BlockAlign,
  ButtonBlock,
  CustomBlockDefinition,
  CustomBlockInstance,
  Document,
  HtmlBlock,
  ImageBlock,
  LayoutSettings,
  TextBlock
} from "../core/types";
import { getCustomBlockDefinition } from "../core/custom_block_registry";
import { validateSettingsSchema } from "../core/custom_block_validation";
import {
  areTextRunsValid,
  isValidFontSize,
  isValidHexColor,
  isValidHttpUrl
} from "../core/validation";

const BLOCK_ALIGNS: BlockAlign[] = ["left", "center", "right"];

const isBlockAlignValid = (align: BlockAlign | undefined): boolean => {
  return align == null || BLOCK_ALIGNS.includes(align);
};

const isLayoutValid = (layout: LayoutSettings): boolean => {
  return (
    (layout.previewMode === "mobile" && layout.previewWidthPx === 375) ||
    (layout.previewMode === "desktop" && layout.previewWidthPx === 640)
  );
};

const validateTextBlock = (block: TextBlock): string[] => {
  const errors: string[] = [];

  if (!areTextRunsValid(block.text, block.runs)) {
    errors.push(`Text runs invalid for block ${block.id}`);
  }

  for (const run of block.runs) {
    if (!isValidHexColor(run.color)) {
      errors.push(`Invalid text run color in block ${block.id}`);
      break;
    }
  }

  if (!isBlockAlignValid(block.align)) {
    errors.push(`Invalid text alignment in block ${block.id}`);
  }

  if (!isValidFontSize(block.fontSize)) {
    errors.push(`Invalid text font size in block ${block.id}`);
  }

  return errors;
};

const validateButtonBlock = (block: ButtonBlock): string[] => {
  const errors: string[] = [];

  if (!isValidHttpUrl(block.url)) {
    errors.push(`Invalid button URL in block ${block.id}`);
  }

  if (!isValidHexColor(block.textColor) || !isValidHexColor(block.backgroundColor)) {
    errors.push(`Invalid button color in block ${block.id}`);
  }

  if (!isBlockAlignValid(block.align)) {
    errors.push(`Invalid button alignment in block ${block.id}`);
  }

  if (!isValidFontSize(block.fontSize)) {
    errors.push(`Invalid button font size in block ${block.id}`);
  }

  return errors;
};

const IMAGE_STATUSES: ImageBlock["status"][] = ["pending", "ready", "uploading", "error"];

const validateImageBlock = (block: ImageBlock): string[] => {
  const errors: string[] = [];

  if (block.url && !isValidHttpUrl(block.url)) {
    errors.push(`Invalid image URL in block ${block.id}`);
  }

  if (!IMAGE_STATUSES.includes(block.status)) {
    errors.push(`Invalid image status in block ${block.id}`);
  }

  if (!isBlockAlignValid(block.display.align)) {
    errors.push(`Invalid image alignment in block ${block.id}`);
  }

  return errors;
};

const validateHtmlBlock = (block: HtmlBlock): string[] => {
  const errors: string[] = [];

  if (typeof block.content !== "string") {
    errors.push(`Invalid html content in block ${block.id}`);
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

const validateCustomBlock = (block: CustomBlockInstance): string[] => {
  const errors: string[] = [];

  if (!block.definitionId || typeof block.definitionId !== "string") {
    errors.push(`Custom block ${block.id} is missing a definitionId`);
  }

  if (!isPlainObject(block.config)) {
    errors.push(`Custom block ${block.id} has invalid config payload`);
  }

  if (block.state !== "ready" && block.state !== "invalid" && block.state !== "missing-definition") {
    errors.push(`Custom block ${block.id} has invalid state`);
  }

  if (typeof block.readOnly !== "boolean") {
    errors.push(`Custom block ${block.id} has invalid readOnly flag`);
  }

  const definition = block.definitionId
    ? getCustomBlockDefinition(block.definitionId)
    : undefined;

  if (!definition) {
    return errors;
  }

  const baseConfig = deepMerge(
    buildSchemaDefaults(definition),
    definition.defaultConfig
  ) as Record<string, unknown>;
  const mergedConfig = deepMerge(baseConfig, block.config) as Record<string, unknown>;

  const schemaValidation = validateSettingsSchema(definition.settingsSchema, mergedConfig);
  if (!schemaValidation.ok) {
    if (schemaValidation.missingFields.length > 0) {
      errors.push(
        `Custom block ${block.id} missing required fields: ${schemaValidation.missingFields.join(", ")}`
      );
    }
    for (const issue of schemaValidation.errors ?? []) {
      errors.push(`Custom block ${block.id} field ${issue.field}: ${issue.message}`);
    }
  }

  try {
    const definitionValidation = definition.validate(mergedConfig);
    if (!definitionValidation.ok) {
      if (definitionValidation.missingFields.length > 0) {
        errors.push(
          `Custom block ${block.id} missing required fields: ${definitionValidation.missingFields.join(", ")}`
        );
      }
      for (const issue of definitionValidation.errors ?? []) {
        errors.push(`Custom block ${block.id} field ${issue.field}: ${issue.message}`);
      }
    }
  } catch (error) {
    errors.push(
      `Custom block ${block.id} validation threw an error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return errors;
};

const validateBlock = (block: Block): string[] => {
  switch (block.type) {
    case "text":
      return validateTextBlock(block);
    case "button":
      return validateButtonBlock(block);
    case "image":
      return validateImageBlock(block);
    case "html":
      return validateHtmlBlock(block);
    case "custom":
      return validateCustomBlock(block);
    default:
      return [`Unknown block type for block ${(block as Block).id}`];
  }
};

export const validateDocument = (document: Document): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!document.id) {
    errors.push("Document id is required");
  }

  if (!Array.isArray(document.blocks)) {
    errors.push("Document blocks must be an array");
  }

  if (!document.layout || !isLayoutValid(document.layout)) {
    errors.push("Document layout is invalid");
  }

  for (const block of document.blocks) {
    errors.push(...validateBlock(block));
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
