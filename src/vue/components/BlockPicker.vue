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
  </div>
</template>

<script setup lang="ts">
import type { Block, ButtonBlock, ImageBlock, TextBlock } from "../../core/types";

const emit = defineEmits<{
  (event: "add", block: Block): void;
}>();

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
  runs: []
});

const createButtonBlock = (): ButtonBlock => ({
  id: createId(),
  type: "button",
  label: "Button",
  url: "https://example.com",
  shape: "rounded",
  textColor: "#ffffff",
  backgroundColor: "#2b6cb0"
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

const addText = (): void => {
  emit("add", createTextBlock());
};

const addButton = (): void => {
  emit("add", createButtonBlock());
};

const addImage = (): void => {
  emit("add", createImageBlock());
};
</script>

<style scoped>
.ee-block-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ee-pill {
  border: 1px solid var(--ee-border);
  background: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;
}
</style>
