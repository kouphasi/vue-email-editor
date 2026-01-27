<template>
  <div class="ee-sidebar">
    <div class="ee-sidebar-header">
      <h2 class="ee-sidebar-title">{{ title }}</h2>
      <button
        v-if="selectedBlock"
        class="ee-close-msg"
        @click="$emit('select-block', null)"
        aria-label="Deselect"
      >
        Done
      </button>
    </div>
    <div class="ee-sidebar-body">
      <DocumentProperties
        v-if="!selectedBlock"
        :layout="document.layout"
        @update="$emit('update-layout', $event)"
      />
      
      <TextBlockProperties
        v-else-if="selectedBlock.type === 'text'"
        :block="selectedBlock"
        @format-bold="$emit('format-bold')"
        @format-color="$emit('format-color', $event)"
      />
      
      <ButtonBlockProperties
        v-else-if="selectedBlock.type === 'button'"
        :block="selectedBlock"
        @update="$emit('update-block', $event)"
      />
      
      <ImageBlockProperties
        v-else-if="selectedBlock.type === 'image'"
        :block="selectedBlock"
        :on-image-upload="onImageUpload"
        @update="$emit('update-block', $event)"
      />
      
      <HtmlBlockProperties
        v-else-if="selectedBlock.type === 'html'"
        :block="selectedBlock"
        @update="$emit('update-block', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Document, Block, LayoutSettings, EditorState } from "../../core/types";
import type { ImageUploadHandler } from "../../core/editor_api";
import DocumentProperties from "./DocumentProperties.vue";
import TextBlockProperties from "./TextBlockProperties.vue";
import ButtonBlockProperties from "./ButtonBlockProperties.vue";
import ImageBlockProperties from "./ImageBlockProperties.vue";
import HtmlBlockProperties from "./HtmlBlockProperties.vue";

const props = defineProps<{
  document: Document;
  editorState: EditorState;
  onImageUpload?: ImageUploadHandler;
}>();

const emit = defineEmits<{
  (event: "update-layout", layout: LayoutSettings): void;
  (event: "update-block", block: Block): void;
  (event: "select-block", id: string | null): void;
  (event: "format-bold"): void;
  (event: "format-color", color: string): void;
}>();

const selectedBlock = computed<Block | undefined>(() => {
  if (!props.editorState.selectedBlockId) {
    return undefined;
  }
  return props.document.blocks.find(b => b.id === props.editorState.selectedBlockId);
});

const title = computed(() => {
  if (!selectedBlock.value) {
    return "Document Settings";
  }
  switch (selectedBlock.value.type) {
    case "text": return "Text Properties";
    case "button": return "Button Properties";
    case "image": return "Image Properties";
    case "html": return "HTML Properties";
    default: return "Block Properties";
  }
});
</script>

<style scoped>
.ee-sidebar {
  background: white;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.ee-sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ee-sidebar-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.ee-close-msg {
  font-size: 12px;
  color: #2563eb;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.ee-close-msg:hover {
  text-decoration: underline;
}

.ee-sidebar-body {
  flex: 1;
  overflow-y: auto;
}
</style>
