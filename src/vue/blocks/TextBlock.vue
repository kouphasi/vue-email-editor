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
      :style="contentStyle"
      @input="handleInput"
      @compositionstart="isComposing = true"
      @compositionend="onCompositionEnd"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { TextBlock } from "../../core/types";
import { adjustRunsForTextChange, applyBoldToggle, applyColor } from "../../core/text_formatting";
import { DEFAULT_FONT_SIZE_PX } from "../../core/validation";

const props = defineProps<{
  block: TextBlock;
}>();

const emit = defineEmits<{
  (event: "update", block: TextBlock): void;
}>();

const contentRef = ref<HTMLDivElement | null>(null);
const lastText = ref(props.block.text);
const isComposing = ref(false);
const pendingSelection = ref<{ start: number; end: number } | null>(null);
const skipRender = ref<{ text: string; runsKey: string } | null>(null);

const escapeHtml = (value: string): string => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const runsKey = (runs: TextBlock["runs"]): string => {
  return runs
    .map((run) => `${run.start}:${run.end}:${run.bold ? 1 : 0}:${run.color ?? ""}`)
    .join("|");
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

const getSelectionOffsets = (): { start: number; end: number } | null => {
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

  return { start, end };
};

const getSelectionRange = (): { start: number; end: number } | null => {
  const selection = getSelectionOffsets();
  if (!selection || selection.start === selection.end) {
    return null;
  }

  return selection;
};

const findPositionForOffset = (
  root: HTMLElement,
  offset: number
): { node: Node; offset: number } => {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode() as Text | null;
  let remaining = offset;
  let lastText: Text | null = null;

  while (current) {
    const length = current.nodeValue?.length ?? 0;
    if (remaining <= length) {
      return { node: current, offset: remaining };
    }

    remaining -= length;
    lastText = current;
    current = walker.nextNode() as Text | null;
  }

  if (lastText) {
    return { node: lastText, offset: lastText.nodeValue?.length ?? 0 };
  }

  return { node: root, offset: 0 };
};

const restoreSelection = (selection: { start: number; end: number }): void => {
  if (!contentRef.value) {
    return;
  }

  const doc = contentRef.value.ownerDocument;
  const active = doc.activeElement;
  if (active !== contentRef.value) {
    return;
  }

  const textLength = props.block.text.length;
  const start = Math.min(Math.max(selection.start, 0), textLength);
  const end = Math.min(Math.max(selection.end, 0), textLength);
  const startPosition = findPositionForOffset(contentRef.value, start);
  const endPosition = findPositionForOffset(contentRef.value, end);

  const range = doc.createRange();
  range.setStart(startPosition.node, startPosition.offset);
  range.setEnd(endPosition.node, endPosition.offset);

  const selectionState = doc.getSelection();
  if (!selectionState) {
    return;
  }

  selectionState.removeAllRanges();
  selectionState.addRange(range);
};

const handleInput = (): void => {
  if (isComposing.value) {
    return;
  }
  const nextText = contentRef.value?.textContent ?? "";
  const nextRuns = adjustRunsForTextChange(lastText.value, nextText, props.block.runs);
  const nextRunsKey = runsKey(nextRuns);
  lastText.value = nextText;
  pendingSelection.value = getSelectionOffsets();
  skipRender.value = { text: nextText, runsKey: nextRunsKey };
  emit("update", {
    ...props.block,
    text: nextText,
    runs: nextRuns
  });
};

const onCompositionEnd = (): void => {
  isComposing.value = false;
  handleInput();
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

const contentStyle = computed(() => {
  return {
    fontSize: `${props.block.fontSize ?? DEFAULT_FONT_SIZE_PX}px`
  };
});

onMounted(updateHtml);

watch(
  () => [props.block.text, props.block.runs],
  () => {
    if (isComposing.value) {
      return;
    }
    lastText.value = props.block.text;
    const currentRunsKey = runsKey(props.block.runs);
    if (
      skipRender.value &&
      skipRender.value.text === props.block.text &&
      skipRender.value.runsKey === currentRunsKey
    ) {
      skipRender.value = null;
      return;
    }
    updateHtml();
    skipRender.value = null;
    if (pendingSelection.value) {
      restoreSelection(pendingSelection.value);
      pendingSelection.value = null;
    }
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
