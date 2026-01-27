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
        @dragover.prevent="handleDragOver(block.id)"
        @dragleave="handleDragLeave(block.id)"
        @drop.prevent="handleDrop(block.id)"
      >
        <CanvasBlock
          :selected="selectedBlockId === block.id"
          @dragstart="handleDragStart(block.id, $event)"
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
import type { Block, Document, EditorState } from "../../core/types";
import CanvasBlock from "./CanvasBlock.vue";
import CanvasTextBlock from "./CanvasTextBlock.vue";
import CanvasButtonBlock from "./CanvasButtonBlock.vue";
import CanvasImageBlock from "./CanvasImageBlock.vue";
import CanvasHtmlBlock from "./CanvasHtmlBlock.vue";

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
}>();

const { selectedBlockId, isEditingText } = toRefs(props.editorState);

const draggingId = ref<string | null>(null);
const dragOverId = ref<string | null>(null);
const dragOverPosition = ref<"top" | "bottom" | null>(null);
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

const handleDragStart = (id: string, event: DragEvent) => {
  draggingId.value = id;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }
};

const handleDragOver = (id: string) => {
  if (!draggingId.value || draggingId.value === id) {
    return;
  }
  dragOverId.value = id;
  const fromIndex = props.document.blocks.findIndex((b) => b.id === draggingId.value);
  const toIndex = props.document.blocks.findIndex((b) => b.id === id);
  if (fromIndex < 0 || toIndex < 0) {
    dragOverPosition.value = null;
    return;
  }
  dragOverPosition.value = fromIndex < toIndex ? "bottom" : "top";
};

const handleDragLeave = (id: string) => {
  if (dragOverId.value === id) {
    dragOverId.value = null;
    dragOverPosition.value = null;
  }
};

const handleDrop = (id: string) => {
  if (!draggingId.value || draggingId.value === id) {
    draggingId.value = null;
    dragOverId.value = null;
    return;
  }

  const fromIndex = props.document.blocks.findIndex((b) => b.id === draggingId.value);
  const toIndex = props.document.blocks.findIndex((b) => b.id === id);

  draggingId.value = null;
  dragOverId.value = null;
  dragOverPosition.value = null;

  if (fromIndex >= 0 && toIndex >= 0) {
    emit("reorder", fromIndex, toIndex);
  }
};

const handleDragEnd = () => {
  draggingId.value = null;
  dragOverId.value = null;
  dragOverPosition.value = null;
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
