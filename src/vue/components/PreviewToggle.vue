<template>
  <div class="ee-preview-toggle" role="group" aria-label="Preview size">
    <button
      type="button"
      class="ee-seg"
      :class="{ 'is-active': mode === 'desktop' }"
      @click="emit('change', 'desktop')"
    >
      Desktop
    </button>
    <button
      type="button"
      class="ee-seg"
      :class="{ 'is-active': mode === 'mobile' }"
      @click="emit('change', 'mobile')"
    >
      Mobile
    </button>
  </div>
</template>

<script setup lang="ts">
import type { PreviewMode } from "../../core/types";

defineProps<{
  mode: PreviewMode;
}>();

const emit = defineEmits<{
  (event: "change", mode: PreviewMode): void;
}>();
</script>

<style scoped>
.ee-preview-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0;
  padding: 2px;
  border-radius: 999px;
  border: 1px solid var(--ee-control-border);
  background: var(--ee-control-bg);
  box-shadow: inset 0 0 0 1px rgba(28, 24, 18, 0.04);
}

.ee-seg {
  border: 0;
  background: transparent;
  border-radius: 999px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--ee-muted);
  transition:
    color 150ms ease,
    background 150ms ease,
    box-shadow 150ms ease;
}

.ee-seg:focus-visible {
  outline: 2px solid var(--ee-ring);
  outline-offset: 2px;
}

.ee-seg.is-active {
  background: var(--ee-primary);
  color: var(--ee-primary-ink);
  box-shadow: 0 10px 20px rgba(15, 118, 110, 0.24);
}
</style>
