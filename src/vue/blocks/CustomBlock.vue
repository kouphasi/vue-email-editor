<template>
  <div class="ee-block ee-block-custom">
    <div class="ee-custom-header">
      <div class="ee-custom-title">{{ title }}</div>
    </div>
    <div class="ee-custom-preview" v-html="previewHtml"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { CustomBlockDefinition, CustomBlockInstance } from "../../core/types";
import {
  getCustomBlockDefinition,
  subscribeCustomBlockDefinitions
} from "../../core/custom_block_registry";
import { renderBlockHtml } from "../../rendering/html_renderer";

const props = defineProps<{
  block: CustomBlockInstance;
}>();

const definition = ref<CustomBlockDefinition | undefined>(
  getCustomBlockDefinition(props.block.definitionId)
);
let unsubscribe: (() => void) | null = null;

const title = computed(() => definition.value?.displayName ?? props.block.definitionId);
const previewHtml = computed(() => renderBlockHtml(props.block, { mode: "preview" }));

onMounted(() => {
  unsubscribe = subscribeCustomBlockDefinitions((definitions) => {
    definition.value = definitions.find((item) => item.id === props.block.definitionId);
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
.ee-block-custom {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ee-custom-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-size: 12px;
}

.ee-custom-title {
  font-weight: 700;
  color: var(--ee-text-color);
}

.ee-custom-preview {
  border: 1px solid var(--ee-border);
  border-radius: 10px;
  padding: 12px;
  background: #fff;
}
</style>
