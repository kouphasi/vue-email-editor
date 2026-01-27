import { Block, ButtonBlock, ImageBlock, TextBlock, HtmlBlock } from "../core/types";

const escapeHtml = (value: string): string => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
  const content = renderTextRuns(block.text, block.runs);
  return `<div style=\"font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1b1b1b;margin:0 0 12px 0;\">${content}</div>`;
};

const renderButtonBlock = (block: ButtonBlock): string => {
  const radius = block.shape === "pill" ? 999 : block.shape === "rounded" ? 8 : 0;
  const label = escapeHtml(block.label);
  const styles = [
    "display:inline-block",
    `background-color:${block.backgroundColor}`,
    `color:${block.textColor}`,
    `border-radius:${radius}px`,
    "text-decoration:none",
    "font-family:Helvetica,Arial,sans-serif",
    "font-size:16px",
    "padding:12px 20px"
  ];

  return `<div style=\"margin:0 0 16px 0;\"><a href=\"${block.url}\" style=\"${styles.join(
    ";"
  )}\">${label}</a></div>`;
};

const renderImageBlock = (block: ImageBlock): string => {
  const align = block.display.align ?? "center";
  const width = block.display.widthPx ? `width:${block.display.widthPx}px;` : "";
  const height = block.display.heightPx ? `height:${block.display.heightPx}px;` : "";
  const styles = ["display:block", "border:0", width, height].filter(Boolean).join("");

  return `<div style=\"text-align:${align};margin:0 0 16px 0;\"><img src=\"${block.url}\" alt=\"\" style=\"${styles}\" /></div>`;
};

const renderHtmlBlock = (block: HtmlBlock): string => {
  return block.content;
};

export const renderBlockHtml = (block: Block): string => {
  switch (block.type) {
    case "text":
      return renderTextBlock(block);
    case "button":
      return renderButtonBlock(block);
    case "image":
      return renderImageBlock(block);
    case "html":
      return renderHtmlBlock(block);
    default:
      return "";
  }
};
