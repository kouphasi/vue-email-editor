import {
  Block,
  ButtonBlock,
  Document,
  ImageBlock,
  LayoutSettings,
  TextBlock
} from "../core/types";
import { areTextRunsValid, isValidHexColor, isValidHttpUrl } from "../core/validation";

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
