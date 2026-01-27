<template>
  <div class="ee-block ee-block-html">
    <label class="ee-label">HTML Code</label>
    <textarea
      class="ee-html-input"
      :value="block.content"
      @input="handleInput"
      placeholder="<div>Your HTML here</div>"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import type { HtmlBlock } from "../../core/types";

const props = defineProps<{
  block: HtmlBlock;
}>();

const emit = defineEmits<{
  (event: "update", block: HtmlBlock): void;
}>();

const handleInput = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement;
  emit("update", {
    ...props.block,
    content: textarea.value
  });
};
</script>

<style scoped>
.ee-block-html {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ee-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}

.ee-html-input {
  width: 100%;
  min-height: 100px;
  padding: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #374151;
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  resize: vertical;
}

.ee-html-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}
</style>
