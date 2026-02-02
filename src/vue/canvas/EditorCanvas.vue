<template>
  <div
    class="ee-canvas-root"
    @click="handleBackgroundClick"
    :style="canvasStyle"
  >
    <div class="ee-canvas-content">
      <div
        v-for="(block, index) in document.blocks"
        :key="block.id"
        class="ee-block-wrapper"
        :class="{
          'is-dragging': draggingId === block.id,
          'is-drag-over-top': dragOverId === block.id && dragOverPosition === 'top',
          'is-drag-over-bottom': dragOverId === block.id && dragOverPosition === 'bottom'
        }"
        @dragover.prevent="handleDragOver(block.id, $event)"
        @dragleave="handleDragLeave(block.id)"
        @drop.prevent="handleDrop(block.id)"
      >
        <CanvasBlock
          :selected="selectedBlockId === block.id"
          @dragstart="handleDragStart(block, index, $event)"
          @dragend="handleDragEnd"
          @select="handleSelect(block.id)"
          @delete="handleDelete(block.id)"
        >
          <CanvasTextBlock
            v-if="block.type === 'text'"
            :block="block"
            :selected="selectedBlockId === block.id"
            :editing="selectedBlockId === block.id && isEditingText"
            :ref="makeTextBlockRef(block.id)"
            @update="handleUpdate(block.id, $event)"
            @edit="handleEdit(block.id)"
            @select="handleSelect(block.id)"
          />
          <CanvasButtonBlock
            v-else-if="block.type === 'button'"
            :block="block"
            :selected="selectedBlockId === block.id"
            @select="handleSelect(block.id)"
          />
          <CanvasImageBlock
            v-else-if="block.type === 'image'"
            :block="block"
            :selected="selectedBlockId === block.id"
            @select="handleSelect(block.id)"
          />
          <CanvasHtmlBlock
            v-else-if="block.type === 'html'"
            :block="block"
          />
          <CanvasTableBlock
            v-else-if="block.type === 'table'"
            :block="block"
            :selected-cell-block-id="getSelectedCellBlockId(block.id)"
            :drag-source="dragSource"
            @select-cell-block="(cellId, blockId) => handleSelectCellBlock(block.id, cellId, blockId)"
            @cell-block-drag-start="(cellId, blockId, event) => handleCellBlockDragStart(block.id, cellId, blockId, event)"
            @cell-block-drag-end="handleCellBlockDragEnd"
            @cell-block-delete="(cellId, blockId) => handleCellBlockDelete(block.id, cellId, blockId)"
            @cell-drop="(cellId) => handleCellDrop(block.id, cellId)"
          />
          <CanvasCustomBlock
            v-else-if="block.type === 'custom' && resolveCustomBlock(block).state === 'ready'"
            :block="resolveCustomBlock(block)"
          />
          <CanvasCustomBlockPlaceholder
            v-else-if="block.type === 'custom'"
            :definition-id="block.definitionId"
            :state="resolveCustomBlock(block).state"
          />
        </CanvasBlock>
      </div>
      
      <div v-if="document.blocks.length === 0" class="ee-empty-state">
        Add a block from the toolbar to get started
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, onBeforeUpdate } from "vue";
import type {
  Block,
  CellBlock,
  CustomBlockInstance,
  Document,
  EditorState,
  TableBlock
} from "../../core/types";
import CanvasBlock from "./CanvasBlock.vue";
import CanvasTextBlock from "./CanvasTextBlock.vue";
import CanvasButtonBlock from "./CanvasButtonBlock.vue";
import CanvasImageBlock from "./CanvasImageBlock.vue";
import CanvasHtmlBlock from "./CanvasHtmlBlock.vue";
import CanvasTableBlock from "./CanvasTableBlock.vue";
import CanvasCustomBlock from "./CanvasCustomBlock.vue";
import CanvasCustomBlockPlaceholder from "./CanvasCustomBlockPlaceholder.vue";
import { resolveCustomBlockState } from "../../core/custom_block_registry";

const props = defineProps<{
  document: Document;
  editorState: EditorState;
}>();

const emit = defineEmits<{
  (event: "update-block", block: Block): void;
  (event: "reorder", fromIndex: number, toIndex: number): void;
  (event: "delete-block", blockId: string): void;
  (event: "select-block", blockId: string | null): void;
  (event: "set-editing", isEditing: boolean): void;
  (event: "select-cell-block", tableBlockId: string, cellId: string, blockId: string): void;
  (event: "delete-cell-block", tableBlockId: string, cellId: string, blockId: string): void;
  (event: "move-block-to-cell", blockIndex: number, tableBlockId: string, cellId: string): void;
  (event: "move-cell-to-top-level", tableBlockId: string, cellId: string, blockId: string, targetIndex: number): void;
  (
    event: "move-cell-to-cell",
    sourceTableId: string,
    sourceCellId: string,
    blockId: string,
    targetTableId: string,
    targetCellId: string
  ): void;
}>();

const { selectedBlockId, isEditingText } = toRefs(props.editorState);

const draggingId = ref<string | null>(null);
const dragOverId = ref<string | null>(null);
const dragOverPosition = ref<"top" | "bottom" | null>(null);
type DragSource =
  | { type: "top-level"; blockId: string; index: number; blockType: Block["type"] }
  | {
      type: "cell";
      blockId: string;
      tableBlockId: string;
      cellId: string;
      blockType: Block["type"];
    };
const dragSource = ref<DragSource | null>(null);

const resetDragState = () => {
  draggingId.value = null;
  dragOverId.value = null;
  dragOverPosition.value = null;
  dragSource.value = null;
};
type TextBlockHandle = {
  toggleBold: () => void;
  setColor: (color: string) => void;
};

const textBlockRefs = ref<Record<string, TextBlockHandle>>({});

const setTextBlockRef = (id: string, el: unknown) => {
  if (
    el &&
    typeof el === "object" &&
    "toggleBold" in el &&
    "setColor" in el
  ) {
    textBlockRefs.value[id] = el as TextBlockHandle;
  }
};

const makeTextBlockRef = (id: string) => (el: unknown) => {
  setTextBlockRef(id, el);
};

onBeforeUpdate(() => {
  textBlockRefs.value = {};
});

const canvasStyle = computed(() => {
  return {
    maxWidth: `${props.document.layout.previewWidthPx}px`,
    width: "100%",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    minHeight: "100%"
  };
});

// ... (other handlers remain same)

// New formatting methods exposed
const toggleBold = () => {
    const id = selectedBlockId.value;
    if (id && textBlockRefs.value[id]) {
        textBlockRefs.value[id].toggleBold();
    }
};

const setColor = (color: string) => {
    const id = selectedBlockId.value;
    if (id && textBlockRefs.value[id]) {
        textBlockRefs.value[id].setColor(color);
    }
};

defineExpose({
    toggleBold,
    setColor
});

const handleSelect = (blockId: string) => {
  if (isReadOnlyBlock(blockId)) {
    return;
  }
  if (selectedBlockId.value !== blockId) {
    emit("select-block", blockId);
    emit("set-editing", false);
  }
};

const handleEdit = (blockId: string) => {
  if (selectedBlockId.value === blockId) {
    emit("set-editing", true);
  }
};

const handleBackgroundClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget || (event.target as HTMLElement).classList.contains("ee-canvas-content")) {
    emit("select-block", null);
    emit("set-editing", false);
  }
};

const handleUpdate = (blockId: string, updatedBlock: Block) => {
  emit("update-block", updatedBlock);
};

const handleDelete = (blockId: string) => {
  emit("delete-block", blockId);
  if (selectedBlockId.value === blockId) {
    emit("select-block", null);
  }
};

const handleDragStart = (block: Block, index: number, event: DragEvent) => {
  if (isReadOnlyBlock(block.id)) {
    return;
  }
  draggingId.value = block.id;
  dragSource.value = {
    type: "top-level",
    blockId: block.id,
    index,
    blockType: block.type
  };
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", block.id);
    const handle = event.currentTarget as HTMLElement | null;
    const blockElement = handle?.closest(".ee-canvas-block") as HTMLElement | null;
    if (blockElement) {
      const rect = blockElement.getBoundingClientRect();
      const offsetX = Math.max(0, event.clientX - rect.left);
      const offsetY = Math.max(0, event.clientY - rect.top);
      event.dataTransfer.setDragImage(blockElement, offsetX, offsetY);
    }
  }
};

const handleDragOver = (id: string, event: DragEvent) => {
  if (!dragSource.value) {
    return;
  }
  if (dragSource.value.type === "top-level" && dragSource.value.blockId === id) {
    return;
  }
  dragOverId.value = id;
  if (dragSource.value.type === "top-level") {
    const fromIndex = props.document.blocks.findIndex((b) => b.id === dragSource.value?.blockId);
    const toIndex = props.document.blocks.findIndex((b) => b.id === id);
    if (fromIndex < 0 || toIndex < 0) {
      dragOverPosition.value = null;
      return;
    }
    dragOverPosition.value = fromIndex < toIndex ? "bottom" : "top";
    return;
  }
  // セルからのドラッグ時はマウス位置で判定
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  dragOverPosition.value = event.clientY < midY ? "top" : "bottom";
};

const handleDragLeave = (id: string) => {
  if (dragOverId.value === id) {
    dragOverId.value = null;
    dragOverPosition.value = null;
  }
};

const handleDrop = (id: string) => {
  const source = dragSource.value;
  if (!source) {
    resetDragState();
    return;
  }
  if (source.type === "top-level" && source.blockId === id) {
    resetDragState();
    return;
  }

  const toIndex = props.document.blocks.findIndex((b) => b.id === id);

  if (toIndex < 0) {
    resetDragState();
    return;
  }

  if (source.type === "cell") {
    const adjustedIndex = dragOverPosition.value === "bottom" ? toIndex + 1 : toIndex;
    emit("move-cell-to-top-level", source.tableBlockId, source.cellId, source.blockId, adjustedIndex);
    resetDragState();
    return;
  }

  const fromIndex = props.document.blocks.findIndex((b) => b.id === source.blockId);
  resetDragState();

  if (fromIndex >= 0) {
    emit("reorder", fromIndex, toIndex);
  }
};

const handleDragEnd = () => {
  resetDragState();
};

const findCellBlock = (
  tableBlockId: string,
  cellId: string,
  blockId: string
): CellBlock | null => {
  const tableBlock = props.document.blocks.find(
    (block) => block.id === tableBlockId && block.type === "table"
  ) as TableBlock | undefined;
  if (!tableBlock) {
    return null;
  }
  for (const row of tableBlock.rows) {
    for (const cell of row.cells) {
      if (cell.id !== cellId) {
        continue;
      }
      const cellBlock = cell.blocks.find((block) => block.id === blockId);
      return cellBlock ?? null;
    }
  }
  return null;
};

const handleCellBlockDragStart = (
  tableBlockId: string,
  cellId: string,
  blockId: string,
  event: DragEvent
) => {
  const cellBlock = findCellBlock(tableBlockId, cellId, blockId);
  if (!cellBlock) {
    return;
  }
  draggingId.value = null;
  dragSource.value = {
    type: "cell",
    blockId,
    tableBlockId,
    cellId,
    blockType: cellBlock.type
  };
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", blockId);
    const handle = event.currentTarget as HTMLElement | null;
    const blockElement = handle?.closest(".ee-canvas-block") as HTMLElement | null;
    const dragTarget = blockElement ?? handle;
    if (dragTarget) {
      const rect = dragTarget.getBoundingClientRect();
      const offsetX = Math.max(0, event.clientX - rect.left);
      const offsetY = Math.max(0, event.clientY - rect.top);
      event.dataTransfer.setDragImage(dragTarget, offsetX, offsetY);
    }
  }
};

const handleCellBlockDragEnd = () => {
  resetDragState();
};

const handleCellBlockDelete = (tableBlockId: string, cellId: string, blockId: string) => {
  emit("delete-cell-block", tableBlockId, cellId, blockId);
};

const handleCellDrop = (tableBlockId: string, cellId: string) => {
  const source = dragSource.value;
  if (!source) {
    return;
  }
  if (source.type === "top-level") {
    const fromIndex = props.document.blocks.findIndex((b) => b.id === source.blockId);
    if (fromIndex >= 0) {
      emit("move-block-to-cell", fromIndex, tableBlockId, cellId);
    }
    resetDragState();
    return;
  }
  if (source.tableBlockId === tableBlockId && source.cellId === cellId) {
    resetDragState();
    return;
  }
  emit(
    "move-cell-to-cell",
    source.tableBlockId,
    source.cellId,
    source.blockId,
    tableBlockId,
    cellId
  );
  resetDragState();
};

const resolveCustomBlock = (block: Block): CustomBlockInstance => {
  if (block.type !== "custom") {
    throw new Error("resolveCustomBlock called with non-custom block");
  }

  const resolved = resolveCustomBlockState(block);
  return {
    ...block,
    state: resolved.state,
    readOnly: resolved.readOnly
  };
};

const isReadOnlyBlock = (blockId: string): boolean => {
  const block = props.document.blocks.find((item) => item.id === blockId);
  if (!block || block.type !== "custom") {
    return false;
  }
  return resolveCustomBlockState(block).readOnly;
};

const getSelectedCellBlockId = (tableBlockId: string): string | null => {
  const ctx = props.editorState.parentTableContext;
  if (ctx && ctx.tableBlockId === tableBlockId) {
    return props.editorState.selectedBlockId;
  }
  return null;
};

const handleSelectCellBlock = (tableBlockId: string, cellId: string, blockId: string) => {
  emit("select-cell-block", tableBlockId, cellId, blockId);
};
</script>

<style scoped>
.ee-canvas-root {
  box-shadow: 0 0 0 1px #e5e7eb;
  padding: 32px;
  box-sizing: border-box;
}

.ee-canvas-content {
  min-height: 200px;
}

.ee-empty-state {
  text-align: center;
  color: #9ca3af;
  padding: 40px;
  border: 2px dashed #e5e7eb;
  border-radius: 8px;
}

.is-dragging {
  opacity: 0.5;
}

.is-drag-over-top {
  border-top: 2px solid #2563eb;
}

.is-drag-over-bottom {
  border-bottom: 2px solid #2563eb;
}
</style>
