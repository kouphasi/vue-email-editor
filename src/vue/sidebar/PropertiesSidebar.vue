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
        @update="$emit('update-block', $event)"
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

      <TableBlockProperties
        v-else-if="selectedBlock.type === 'table'"
        :block="selectedBlock"
        :on-image-upload="onImageUpload"
        @update="$emit('update-block', $event)"
      />

      <template v-else-if="selectedBlock.type === 'custom'">
        <div
          v-if="customBlockState && customBlockState.state !== 'ready'"
          class="ee-custom-readonly"
        >
          <div class="ee-readonly-title">
            {{ customBlockState.state === "missing-definition"
              ? "Missing custom block"
              : "Invalid custom block" }}: {{ selectedBlock.definitionId }}
          </div>
          <div class="ee-readonly-note">Read-only (delete only)</div>
        </div>
        <CustomBlockProperties
          v-else
          :block="selectedBlock"
          @update="$emit('update-block', $event)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Document, Block, LayoutSettings, EditorState } from "../../core/types";
import type { ImageUploadHandler } from "../../core/editor_api";
import { resolveCustomBlockState } from "../../core/custom_block_registry";
import DocumentProperties from "./DocumentProperties.vue";
import TextBlockProperties from "./TextBlockProperties.vue";
import ButtonBlockProperties from "./ButtonBlockProperties.vue";
import ImageBlockProperties from "./ImageBlockProperties.vue";
import HtmlBlockProperties from "./HtmlBlockProperties.vue";
import TableBlockProperties from "./TableBlockProperties.vue";
import CustomBlockProperties from "./CustomBlockProperties.vue";

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
    case "table": return "Table Properties";
    case "custom": return "Custom Block Properties";
    default: return "Block Properties";
  }
});

const customBlockState = computed(() => {
  if (!selectedBlock.value || selectedBlock.value.type !== "custom") {
    return null;
  }
  return resolveCustomBlockState(selectedBlock.value);
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

.ee-custom-readonly {
  border: 1px dashed #f59e0b;
  background: #fffbeb;
  padding: 12px;
  border-radius: 10px;
  color: #92400e;
  font-size: 13px;
}

.ee-readonly-title {
  font-weight: 700;
  margin-bottom: 6px;
}

.ee-readonly-note {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
}
</style>
