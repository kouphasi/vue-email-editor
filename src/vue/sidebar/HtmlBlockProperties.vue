<template>
  <div class="ee-properties-panel">
    <div class="ee-panel-section">
      <h3>HTML Properties</h3>
      
      <div class="ee-warning">
        ⚠️ Warning: Custom HTML can affect email rendering. Test carefully.
      </div>

      <div class="ee-control-group">
        <label>HTML Code</label>
        <textarea
          class="ee-html-code-editor"
          :value="block.content"
          @input="handleInput"
          placeholder="<div>Html content...</div>"
        ></textarea>
      </div>
    </div>
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
.ee-properties-panel {
  padding: 16px;
}

.ee-panel-section h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #111827;
}

.ee-warning {
  font-size: 12px;
  color: #854d0e;
  background: #fef9c3;
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 16px;
  line-height: 1.4;
}

.ee-control-group {
  margin-bottom: 16px;
}

.ee-control-group label {
  display: block;
  font-size: 12px;
  color: #374151;
  margin-bottom: 6px;
  font-weight: 500;
}

.ee-html-code-editor {
  width: 100%;
  min-height: 200px;
  padding: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #e5e7eb;
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 6px;
  resize: vertical;
  box-sizing: border-box;
}

.ee-html-code-editor:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}
</style>
