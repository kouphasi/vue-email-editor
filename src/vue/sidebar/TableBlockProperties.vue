<template>
  <div class="ee-properties-panel">
    <div class="ee-panel-section">
      <h3>Table Properties</h3>
      <div class="ee-control-group">
        <label>Columns</label>
        <select :value="block.columnCount" @change="handleColumnCountChange">
          <option v-for="count in columnOptions" :key="count" :value="count">
            {{ count }}
          </option>
        </select>
      </div>
      <div class="ee-control-group">
        <label>Cell padding (px)</label>
        <input
          type="number"
          min="0"
          step="1"
          :value="block.cellPadding ?? 8"
          @input="handleCellPaddingChange"
        />
      </div>
      <button type="button" class="ee-row-action" @click="handleAddRow">
        Add row
      </button>
    </div>

    <div
      v-for="(row, rowIndex) in block.rows"
      :key="row.id"
      class="ee-panel-section"
    >
      <div class="ee-row-header">
        <h4>Row {{ rowIndex + 1 }}</h4>
        <button
          v-if="block.rows.length > 1"
          type="button"
          class="ee-row-action ee-row-action--danger"
          @click="handleDeleteRow(row.id)"
        >
          Delete row
        </button>
      </div>
      <div
        class="ee-row-grid"
        :style="{ gridTemplateColumns: `repeat(${row.cells.length}, minmax(0, 1fr))` }"
      >
        <div v-for="(cell, cellIndex) in row.cells" :key="cell.id" class="ee-cell-card">
          <div class="ee-cell-header">
            <span class="ee-cell-title">Cell {{ cellIndex + 1 }}</span>
            <div class="ee-cell-width">
              <label>Width %</label>
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                :value="getCellWidth(row, cellIndex)"
                @input="handleCellWidthChange(row, cellIndex, $event)"
              />
            </div>
          </div>

          <div class="ee-cell-blocks">
            <div v-if="cell.blocks.length === 0" class="ee-cell-empty">
              No blocks
            </div>
            <div
              v-for="cellBlock in cell.blocks"
              :key="cellBlock.id"
              class="ee-cell-block ee-cell-block--clickable"
              @click="handleSelectCellBlock(cell.id, cellBlock.id)"
            >
              <div class="ee-cell-block-header">
                <span class="ee-cell-block-label">{{ getBlockLabel(cellBlock) }}</span>
                <button
                  type="button"
                  class="ee-cell-block-remove"
                  @click.stop="handleDeleteCellBlock(cell.id, cellBlock.id)"
                >
                  Remove
                </button>
              </div>
              <div class="ee-cell-block-preview">
                <span v-if="cellBlock.type === 'text'" class="ee-preview-text">
                  {{ getPreviewText(cellBlock.text) }}
                </span>
                <span v-else-if="cellBlock.type === 'button'" class="ee-preview-button">
                  {{ cellBlock.label }}
                </span>
                <span v-else-if="cellBlock.type === 'image'" class="ee-preview-image">
                  {{ cellBlock.url ? "Image set" : "No image" }}
                </span>
                <span v-else-if="cellBlock.type === 'html'" class="ee-preview-html">
                  {{ cellBlock.content ? "HTML content" : "Empty HTML" }}
                </span>
              </div>
              <div class="ee-cell-block-edit-hint">Click to edit →</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CellBlock, TableBlock, TableRow } from "../../core/types";
import type { ImageUploadHandler } from "../../core/editor_api";
import {
  addRowToTable,
  deleteCellBlock,
  deleteRowFromTable,
  updateTableColumnCount
} from "../../services/document_service";

const props = defineProps<{
  block: TableBlock;
  onImageUpload?: ImageUploadHandler;
}>();

const emit = defineEmits<{
  (event: "update", block: TableBlock): void;
  (event: "select-cell-block", cellId: string, blockId: string): void;
}>();

const handleSelectCellBlock = (cellId: string, blockId: string) => {
  emit("select-cell-block", cellId, blockId);
};

const getPreviewText = (text: string): string => {
  if (!text) {
    return "(empty)";
  }
  if (text.length <= 30) {
    return text;
  }
  return text.slice(0, 30) + "...";
};

const columnOptions = [1, 2, 3, 4];

const splitEvenly = (total: number, count: number): number[] => {
  if (count <= 0) {
    return [];
  }
  const base = Math.floor(total / count);
  const remainder = total - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
};

const getCellWidth = (row: TableRow, cellIndex: number): number => {
  const cell = row.cells[cellIndex];
  if (cell && typeof cell.widthPercent === "number" && Number.isFinite(cell.widthPercent)) {
    return Math.round(cell.widthPercent);
  }
  const count = row.cells.length || props.block.columnCount || 1;
  const widths = splitEvenly(100, count);
  return widths[cellIndex] ?? Math.round(100 / count);
};

const updateRowWidths = (row: TableRow, cellIndex: number, nextValue: number): TableRow => {
  const count = row.cells.length;
  if (count === 0) {
    return row;
  }
  const minWidth = 1;
  const maxWidth = 100 - minWidth * (count - 1);
  const clamped = Math.min(Math.max(Math.round(nextValue), minWidth), maxWidth);
  const remaining = 100 - clamped;
  const otherCount = count - 1;
  const distributed = splitEvenly(remaining, otherCount);

  let otherIndex = 0;
  const cells = row.cells.map((cell, index) => {
    if (index === cellIndex) {
      return { ...cell, widthPercent: clamped };
    }
    const width = distributed[otherIndex] ?? Math.round(remaining / otherCount);
    otherIndex += 1;
    return { ...cell, widthPercent: width };
  });

  return {
    ...row,
    cells
  };
};

const handleColumnCountChange = (event: Event) => {
  const input = event.target as HTMLSelectElement;
  const next = Number(input.value);
  emit("update", updateTableColumnCount(props.block, next));
};

const handleCellPaddingChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.value.trim() === "") {
    emit("update", { ...props.block, cellPadding: undefined });
    return;
  }
  const value = Number(input.value);
  if (!Number.isFinite(value)) {
    return;
  }
  emit("update", { ...props.block, cellPadding: Math.max(0, Math.round(value)) });
};

const handleAddRow = () => {
  emit("update", addRowToTable(props.block));
};

const handleDeleteRow = (rowId: string) => {
  emit("update", deleteRowFromTable(props.block, rowId));
};

const handleCellWidthChange = (row: TableRow, cellIndex: number, event: Event) => {
  const input = event.target as HTMLInputElement;
  const value = Number(input.value);
  if (!Number.isFinite(value)) {
    return;
  }
  const nextRow = updateRowWidths(row, cellIndex, value);
  const rows = props.block.rows.map((item) => (item.id === row.id ? nextRow : item));
  emit("update", {
    ...props.block,
    rows
  });
};

const handleDeleteCellBlock = (cellId: string, blockId: string) => {
  emit("update", deleteCellBlock(props.block, cellId, blockId));
};

const getBlockLabel = (block: CellBlock): string => {
  switch (block.type) {
    case "text":
      return "Text";
    case "button":
      return "Button";
    case "image":
      return "Image";
    case "html":
      return "HTML";
    default:
      return "Block";
  }
};
</script>

<style scoped>
.ee-properties-panel {
  padding: 16px;
}

.ee-panel-section {
  margin-bottom: 20px;
}

.ee-panel-section h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #374151;
}

.ee-panel-section h4 {
  font-size: 13px;
  font-weight: 600;
  margin: 0;
  color: #374151;
}

.ee-control-group {
  margin-bottom: 12px;
}

.ee-control-group label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.ee-control-group input,
.ee-control-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.ee-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.ee-row-action {
  border: 1px solid #d1d5db;
  background: #ffffff;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
}

.ee-row-action--danger {
  border-color: #fecaca;
  color: #b91c1c;
}

.ee-row-grid {
  display: grid;
  gap: 12px;
}

.ee-cell-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  background: #ffffff;
}

.ee-cell-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.ee-cell-title {
  font-size: 12px;
  font-weight: 600;
  color: #111827;
}

.ee-cell-width label {
  display: block;
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 4px;
}

.ee-cell-width input {
  width: 80px;
  padding: 6px;
  font-size: 12px;
}

.ee-cell-blocks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ee-cell-empty {
  font-size: 12px;
  color: #9ca3af;
  border: 1px dashed #e5e7eb;
  padding: 8px;
  border-radius: 6px;
  text-align: center;
}

.ee-cell-block {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px;
  background: #f9fafb;
}

.ee-cell-block--clickable {
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.ee-cell-block--clickable:hover {
  border-color: #93c5fd;
  background: #eff6ff;
}

.ee-cell-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.ee-cell-block-label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.ee-cell-block-remove {
  border: none;
  background: transparent;
  color: #b91c1c;
  font-size: 12px;
  cursor: pointer;
}

.ee-cell-block-preview {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ee-preview-text,
.ee-preview-button,
.ee-preview-image,
.ee-preview-html {
  display: block;
}

.ee-cell-block-edit-hint {
  font-size: 11px;
  color: #2563eb;
  text-align: right;
}

</style>
