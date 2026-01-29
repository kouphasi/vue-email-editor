<template>
  <div class="ee-canvas-text-block" :style="containerStyle" @click.stop="handleClick">
    <div
      ref="contentRef"
      class="ee-text-content"
      :contenteditable="isEditable"
      @input="handleInput"
      @compositionstart="isComposing = true"
      @compositionend="onCompositionEnd"
      @keyup="updateSelection"
      @mouseup="updateSelection"
      @blur="updateSelection"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from "vue";
import type { TextBlock } from "../../core/types";
import { DEFAULT_FONT_SIZE_PX } from "../../core/validation";
import { adjustRunsForTextChange, applyBoldToggle, applyColor } from "../../core/text_formatting";

const props = defineProps<{
  block: TextBlock;
  selected: boolean;
  editing: boolean;
}>();

const emit = defineEmits<{
  (event: "update", block: TextBlock): void;
  (event: "edit"): void;
  (event: "select"): void;
}>();

const contentRef = ref<HTMLDivElement | null>(null);
const lastText = ref(props.block.text);
const isComposing = ref(false);
const pendingSelection = ref<{ start: number; end: number } | null>(null);
const lastSelection = ref<{ start: number; end: number } | null>(null);
const skipRender = ref<{ text: string; runsKey: string } | null>(null);

const isEditable = computed(() => props.editing);

const containerStyle = computed(() => {
  return {
    textAlign: props.block.align ?? "left",
    fontSize: `${props.block.fontSize ?? DEFAULT_FONT_SIZE_PX}px`
  };
});

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
      html += `<span style="font-family: inherit; ${styles.join(";")}">${content}</span>`;
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
  let start = startRange.toString().length;

  const endRange = range.cloneRange();
  endRange.selectNodeContents(contentRef.value);
  endRange.setEnd(range.endContainer, range.endOffset);
  let end = endRange.toString().length;
  
  const textLength = props.block.text.length;
  start = Math.min(start, textLength);
  end = Math.min(end, textLength);

  return { start, end };
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
  
  if (!props.editing) return;

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

const updateSelection = () => {
    const sel = getSelectionOffsets();
    if (sel) {
        lastSelection.value = sel;
    }
};

const handleInput = (): void => {
  if (isComposing.value) {
    return;
  }
  const nextText = contentRef.value?.textContent ?? "";
  const nextRuns = adjustRunsForTextChange(lastText.value, nextText, props.block.runs);
  const nextRunsKey = runsKey(nextRuns);
  lastText.value = nextText;
  
  updateSelection();
  pendingSelection.value = lastSelection.value;
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

const handleClick = () => {
  if (!props.selected) {
    emit("select");
  } else if (!props.editing) {
    emit("edit");
  }
};

const toggleBold = () => {
  const selection = lastSelection.value;
  if (!selection) return;

  const nextRuns = applyBoldToggle(
    props.block.text,
    props.block.runs,
    selection.start,
    selection.end
  );

  pendingSelection.value = selection;
  emit("update", {
    ...props.block,
    runs: nextRuns
  });
};

const setColor = (color: string) => {
  const selection = lastSelection.value;
  if (!selection) return;

  const nextRuns = applyColor(
    props.block.text,
    props.block.runs,
    selection.start,
    selection.end,
    color
  );

  pendingSelection.value = selection;
  emit("update", {
    ...props.block,
    runs: nextRuns
  });
};

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
      props.editing &&
      skipRender.value &&
      skipRender.value.text === props.block.text &&
      skipRender.value.runsKey === currentRunsKey
    ) {
      skipRender.value = null;
      return;
    }
    updateHtml();
    skipRender.value = null;
    if (pendingSelection.value && props.editing) {
      restoreSelection(pendingSelection.value);
      pendingSelection.value = null;
    }
  },
  { deep: true }
);

watch(() => props.editing, (newVal, oldVal) => {
    if (newVal) {
        nextTick(() => {
            contentRef.value?.focus();
            updateSelection();
        });
        return;
    }
    if (!newVal && oldVal) {
        skipRender.value = null;
        pendingSelection.value = null;
        updateHtml();
    }
});

defineExpose({
    toggleBold,
    setColor
});
</script>

<style scoped>
.ee-canvas-text-block {
    outline: none;
}
.ee-text-content {
  min-height: 1.5em;
  outline: none;
  white-space: pre-wrap;
}
</style>
