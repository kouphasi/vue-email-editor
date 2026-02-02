<template>
  <div class="ee-canvas-table-block">
    <table class="ee-table">
      <tbody>
        <tr v-for="row in block.rows" :key="row.id">
          <td
            v-for="(cell, index) in row.cells"
            :key="cell.id"
            class="ee-table-cell"
            :style="getCellStyle(row, index)"
          >
            <div v-if="cell.blocks.length === 0" class="ee-cell-empty">
              Empty cell
            </div>
            <div v-else v-html="renderCellBlocks(cell.blocks)"></div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { CellBlock, TableBlock, TableRow } from "../../core/types";
import { renderBlockHtml } from "../../rendering/html_renderer";
import { resolveCellWidths } from "../../core/table_utils";

const props = defineProps<{
  block: TableBlock;
}>();

const getCellStyle = (row: TableRow, index: number): Record<string, string> => {
  const padding = Number.isFinite(props.block.cellPadding ?? undefined)
    ? String(props.block.cellPadding ?? 8)
    : "8";
  const widths = resolveCellWidths(row, props.block.columnCount);
  const width = widths[index] ?? (props.block.columnCount > 0 ? 100 / props.block.columnCount : 100);
  return {
    width: `${width}%`,
    padding: `${padding}px`,
    verticalAlign: "top"
  };
};

const BLOCKED_TAGS = [
  "script",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "base",
  "form"
].join(",");

const URL_ATTRS = new Set(["href", "src", "xlink:href", "formaction"]);
const JAVASCRIPT_URL_RE = /^\s*javascript:/i;

const sanitizeHtml = (html: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  doc.querySelectorAll(BLOCKED_TAGS).forEach((el) => el.remove());

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  let currentNode = walker.currentNode as Element | null;

  while (currentNode) {
    for (const attr of Array.from(currentNode.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      if (name.startsWith("on")) {
        currentNode.removeAttribute(attr.name);
        continue;
      }

      if (name === "style") {
        currentNode.removeAttribute(attr.name);
        continue;
      }

      if (URL_ATTRS.has(name) && JAVASCRIPT_URL_RE.test(value)) {
        currentNode.removeAttribute(attr.name);
      }
    }

    currentNode = walker.nextNode() as Element | null;
  }

  return doc.body.innerHTML;
};

const renderCellBlocks = (blocks: CellBlock[]): string => {
  return blocks
    .map((block) => {
      if (block.type === "html") {
        return sanitizeHtml(block.content);
      }
      return renderBlockHtml(block);
    })
    .join("");
};
</script>

<style scoped>
.ee-canvas-table-block {
  margin: 0 0 16px 0;
}

.ee-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  background: #ffffff;
  pointer-events: none;
}

.ee-table-cell {
  border: 1px dashed #e5e7eb;
  box-sizing: border-box;
}

.ee-cell-empty {
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  padding: 12px;
  border: 1px dashed #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
}
</style>
