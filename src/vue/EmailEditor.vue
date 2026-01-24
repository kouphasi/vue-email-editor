<template>
  <div class="ee-root">
    <div class="ee-toolbar">
      <BlockPicker @add="handleAddBlock" />
      <PreviewToggle
        :mode="editorDocument.layout.previewMode"
        @change="handlePreviewChange"
      />
    </div>
    <BlockList
      :document="editorDocument"
      :width-px="editorDocument.layout.previewWidthPx"
      :on-image-upload="onImageUpload"
      @update-block="handleUpdateBlock"
      @reorder="handleReorder"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, toRefs } from "vue";
import type { Block, Document, PreviewMode } from "../core/types";
import type { ImageUploadHandler } from "../core/editor_api";
import { addBlock, createDocument, reorderBlocks, setPreviewMode, updateBlock } from "../services/document_service";
import { exportHtml } from "../services/html_export";
import { parseDocument } from "../services/json_import";
import { serializeDocument } from "../services/json_export";
import { validateDocument } from "../services/json_validation";
import BlockList from "./components/BlockList.vue";
import BlockPicker from "./components/BlockPicker.vue";
import PreviewToggle from "./components/PreviewToggle.vue";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    document?: Document | null;
    previewMode?: PreviewMode;
    onImageUpload?: ImageUploadHandler;
  }>(),
  {
    modelValue: undefined,
    previewMode: "desktop",
    document: null,
    onImageUpload: undefined,
  }
);

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void;
  (event: "change", value: Document): void;
  (event: "error", value: Error): void;
}>();

const { onImageUpload } = toRefs(props);

const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `doc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const documentRef = ref<Document>(createDocument(createId()));
let lastSerialized = serializeDocument(documentRef.value);

const editorDocument = computed(() => documentRef.value);

const setDocument = (next: Document, emitChanges: boolean): void => {
  documentRef.value = next;
  const json = serializeDocument(next);
  lastSerialized = json;

  if (emitChanges) {
    emit("change", next);
    emit("update:modelValue", json);
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
    tryLoadDocument(parsed, emitChanges);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    emit("error", new Error(message));
  }
};

if (props.document) {
  tryLoadDocument(props.document, false);
} else if (props.modelValue) {
  tryLoadJson(props.modelValue, false);
} else {
  setDocument(setPreviewMode(documentRef.value, props.previewMode), false);
}

const handleAddBlock = (block: Block): void => {
  setDocument(addBlock(documentRef.value, block), true);
};

const handleUpdateBlock = (block: Block): void => {
  setDocument(updateBlock(documentRef.value, block.id, () => block), true);
};

const handleReorder = (fromIndex: number, toIndex: number): void => {
  setDocument(reorderBlocks(documentRef.value, fromIndex, toIndex), true);
};

const handlePreviewChange = (mode: PreviewMode): void => {
  setDocument(setPreviewMode(documentRef.value, mode), true);
};

watch(
  () => props.modelValue,
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
    if (!value) {
      return;
    }

    tryLoadDocument(value, false);
  }
);

watch(
  () => props.previewMode,
  (value) => {
    setDocument(setPreviewMode(documentRef.value, value), false);
  }
);

defineExpose({
  loadJson: (json: string) => tryLoadJson(json, true),
  loadDocument: (next: Document) => tryLoadDocument(next, true),
  exportJson: () => serializeDocument(documentRef.value),
  exportHtml: () => exportHtml(documentRef.value),
  setPreviewMode: (mode: PreviewMode) => handlePreviewChange(mode)
});
</script>

<style scoped>
.ee-root {
  --ee-font-family: "Helvetica Neue", Arial, sans-serif;
  --ee-text-color: #1b1b1b;
  --ee-bg: #f5f5f7;
  --ee-surface: #ffffff;
  --ee-border: #d0d0d5;
  --ee-muted: #6f6f6f;
  --ee-primary: #2b6cb0;
  --ee-radius: 8px;
  --ee-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--ee-bg);
  color: var(--ee-text-color);
  font-family: var(--ee-font-family);
}

.ee-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
</style>
