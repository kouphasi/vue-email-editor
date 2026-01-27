<template>
  <div class="ee-blocks" :style="{ width: `min(100%, ${widthPx}px)` }">
    <div
      v-for="block in document.blocks"
      :key="block.id"
      class="ee-block-item"
      :class="{
        'is-dragging': draggingId === block.id,
        'is-drag-over': dragOverId === block.id
      }"
      draggable="true"
      @dragstart="handleDragStart(block.id, $event)"
      @dragover.prevent="handleDragOver(block.id)"
      @dragleave="handleDragLeave(block.id)"
      @drop.prevent="handleDrop(block.id)"
      @dragend="handleDragEnd"
    >
      <div class="ee-block-item-header">
        <span class="ee-block-item-label">{{ getBlockLabel(block) }}</span>
        <button
          type="button"
          class="ee-block-item-delete"
          @click="handleDelete(block.id)"
        >
          Remove
        </button>
      </div>
      <TextBlock v-if="block.type === 'text'" :block="block" @update="emitUpdate" />
      <ButtonBlock v-else-if="block.type === 'button'" :block="block" @update="emitUpdate" />
      <ImageBlock
        v-else-if="block.type === 'image'"
        :block="block"
        :on-image-upload="onImageUpload"
        @update="emitUpdate"
      />
      <HtmlBlock v-else-if="block.type === 'html'" :block="block" @update="emitUpdate" />
      <div v-else class="ee-unknown">Unsupported block</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { Block, Document } from "../../core/types";
import type { ImageUploadHandler } from "../../core/editor_api";
import TextBlock from "../blocks/TextBlock.vue";
import ButtonBlock from "../blocks/ButtonBlock.vue";
import ImageBlock from "../blocks/ImageBlock.vue";
import HtmlBlock from "../blocks/HtmlBlock.vue";

const props = defineProps<{
  document: Document;
  widthPx: number;
  onImageUpload?: ImageUploadHandler;
}>();

const emit = defineEmits<{
  (event: "update-block", block: Block): void;
  (event: "reorder", fromIndex: number, toIndex: number): void;
  (event: "delete-block", blockId: string): void;
}>();

const draggingId = ref<string | null>(null);
const dragOverId = ref<string | null>(null);

const emitUpdate = (block: Block): void => {
  emit("update-block", block);
};

const getBlockLabel = (block: Block): string => {
  switch (block.type) {
    case "text":
      return "Text block";
    case "button":
      return "Button block";
    case "image":
      return "Image block";
    case "html":
      return "HTML block";
    default:
      return "Block";
  }
};

const handleDelete = (blockId: string): void => {
  emit("delete-block", blockId);
};

const handleDragStart = (id: string, event: DragEvent): void => {
  draggingId.value = id;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }
};

const handleDragOver = (id: string): void => {
  if (!draggingId.value) {
    return;
  }

  dragOverId.value = id;
};

const handleDragLeave = (id: string): void => {
  if (dragOverId.value === id) {
    dragOverId.value = null;
  }
};

const handleDrop = (id: string): void => {
  if (!draggingId.value) {
    return;
  }

  const fromIndex = props.document.blocks.findIndex((block) => block.id === draggingId.value);
  const toIndex = props.document.blocks.findIndex((block) => block.id === id);

  draggingId.value = null;
  dragOverId.value = null;

  if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
    emit("reorder", fromIndex, toIndex);
  }
};

const handleDragEnd = (): void => {
  draggingId.value = null;
  dragOverId.value = null;
};
</script>

<style scoped>
.ee-blocks {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--ee-surface);
  border: 1px solid var(--ee-border);
  border-radius: var(--ee-radius);
  padding: 16px;
  box-shadow: var(--ee-shadow);
  box-sizing: border-box;
  max-width: 100%;
  margin: 0 auto;
}

.ee-block-item {
  border: 1px solid var(--ee-border);
  border-radius: 10px;
  padding: 12px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ee-block-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ee-block-item-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ee-muted);
}

.ee-block-item-delete {
  border: 1px solid var(--ee-border);
  background: #fff;
  color: var(--ee-muted);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    color 150ms ease,
    background 150ms ease,
    transform 150ms ease;
}

.ee-block-item-delete:hover {
  border-color: #c2410c;
  color: #c2410c;
  background: #fff7ed;
  transform: translateY(-1px);
}

.ee-block-item-delete:focus-visible {
  outline: 2px solid rgba(194, 65, 12, 0.25);
  outline-offset: 2px;
}

.ee-block-item.is-dragging {
  opacity: 0.6;
}

.ee-block-item.is-drag-over {
  border-color: var(--ee-primary);
  box-shadow: 0 0 0 2px rgba(43, 108, 176, 0.15);
}

.ee-unknown {
  color: var(--ee-muted);
  font-size: 14px;
}
</style>
