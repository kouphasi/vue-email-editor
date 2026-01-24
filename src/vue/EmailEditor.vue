<template>
  <div class="ee-root">
    <div class="ee-toolbar">
      <div class="ee-toolbar-group">
        <div class="ee-toolbar-label">Add elements</div>
        <BlockPicker @add="handleAddBlock" />
      </div>
      <div class="ee-toolbar-group">
        <div class="ee-toolbar-label">Preview</div>
        <div class="ee-preview-controls">
          <PreviewToggle
            :mode="editorDocument.layout.previewMode"
            @change="handlePreviewChange"
          />
          <button
            type="button"
            class="ee-preview-button"
            :class="{ 'is-active': showPreview }"
            :aria-pressed="showPreview"
            @click="showPreview = !showPreview"
          >
            {{ showPreview ? "Hide preview" : "Show preview" }}
          </button>
        </div>
      </div>
    </div>
    <div class="ee-workspace" :class="{ 'is-preview-hidden': !showPreview }">
      <div class="ee-panel">
        <div class="ee-panel-header">
          <div class="ee-panel-title">Editor</div>
          <div class="ee-panel-meta">{{ editorDocument.layout.previewWidthPx }}px</div>
        </div>
        <div class="ee-panel-body">
          <BlockList
            :document="editorDocument"
            :width-px="editorDocument.layout.previewWidthPx"
            :on-image-upload="onImageUpload"
            @update-block="handleUpdateBlock"
            @reorder="handleReorder"
          />
        </div>
      </div>
      <div v-if="showPreview" class="ee-panel ee-panel-preview">
        <div class="ee-panel-header">
          <div class="ee-panel-title">Preview</div>
          <div class="ee-panel-meta">{{ previewMeta }}</div>
        </div>
        <div class="ee-panel-body">
          <div
            class="ee-preview-canvas"
            :style="{ '--ee-preview-width': `${editorDocument.layout.previewWidthPx}px` }"
          >
            <iframe
              class="ee-preview-frame"
              :title="`Email preview (${editorDocument.layout.previewMode})`"
              :srcdoc="previewHtml"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
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
import { renderBlockHtml } from "../rendering/html_renderer";
import { wrapEmailHtml } from "../rendering/html_templates";
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
const showPreview = ref(true);

const buildPreviewHtml = (document: Document): string => {
  const content = document.blocks.map(renderBlockHtml).join("");
  const fallback =
    "<div style=\"font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#6f6357;\">Add a block to see a preview.</div>";
  return wrapEmailHtml(content || fallback, document.layout.previewWidthPx);
};

const previewHtml = computed(() => buildPreviewHtml(editorDocument.value));
const previewMeta = computed(() => {
  const mode = editorDocument.value.layout.previewMode === "mobile" ? "Mobile" : "Desktop";
  return `${mode} / ${editorDocument.value.layout.previewWidthPx}px`;
});

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
    setDocument(parsed, emitChanges);
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
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:wght@500;600&display=swap");

.ee-root {
  --ee-font-body: "IBM Plex Sans", "Segoe UI", sans-serif;
  --ee-font-display: "IBM Plex Serif", "Times New Roman", serif;
  --ee-text-color: #1c1915;
  --ee-bg: #f4ede3;
  --ee-surface: #fffaf2;
  --ee-border: #e2d4c3;
  --ee-muted: #6f6357;
  --ee-primary: #0f766e;
  --ee-primary-ink: #f6f1ea;
  --ee-radius: 14px;
  --ee-shadow: 0 8px 20px rgba(28, 24, 18, 0.1);
  --ee-panel-shadow: 0 18px 40px rgba(28, 24, 18, 0.12);
  --ee-control-bg: #fff2df;
  --ee-control-border: #e0cfbb;
  --ee-control-hover: #f5e2cd;
  --ee-ring: rgba(15, 118, 110, 0.2);

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  background:
    radial-gradient(120% 120% at 10% 0%, rgba(255, 255, 255, 0.82) 0%, rgba(244, 237, 227, 0.12) 60%),
    linear-gradient(180deg, #f7f0e7 0%, #f1e7d8 100%);
  color: var(--ee-text-color);
  font-family: var(--ee-font-body);
}

.ee-toolbar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.ee-toolbar-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid var(--ee-border);
  background: var(--ee-surface);
  box-shadow: var(--ee-shadow);
}

.ee-toolbar-label {
  font-family: var(--ee-font-display);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ee-muted);
}

.ee-preview-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.ee-preview-button {
  border: 1px solid var(--ee-control-border);
  background: var(--ee-control-bg);
  border-radius: 999px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--ee-text-color);
  transition:
    transform 150ms ease,
    border-color 150ms ease,
    box-shadow 150ms ease,
    background 150ms ease,
    color 150ms ease;
}

.ee-preview-button:hover {
  border-color: var(--ee-primary);
  transform: translateY(-1px);
}

.ee-preview-button:focus-visible {
  outline: 2px solid var(--ee-ring);
  outline-offset: 2px;
}

.ee-preview-button.is-active {
  background: var(--ee-primary);
  color: var(--ee-primary-ink);
  border-color: var(--ee-primary);
  box-shadow: 0 10px 24px rgba(15, 118, 110, 0.28);
}

.ee-workspace {
  display: grid;
  grid-template-columns: minmax(280px, 1.1fr) minmax(280px, 0.9fr);
  gap: 16px;
  align-items: start;
}

.ee-workspace.is-preview-hidden {
  grid-template-columns: minmax(280px, 1fr);
}

.ee-panel {
  background: var(--ee-surface);
  border: 1px solid var(--ee-border);
  border-radius: 18px;
  box-shadow: var(--ee-panel-shadow);
  display: flex;
  flex-direction: column;
  min-height: 320px;
}

.ee-panel-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 12px 16px 4px;
  border-bottom: 1px dashed rgba(28, 24, 18, 0.08);
}

.ee-panel-title {
  font-family: var(--ee-font-display);
  font-size: 16px;
  letter-spacing: 0.04em;
}

.ee-panel-meta {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ee-muted);
}

.ee-panel-body {
  padding: 12px 16px 16px;
  overflow: auto;
}

.ee-preview-canvas {
  --ee-preview-width: 640px;
  display: grid;
  justify-content: center;
  align-items: start;
  padding: 12px;
  border-radius: 14px;
  border: 1px dashed rgba(28, 24, 18, 0.12);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, rgba(245, 236, 222, 0.6) 100%);
}

.ee-preview-frame {
  width: var(--ee-preview-width);
  max-width: 100%;
  height: clamp(320px, 62vh, 760px);
  border: 0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 16px 30px rgba(28, 24, 18, 0.18);
}

@media (max-width: 980px) {
  .ee-toolbar {
    grid-template-columns: 1fr;
  }

  .ee-workspace {
    grid-template-columns: 1fr;
  }
}
</style>
