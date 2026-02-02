<template>
  <div class="ee-root">
    <div class="ee-toolbar">
      <div class="ee-toolbar-group">
        <div class="ee-toolbar-label">Add elements</div>
        <BlockPicker @add="handleAddBlock" />
      </div>
      
      <div class="ee-toolbar-group ee-preview-actions">
        <button
          type="button"
          class="ee-action-button"
          @click="showFinalPreview = true"
        >
          👁️ Final Preview
        </button>
        <button
          type="button"
          class="ee-action-button"
          @click="handleExportHtml"
        >
          Export HTML
        </button>
      </div>
    </div>

    <div class="ee-workspace">
      <div class="ee-canvas-area" @click="handleCanvasAreaClick">
        <EditorCanvas
          ref="canvasRef"
          :document="editorDocument"
          :editor-state="editorState"
          @update-block="handleUpdateBlock"
          @delete-block="handleDeleteBlock"
          @reorder="handleReorder"
          @select-block="handleSelectBlock"
          @set-editing="handleSetEditing"
          @select-cell-block="handleSelectCellBlock"
          @move-block-to-cell="handleMoveBlockToCell"
          @move-cell-to-top-level="handleMoveCellBlockToTopLevel"
          @move-cell-to-cell="handleMoveCellBlockToCell"
          @delete-cell-block="handleDeleteCellBlock"
        />
      </div>
      
      <div class="ee-sidebar-area">
        <PropertiesSidebar
          :document="editorDocument"
          :editor-state="editorState"
          :on-image-upload="onImageUpload"
          @update-layout="handleUpdateLayout"
          @update-block="handleUpdateBlock"
          @update-cell-block="handleUpdateCellBlock"
          @delete-cell-block="handleDeleteCellBlock"
          @select-block="handleSelectBlock"
          @select-cell-block-from-table="handleSelectCellBlock"
          @format-bold="handleFormatBold"
          @format-color="handleFormatColor"
        />
      </div>
    </div>

    <!-- Final Preview Modal -->
    <div v-if="showFinalPreview" class="ee-modal-overlay" @click="showFinalPreview = false">
      <div class="ee-modal-content" @click.stop>
        <div class="ee-modal-header">
          <h3>Final Preview</h3>
          <button class="ee-close-btn" @click="showFinalPreview = false">×</button>
        </div>
        <div class="ee-modal-body">
           <div class="ee-preview-toolbar">
              <PreviewToggle
                :mode="previewMode"
                @change="previewMode = $event"
              />
           </div>
           <div class="ee-preview-container" :style="{ width: previewWidth }">
              <iframe
                class="ee-preview-frame"
                :srcdoc="finalPreviewHtml"
                title="Email Preview"
              ></iframe>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, toRefs } from "vue";
import type { Block, CellBlock, Document, PreviewMode, EditorState, LayoutSettings, TableBlock } from "../core/types";
import type { ImageUploadHandler } from "../core/editor_api";
import {
  addBlock,
  createDocument,
  deleteBlock,
  deleteCellBlock,
  moveBlockToCell,
  moveCellBlockToCell,
  moveCellBlockToTopLevel,
  reorderBlocks,
  setPreviewMode,
  updateBlock,
  updateLayout
} from "../services/document_service";
import { exportHtml } from "../services/html_export";
import { parseDocument } from "../services/json_import";
import { serializeDocument } from "../services/json_export";
import { validateDocument } from "../services/json_validation";
import { renderBlockHtml } from "../rendering/html_renderer";
import { wrapEmailHtml } from "../rendering/html_templates";
import BlockPicker from "./components/BlockPicker.vue";
import PreviewToggle from "./components/PreviewToggle.vue";
import EditorCanvas from "./canvas/EditorCanvas.vue";
import PropertiesSidebar from "./sidebar/PropertiesSidebar.vue";

const props = defineProps<{
  json?: string;
  document?: Document | null;
  previewMode?: PreviewMode;
  onImageUpload?: ImageUploadHandler;
}>();

const emit = defineEmits<{
  (event: "update:json", value: string): void;
  (event: "change", value: Document): void;
  (event: "error", value: Error): void;
}>();

const { onImageUpload } = toRefs(props);
const resolvedJson = computed(() => props.json);
const previewModeProp = computed<PreviewMode>(() => props.previewMode ?? "mobile");

const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `doc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const documentRef = ref<Document>(createDocument(createId()));
let lastSerialized = serializeDocument(documentRef.value);

const editorDocument = computed(() => documentRef.value);

// Editor State
const editorState = ref<EditorState>({
  selectedBlockId: null,
  isEditingText: false,
  parentTableContext: null
});

const showFinalPreview = ref(false);
const canvasRef = ref<InstanceType<typeof EditorCanvas> | null>(null);

const previewMode = computed<PreviewMode>({
  get: () => editorDocument.value.layout.previewMode,
  set: (mode) => {
    if (editorDocument.value.layout.previewMode === mode) {
      return;
    }
    setDocument(setPreviewMode(documentRef.value, mode), true);
  }
});

const finalPreviewHtml = computed(() => {
  const content = editorDocument.value.blocks
    .map((block) => renderBlockHtml(block, { mode: "preview" }))
    .join("");
  const width = previewMode.value === "mobile" ? 375 : 640;
  return wrapEmailHtml(content, width, { responsive: true });
});

const previewWidth = computed(() => {
    return previewMode.value === "mobile" ? "375px" : "640px";
});

const setDocument = (next: Document, emitChanges: boolean): void => {
  documentRef.value = next;
  const json = serializeDocument(next);
  lastSerialized = json;

  if (emitChanges) {
    emit("change", next);
    emit("update:json", json);
  }
};

const tryLoadDocument = (next: Document, emitChanges: boolean): void => {
  const validation = validateDocument(next);
  if (!validation.valid) {
    emit("error", new Error(validation.errors.join("; ")));
    return;
  }
  setDocument(next, emitChanges);
};

const tryLoadJson = (value: string, emitChanges: boolean): void => {
  try {
    const parsed = parseDocument(value);
    setDocument(parsed, emitChanges);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    emit("error", new Error(message));
  }
};

// Initial load
if (props.document) {
  tryLoadDocument(props.document, false);
} else if (resolvedJson.value) {
  tryLoadJson(resolvedJson.value, false);
} else {
  setDocument(setPreviewMode(documentRef.value, previewModeProp.value), false);
}

// Handlers
const handleAddBlock = (block: Block): void => {
  setDocument(addBlock(documentRef.value, block), true);
  // Auto-select the new block?
  editorState.value.selectedBlockId = block.id;
  editorState.value.isEditingText = false; // Add blocks usually don't start in edit mode unless we want to
};

const handleUpdateBlock = (block: Block): void => {
  setDocument(updateBlock(documentRef.value, block.id, () => block), true);
};

const handleReorder = (fromIndex: number, toIndex: number): void => {
  setDocument(reorderBlocks(documentRef.value, fromIndex, toIndex), true);
};

const handleDeleteBlock = (blockId: string): void => {
  setDocument(deleteBlock(documentRef.value, blockId), true);
  if (editorState.value.selectedBlockId === blockId) {
    editorState.value.selectedBlockId = null;
  }
};

const handleUpdateLayout = (layout: LayoutSettings): void => {
    setDocument(updateLayout(documentRef.value, layout), true);
};

const handleSelectBlock = (blockId: string | null): void => {
  editorState.value.selectedBlockId = blockId;
  editorState.value.parentTableContext = null;
};

const handleSelectCellBlock = (tableBlockId: string, cellId: string, blockId: string): void => {
  editorState.value.selectedBlockId = blockId;
  editorState.value.parentTableContext = {
    tableBlockId,
    cellId
  };
  editorState.value.isEditingText = false;
};

const handleUpdateCellBlock = (cellBlock: CellBlock): void => {
  const ctx = editorState.value.parentTableContext;
  if (!ctx) {
    return;
  }
  const tableBlock = documentRef.value.blocks.find(
    (b) => b.id === ctx.tableBlockId && b.type === "table"
  ) as TableBlock | undefined;
  if (!tableBlock) {
    return;
  }
  const updatedRows = tableBlock.rows.map((row) => ({
    ...row,
    cells: row.cells.map((cell) => {
      if (cell.id !== ctx.cellId) {
        return cell;
      }
      return {
        ...cell,
        blocks: cell.blocks.map((block) =>
          block.id === cellBlock.id ? cellBlock : block
        )
      };
    })
  }));
  const updatedTable: TableBlock = {
    ...tableBlock,
    rows: updatedRows
  };
  setDocument(updateBlock(documentRef.value, updatedTable.id, () => updatedTable), true);
};

const handleDeleteCellBlock = (
  tableBlockId: string,
  cellId: string,
  blockId: string
): void => {
  const tableBlock = documentRef.value.blocks.find(
    (b) => b.id === tableBlockId && b.type === "table"
  ) as TableBlock | undefined;
  if (!tableBlock) {
    return;
  }
  const updatedTable = deleteCellBlock(tableBlock, cellId, blockId);
  setDocument(updateBlock(documentRef.value, updatedTable.id, () => updatedTable), true);
  if (editorState.value.selectedBlockId === blockId) {
    editorState.value.selectedBlockId = tableBlockId;
    editorState.value.parentTableContext = null;
    editorState.value.isEditingText = false;
  }
};

const handleMoveBlockToCell = (blockIndex: number, tableBlockId: string, cellId: string) => {
  const sourceBlock = documentRef.value.blocks[blockIndex];
  const result = moveBlockToCell(documentRef.value, blockIndex, tableBlockId, cellId);
  if (!result) {
    return;
  }
  setDocument(result, true);
  if (sourceBlock && editorState.value.selectedBlockId === sourceBlock.id) {
    editorState.value.parentTableContext = { tableBlockId, cellId };
    editorState.value.isEditingText = false;
  }
};

const handleMoveCellBlockToTopLevel = (
  tableBlockId: string,
  cellId: string,
  blockId: string,
  targetIndex: number
) => {
  const result = moveCellBlockToTopLevel(
    documentRef.value,
    tableBlockId,
    cellId,
    blockId,
    targetIndex
  );
  if (result === documentRef.value) {
    return;
  }
  setDocument(result, true);
  if (editorState.value.selectedBlockId === blockId) {
    editorState.value.parentTableContext = null;
    editorState.value.isEditingText = false;
  }
};

const handleMoveCellBlockToCell = (
  sourceTableId: string,
  sourceCellId: string,
  blockId: string,
  targetTableId: string,
  targetCellId: string
) => {
  const result = moveCellBlockToCell(
    documentRef.value,
    sourceTableId,
    sourceCellId,
    blockId,
    targetTableId,
    targetCellId
  );
  if (!result) {
    return;
  }
  setDocument(result, true);
  if (editorState.value.selectedBlockId === blockId) {
    editorState.value.parentTableContext = { tableBlockId: targetTableId, cellId: targetCellId };
    editorState.value.isEditingText = false;
  }
};

const handleSetEditing = (isEditing: boolean): void => {
  editorState.value.isEditingText = isEditing;
};

const handleCanvasAreaClick = (e: MouseEvent) => {
    // If clicking the gray area outside canvas, deselect
    if (e.target === e.currentTarget) {
        editorState.value.selectedBlockId = null;
        editorState.value.isEditingText = false;
    }
};

const handleFormatBold = () => {
    canvasRef.value?.toggleBold();
};

const handleFormatColor = (color: string) => {
    canvasRef.value?.setColor(color);
};

const handleExportHtml = () => {
    const html = exportHtml(documentRef.value);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "email.html";
    a.click();
    URL.revokeObjectURL(url);
};

watch(
  () => resolvedJson.value,
  (value) => {
    if (props.document || !value || value === lastSerialized) {
      return;
    }
    tryLoadJson(value, false);
  }
);

watch(
  () => props.document,
  (value) => {
    if (!value) return;
    tryLoadDocument(value, false);
  }
);

watch(
  () => props.previewMode,
  (mode) => {
    if (!mode) {
      return;
    }
    if (documentRef.value.layout.previewMode === mode) {
      return;
    }
    setDocument(setPreviewMode(documentRef.value, mode), false);
  }
);

defineExpose({
  loadJson: (json: string) => tryLoadJson(json, true),
  loadDocument: (next: Document) => tryLoadDocument(next, true),
  exportJson: () => serializeDocument(documentRef.value),
  exportHtml: () => exportHtml(documentRef.value),
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:wght@500;600&display=swap");

.ee-root {
  --ee-font-body: "IBM Plex Sans", "Segoe UI", sans-serif;
  --ee-font-display: "IBM Plex Serif", "Times New Roman", serif;
  --ee-text-color: #1c1915;
  --ee-bg: #f3f4f6;
  --ee-surface: #ffffff;
  --ee-border: #e5e7eb;
  --ee-muted: #6b7280;
  --ee-primary: #0f766e;
  
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--ee-bg);
  color: var(--ee-text-color);
  font-family: var(--ee-font-body);
}

.ee-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: var(--ee-surface);
  border-bottom: 1px solid var(--ee-border);
}

.ee-toolbar-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ee-toolbar-label {
    font-size: 14px;
    font-weight: 600;
}

.ee-action-button {
    background: white;
    border: 1px solid var(--ee-border);
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
}
.ee-action-button:hover {
    background: #f9fafb;
}

.ee-workspace {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.ee-canvas-area {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
  display: flex;
  justify-content: center;
  background: #f3f4f6;
  cursor: default; /* Make sure clicking bg is possible */
}

.ee-sidebar-area {
  width: 320px;
  border-left: 1px solid var(--ee-border);
  background: var(--ee-surface);
  display: flex;
  flex-direction: column;
}

/* Modal */
.ee-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.ee-modal-content {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    width: 90vw;
    height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.ee-modal-header {
    padding: 16px 24px;
    border-bottom: 1px solid var(--ee-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.ee-modal-header h3 {
    margin: 0;
    font-weight: 600;
}

.ee-close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    padding: 4px;
}

.ee-modal-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #f3f4f6;
}

.ee-preview-toolbar {
    padding: 12px;
    display: flex;
    justify-content: center;
    border-bottom: 1px solid var(--ee-border);
    background: white;
}

.ee-preview-container {
    flex: 1;
    margin: 24px auto;
    background: white;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.ee-preview-frame {
    width: 100%;
    height: 100%;
    border: none;
}
</style>
