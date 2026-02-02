<template>
  <div class="ee-block-picker">
    <button
      type="button"
      class="ee-pill"
      @click="addText"
    >
      Add Text
    </button>
    <button
      type="button"
      class="ee-pill"
      @click="addButton"
    >
      Add Button
    </button>
    <button
      type="button"
      class="ee-pill"
      @click="addImage"
    >
      Add Image
    </button>
    <button
      type="button"
      class="ee-pill"
      @click="addHtml"
    >
      Add HTML
    </button>
    <button
      type="button"
      class="ee-pill"
      @click="addTable"
    >
      Add Table
    </button>

    <button
      v-for="definition in customBlocks"
      :key="definition.id"
      type="button"
      class="ee-pill ee-pill--custom"
      @click="addCustomBlock(definition)"
    >
      Add {{ definition.displayName }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type {
  Block,
  ButtonBlock,
  CustomBlockDefinition,
  HtmlBlock,
  ImageBlock,
  TextBlock
} from "../../core/types";
import { subscribeCustomBlockDefinitions } from "../../core/custom_block_registry";
import { DEFAULT_FONT_SIZE_PX } from "../../core/validation";
import { createCustomBlockInstance, createTableBlock } from "../../services/document_service";

const emit = defineEmits<{
  (event: "add", block: Block): void;
}>();

const customBlocks = ref<CustomBlockDefinition[]>([]);
let unsubscribe: (() => void) | null = null;

const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `block_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const createTextBlock = (): TextBlock => ({
  id: createId(),
  type: "text",
  text: "New text",
  runs: [],
  fontSize: DEFAULT_FONT_SIZE_PX
});

const createButtonBlock = (): ButtonBlock => ({
  id: createId(),
  type: "button",
  label: "Button",
  url: "https://example.com",
  shape: "rounded",
  textColor: "#ffffff",
  backgroundColor: "#2b6cb0",
  fontSize: DEFAULT_FONT_SIZE_PX
});

const createImageBlock = (): ImageBlock => ({
  id: createId(),
  type: "image",
  url: "",
  status: "pending",
  display: {
    align: "center"
  }
});

const createHtmlBlock = (): HtmlBlock => ({
  id: createId(),
  type: "html",
  content: ""
});

const addText = (): void => {
  emit("add", createTextBlock());
};

const addButton = (): void => {
  emit("add", createButtonBlock());
};

const addImage = (): void => {
  emit("add", createImageBlock());
};

const addHtml = (): void => {
  emit("add", createHtmlBlock());
};

const addTable = (): void => {
  emit("add", createTableBlock(2));
};

const addCustomBlock = (definition: CustomBlockDefinition): void => {
  emit("add", createCustomBlockInstance(definition.id));
};

onMounted(() => {
  unsubscribe = subscribeCustomBlockDefinitions((definitions) => {
    customBlocks.value = definitions;
  });
});

onBeforeUnmount(() => {
  if (unsubscribe) {
    unsubscribe();
  }
  unsubscribe = null;
});
</script>

<style scoped>
.ee-block-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-start;
}

.ee-pill {
  border: 1px solid var(--ee-control-border);
  background: var(--ee-control-bg);
  border-radius: 999px;
  padding: 7px 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--ee-text-color);
  box-shadow: 0 10px 20px rgba(28, 24, 18, 0.08);
  transition:
    transform 150ms ease,
    border-color 150ms ease,
    box-shadow 150ms ease,
    background 150ms ease;
}

.ee-pill:hover {
  border-color: var(--ee-primary);
  background: var(--ee-control-hover);
  transform: translateY(-1px);
  box-shadow: 0 14px 24px rgba(28, 24, 18, 0.12);
}

.ee-pill:focus-visible {
  outline: 2px solid var(--ee-ring);
  outline-offset: 2px;
}

.ee-pill--custom {
  border-style: dashed;
}
</style>
