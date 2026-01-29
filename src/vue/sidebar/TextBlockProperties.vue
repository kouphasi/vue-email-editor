<template>
  <div class="ee-properties-panel">
    <div class="ee-panel-section">
      <h3>Text Properties</h3>
      <div class="ee-control-group">
        <label>Formatting</label>
        <div class="ee-toolbar-row">
          <button
            type="button"
            class="ee-tool-btn"
            @click="$emit('format-bold')"
            title="Toggle Bold"
          >
            <strong>B</strong>
          </button>
          
          <div class="ee-color-picker-wrapper" title="Text Color">
            <span class="ee-color-label">A</span>
            <input
              type="color"
              class="ee-color-input"
              @input="handleColorChange"
            />
          </div>
        </div>
      </div>

      <div class="ee-control-group">
        <label>Font size</label>
        <input
          type="number"
          :min="FONT_SIZE_MIN_PX"
          :max="FONT_SIZE_MAX_PX"
          step="1"
          :value="block.fontSize ?? DEFAULT_FONT_SIZE_PX"
          @input="updateFontSize"
        />
      </div>

      <div class="ee-control-group">
        <label>Alignment</label>
        <div class="ee-align-options">
          <button
            type="button"
            :class="{ active: (block.align || 'left') === 'left' }"
            @click="updateAlign('left')"
          >
            Left
          </button>
          <button
            type="button"
            :class="{ active: (block.align || 'left') === 'center' }"
            @click="updateAlign('center')"
          >
            Center
          </button>
          <button
            type="button"
            :class="{ active: (block.align || 'left') === 'right' }"
            @click="updateAlign('right')"
          >
            Right
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BlockAlign, TextBlock } from "../../core/types";
import {
  DEFAULT_FONT_SIZE_PX,
  FONT_SIZE_MAX_PX,
  FONT_SIZE_MIN_PX
} from "../../core/validation";

const props = defineProps<{
  block: TextBlock;
}>();

const emit = defineEmits<{
  (event: "format-bold"): void;
  (event: "format-color", color: string): void;
  (event: "update", block: TextBlock): void;
}>();

const handleColorChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  emit("format-color", input.value);
};

const updateAlign = (align: BlockAlign) => {
  emit("update", {
    ...props.block,
    align
  });
};

const updateFontSize = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.value.trim() === "") {
    emit("update", {
      ...props.block,
      fontSize: undefined
    });
    return;
  }

  const value = Number(input.value);
  emit("update", {
    ...props.block,
    fontSize: Number.isFinite(value) ? value : DEFAULT_FONT_SIZE_PX
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
  color: #374151;
}

.ee-control-group {
  margin-bottom: 16px;
}

.ee-control-group label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.ee-control-group input[type="number"] {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.ee-toolbar-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ee-tool-btn {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #374151;
}

.ee-tool-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.ee-color-picker-wrapper {
  position: relative;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
}

.ee-color-label {
  font-weight: bold;
  font-size: 14px;
  color: #374151;
  pointer-events: none;
}

.ee-color-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.ee-align-options {
  display: flex;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  overflow: hidden;
}

.ee-align-options button {
  flex: 1;
  border: none;
  background: #fff;
  padding: 6px 4px;
  font-size: 12px;
  cursor: pointer;
  color: #4b5563;
  border-right: 1px solid #e5e7eb;
}

.ee-align-options button:last-child {
  border-right: none;
}

.ee-align-options button.active {
  background: #f3f4f6;
  color: #111827;
  font-weight: 500;
}
</style>
