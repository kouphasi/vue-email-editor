<template>
  <div class="ee-block ee-block-text">
    <div class="ee-text-toolbar">
      <button type="button" class="ee-pill" @click="applyBold">Bold</button>
      <input
        class="ee-color"
        type="color"
        :value="currentColor"
        @change="applyColorSelection"
      />
    </div>
    <div
      ref="contentRef"
      class="ee-text-content"
      contenteditable="true"
      @input="handleInput"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { TextBlock } from "../../core/types";
import { adjustRunsForTextChange, applyBoldToggle, applyColor } from "../../core/text_formatting";

const props = defineProps<{
  block: TextBlock;
}>();

const emit = defineEmits<{
  (event: "update", block: TextBlock): void;
}>();

const contentRef = ref<HTMLDivElement | null>(null);
const lastText = ref(props.block.text);

const escapeHtml = (value: string): string => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const renderTextWithRuns = (text: string, runs: TextBlock["runs"]): string => {
  if (runs.length === 0) {
    return escapeHtml(text);
  }

  const sorted = [...runs].sort((a, b) => a.start - b.start);
  let cursor = 0;
  let html = "";

  for (const run of sorted) {
    if (run.start > cursor) {
      html += escapeHtml(text.slice(cursor, run.start));
    }

    const content = escapeHtml(text.slice(run.start, run.end));
    const styles: string[] = [];

    if (run.bold) {
      styles.push("font-weight: 700");
    }

    if (run.color) {
      styles.push(`color: ${run.color}`);
    }

    if (styles.length > 0) {
      html += `<span style=\"${styles.join(";")}\">${content}</span>`;
    } else {
      html += content;
    }

    cursor = run.end;
  }

  if (cursor < text.length) {
    html += escapeHtml(text.slice(cursor));
  }

  return html;
};

const updateHtml = (): void => {
  if (!contentRef.value) {
    return;
  }

  contentRef.value.innerHTML = renderTextWithRuns(props.block.text, props.block.runs);
};

const getSelectionRange = (): { start: number; end: number } | null => {
  if (!contentRef.value) {
    return null;
  }

  const selection = contentRef.value.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!contentRef.value.contains(range.commonAncestorContainer)) {
    return null;
  }

  const startRange = range.cloneRange();
  startRange.selectNodeContents(contentRef.value);
  startRange.setEnd(range.startContainer, range.startOffset);
  const start = startRange.toString().length;

  const endRange = range.cloneRange();
  endRange.selectNodeContents(contentRef.value);
  endRange.setEnd(range.endContainer, range.endOffset);
  const end = endRange.toString().length;

  if (start === end) {
    return null;
  }

  return { start, end };
};

const handleInput = (): void => {
  const nextText = contentRef.value?.textContent ?? "";
  const nextRuns = adjustRunsForTextChange(lastText.value, nextText, props.block.runs);
  lastText.value = nextText;
  emit("update", {
    ...props.block,
    text: nextText,
    runs: nextRuns
  });
};

const applyBold = (): void => {
  const selection = getSelectionRange();
  if (!selection) {
    return;
  }

  const nextRuns = applyBoldToggle(
    props.block.text,
    props.block.runs,
    selection.start,
    selection.end
  );

  emit("update", {
    ...props.block,
    runs: nextRuns
  });
};

const applyColorSelection = (event: Event): void => {
  const selection = getSelectionRange();
  if (!selection) {
    return;
  }

  const input = event.target as HTMLInputElement;
  const nextRuns = applyColor(
    props.block.text,
    props.block.runs,
    selection.start,
    selection.end,
    input.value
  );

  emit("update", {
    ...props.block,
    runs: nextRuns
  });
};

const currentColor = computed(() => {
  return props.block.runs.find((run) => run.color)?.color ?? "#000000";
});

onMounted(updateHtml);

watch(
  () => [props.block.text, props.block.runs],
  () => {
    lastText.value = props.block.text;
    updateHtml();
  },
  { deep: true }
);
</script>

<style scoped>
.ee-text-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.ee-pill {
  border: 1px solid var(--ee-border);
  background: #fff;
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;
}

.ee-color {
  border: 1px solid var(--ee-border);
  background: #fff;
  border-radius: 8px;
  padding: 4px;
}

.ee-text-content {
  min-height: 80px;
  padding: 8px;
  border: 1px solid var(--ee-border);
  border-radius: 8px;
}
</style>
