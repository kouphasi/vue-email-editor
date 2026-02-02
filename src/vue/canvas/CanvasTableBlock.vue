<template>
  <div class="ee-canvas-table-block">
    <table class="ee-table">
      <tbody>
        <tr v-for="row in block.rows" :key="row.id">
          <td
            v-for="(cell, index) in row.cells"
            :key="cell.id"
            class="ee-table-cell"
            :class="{
              'is-drag-over': dragOverCellId === cell.id && dragOverState === 'allowed',
              'is-drop-disabled': dragOverCellId === cell.id && dragOverState === 'blocked'
            }"
            :style="getCellStyle(row, index)"
            @dragover="handleCellDragOver(cell, $event)"
            @dragleave="handleCellDragLeave(cell.id)"
            @drop="handleCellDrop(cell.id, $event)"
          >
            <div
              v-if="cell.blocks.length === 0"
              class="ee-cell-empty"
              :class="{
                'is-drag-over': dragOverCellId === cell.id && dragOverState === 'allowed',
                'is-drop-disabled': dragOverCellId === cell.id && dragOverState === 'blocked'
              }"
            >
              Empty cell
            </div>
            <div
              v-for="cellBlock in cell.blocks"
              :key="cellBlock.id"
              class="ee-cell-block-wrapper"
              :class="{
                'is-selected': selectedCellBlockId === cellBlock.id,
                'is-dragging': dragSource?.type === 'cell' && dragSource.blockId === cellBlock.id
              }"
              draggable="true"
              @click.stop="handleCellBlockClick(cell.id, cellBlock.id)"
              @dragstart="handleCellBlockDragStart(cell.id, cellBlock.id, $event)"
              @dragend="handleCellBlockDragEnd"
            >
              <div v-html="renderSingleBlock(cellBlock)"></div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { BlockType, CellBlock, TableBlock, TableCell, TableRow } from "../../core/types";
import { renderBlockHtml } from "../../rendering/html_renderer";
import { resolveCellWidths } from "../../core/table_utils";

type DragSource =
  | {
      type: "top-level";
      blockId: string;
      index: number;
      blockType: BlockType;
    }
  | {
      type: "cell";
      blockId: string;
      tableBlockId: string;
      cellId: string;
      blockType: BlockType;
    };

const props = defineProps<{
  block: TableBlock;
  selectedCellBlockId?: string | null;
  dragSource?: DragSource | null;
}>();

const emit = defineEmits<{
  (event: "select-cell-block", cellId: string, blockId: string): void;
  (event: "cell-block-drag-start", cellId: string, blockId: string, event: DragEvent): void;
  (event: "cell-block-drag-end"): void;
  (event: "cell-drop", cellId: string): void;
}>();

const dragOverCellId = ref<string | null>(null);
const dragOverState = ref<"allowed" | "blocked" | null>(null);

const handleCellBlockClick = (cellId: string, blockId: string) => {
  emit("select-cell-block", cellId, blockId);
};

const handleCellBlockDragStart = (cellId: string, blockId: string, event: DragEvent) => {
  emit("cell-block-drag-start", cellId, blockId, event);
};

const handleCellBlockDragEnd = () => {
  emit("cell-block-drag-end");
};

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

const isDragSourceCell = (cellId: string): boolean => {
  return (
    props.dragSource?.type === "cell" &&
    props.dragSource.tableBlockId === props.block.id &&
    props.dragSource.cellId === cellId
  );
};

const isDropAllowed = (cell: TableCell): boolean => {
  if (!props.dragSource) {
    return false;
  }
  if (cell.blocks.length > 0) {
    return false;
  }
  if (props.dragSource.blockType === "table" || props.dragSource.blockType === "custom") {
    return false;
  }
  if (isDragSourceCell(cell.id)) {
    return false;
  }
  return true;
};

const handleCellDragOver = (cell: TableCell, event: DragEvent) => {
  if (!props.dragSource) {
    dragOverCellId.value = null;
    dragOverState.value = null;
    return;
  }
  if (isDragSourceCell(cell.id)) {
    dragOverCellId.value = cell.id;
    dragOverState.value = "blocked";
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  const allowed = isDropAllowed(cell);
  dragOverCellId.value = cell.id;
  dragOverState.value = allowed ? "allowed" : "blocked";
  if (allowed) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }
};

const handleCellDragLeave = (cellId: string) => {
  if (dragOverCellId.value === cellId) {
    dragOverCellId.value = null;
    dragOverState.value = null;
  }
};

const handleCellDrop = (cellId: string, event: DragEvent) => {
  if (!props.dragSource) {
    return;
  }
  const cell = findCell(cellId);
  if (cell && isDragSourceCell(cell.id)) {
    event.preventDefault();
    event.stopPropagation();
    dragOverCellId.value = null;
    dragOverState.value = null;
    return;
  }
  if (!cell || !isDropAllowed(cell)) {
    dragOverCellId.value = null;
    dragOverState.value = null;
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  emit("cell-drop", cellId);
  dragOverCellId.value = null;
  dragOverState.value = null;
};

const findCell = (cellId: string): TableCell | null => {
  for (const row of props.block.rows) {
    const cell = row.cells.find((item) => item.id === cellId);
    if (cell) {
      return cell;
    }
  }
  return null;
};

watch(
  () => props.dragSource,
  (next) => {
    if (!next) {
      dragOverCellId.value = null;
      dragOverState.value = null;
    }
  }
);

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

const renderSingleBlock = (block: CellBlock): string => {
  if (block.type === "html") {
    return sanitizeHtml(block.content);
  }
  return renderBlockHtml(block);
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
}

.ee-table-cell {
  border: 1px dashed #e5e7eb;
  box-sizing: border-box;
}

.ee-table-cell.is-drag-over {
  background: #eff6ff;
  outline: 2px dashed #2563eb;
  outline-offset: -2px;
}

.ee-table-cell.is-drop-disabled {
  background: #fef2f2;
  outline: 2px dashed #ef4444;
  outline-offset: -2px;
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

.ee-cell-empty.is-drag-over {
  background: #dbeafe;
  border-color: #2563eb;
}

.ee-cell-empty.is-drop-disabled {
  background: #fee2e2;
  border-color: #ef4444;
}

.ee-cell-block-wrapper {
  cursor: pointer;
  border-radius: 4px;
  transition: outline 0.15s ease;
}

.ee-cell-block-wrapper.is-dragging {
  opacity: 0.5;
}

.ee-cell-block-wrapper:hover {
  outline: 2px solid #93c5fd;
}

.ee-cell-block-wrapper.is-selected {
  outline: 2px solid #2563eb;
}
</style>
