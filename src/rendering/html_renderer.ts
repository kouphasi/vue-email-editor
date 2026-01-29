import {
  Block,
  BlockAlign,
  ButtonBlock,
  CustomBlockDefinition,
  CustomBlockInstance,
  HtmlBlock,
  ImageBlock,
  TextBlock
} from "../core/types";
import { getCustomBlockDefinition } from "../core/custom_block_registry";
import { DEFAULT_FONT_SIZE_PX } from "../core/validation";

const escapeHtml = (value: string): string => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const BLOCK_ALIGNS: BlockAlign[] = ["left", "center", "right"];

const sanitizeAlign = (align: string | undefined, fallback: BlockAlign): BlockAlign => {
  if (!align) {
    return fallback;
  }

  return BLOCK_ALIGNS.includes(align as BlockAlign) ? (align as BlockAlign) : fallback;
};

const renderTextRuns = (text: string, runs: TextBlock["runs"]): string => {
  if (runs.length === 0) {
    return escapeHtml(text).replaceAll("\n", "<br />");
  }

  const sorted = [...runs].sort((a, b) => a.start - b.start);
  let cursor = 0;
  let html = "";

  for (const run of sorted) {
    if (run.start > cursor) {
      html += escapeHtml(text.slice(cursor, run.start));
    }

    const content = escapeHtml(text.slice(run.start, run.end));
    const styles: string[] = [];

    if (run.bold) {
      styles.push("font-weight:700");
    }

    if (run.color) {
      styles.push(`color:${run.color}`);
    }

    if (styles.length > 0) {
      html += `<span style=\"${styles.join(";")}\">${content}</span>`;
    } else {
      html += content;
    }

    cursor = run.end;
  }

  if (cursor < text.length) {
    html += escapeHtml(text.slice(cursor));
  }

  return html.replaceAll("\n", "<br />");
};

const renderTextBlock = (block: TextBlock): string => {
  const align = sanitizeAlign(block.align, "left");
  const content = renderTextRuns(block.text, block.runs);
  const fontSize = block.fontSize ?? DEFAULT_FONT_SIZE_PX;
  return `<div style=\"text-align:${align};font-family:Helvetica,Arial,sans-serif;font-size:${fontSize}px;line-height:1.6;color:#1b1b1b;margin:0 0 12px 0;\">${content}</div>`;
};

const renderButtonBlock = (block: ButtonBlock): string => {
  const align = sanitizeAlign(block.align, "left");
  const radius = block.shape === "pill" ? 999 : block.shape === "rounded" ? 8 : 0;
  const label = escapeHtml(block.label);
  const fontSize = block.fontSize ?? DEFAULT_FONT_SIZE_PX;
  const styles = [
    "display:inline-block",
    `background-color:${block.backgroundColor}`,
    `color:${block.textColor}`,
    `border-radius:${radius}px`,
    "text-decoration:none",
    "font-family:Helvetica,Arial,sans-serif",
    `font-size:${fontSize}px`,
    "padding:12px 20px"
  ];

  return `<div style=\"text-align:${align};margin:0 0 16px 0;\"><a href=\"${block.url}\" style=\"${styles.join(
    ";"
  )}\">${label}</a></div>`;
};

const renderImageBlock = (block: ImageBlock): string => {
  const align = sanitizeAlign(block.display.align, "center");
  const width = block.display.widthPx ? `width:${block.display.widthPx}px;` : "";
  const height = block.display.heightPx ? `height:${block.display.heightPx}px;` : "";
  const styles = ["display:block", "border:0", width, height].filter(Boolean).join("");

  return `<div style=\"text-align:${align};margin:0 0 16px 0;\"><img src=\"${block.url}\" alt=\"\" style=\"${styles}\" /></div>`;
};

const renderHtmlBlock = (block: HtmlBlock): string => {
  return block.content;
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

const mergeConfigWithDefaults = (
  definition: CustomBlockDefinition,
  config: Record<string, unknown>
): Record<string, unknown> => {
  const baseConfig = deepMerge(
    buildSchemaDefaults(definition),
    definition.defaultConfig
  ) as Record<string, unknown>;
  return deepMerge(baseConfig, config) as Record<string, unknown>;
};

const renderCustomBlockPlaceholder = (
  definitionId: string,
  reason: "missing" | "invalid"
): string => {
  const title = reason === "missing" ? "Missing custom block" : "Invalid custom block";
  const detail = definitionId ? `: ${escapeHtml(definitionId)}` : "";
  return `
    <div style="border:1px dashed #f59e0b;background:#fffbeb;padding:12px;border-radius:8px;font-family:Helvetica,Arial,sans-serif;color:#92400e;margin:0 0 16px 0;">
      <strong>${title}${detail}</strong>
      <div style="font-size:13px;margin-top:6px;">This block cannot be rendered. The configuration is preserved.</div>
    </div>
  `;
};

const renderCustomBlock = (block: CustomBlockInstance, mode: "preview" | "export"): string => {
  if (block.state === "missing-definition") {
    return renderCustomBlockPlaceholder(block.definitionId, "missing");
  }

  const definition = getCustomBlockDefinition(block.definitionId);
  if (!definition) {
    return renderCustomBlockPlaceholder(block.definitionId, "missing");
  }

  if (block.state === "invalid") {
    return renderCustomBlockPlaceholder(block.definitionId, "invalid");
  }

  try {
    const mergedConfig = mergeConfigWithDefaults(definition, block.config);
    const html = definition.renderHtml(mergedConfig, { mode });
    if (typeof html !== "string") {
      return renderCustomBlockPlaceholder(block.definitionId, "invalid");
    }
    return html;
  } catch {
    return renderCustomBlockPlaceholder(block.definitionId, "invalid");
  }
};

export const renderBlockHtml = (
  block: Block,
  context: { mode: "preview" | "export" } = { mode: "preview" }
): string => {
  switch (block.type) {
    case "text":
      return renderTextBlock(block);
    case "button":
      return renderButtonBlock(block);
    case "image":
      return renderImageBlock(block);
    case "html":
      return renderHtmlBlock(block);
    case "custom":
      return renderCustomBlock(block, context.mode);
    default:
      return "";
  }
};
