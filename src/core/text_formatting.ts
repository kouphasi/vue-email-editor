import { TextRun } from "./types";

type TextStyle = {
  bold: boolean;
  color: string | null;
};

type Segment = {
  start: number;
  end: number;
  style: TextStyle;
};

const DEFAULT_STYLE: TextStyle = { bold: false, color: null };

const cloneStyle = (style: TextStyle): TextStyle => ({
  bold: style.bold,
  color: style.color
});

const stylesEqual = (a: TextStyle, b: TextStyle): boolean => {
  return a.bold === b.bold && a.color === b.color;
};

const normalizeRuns = (textLength: number, runs: TextRun[]): Segment[] => {
  const sorted = [...runs].sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;

  for (const run of sorted) {
    if (run.start > cursor) {
      segments.push({
        start: cursor,
        end: run.start,
        style: cloneStyle(DEFAULT_STYLE)
      });
    }

    segments.push({
      start: run.start,
      end: run.end,
      style: {
        bold: run.bold,
        color: run.color
      }
    });

    cursor = run.end;
  }

  if (cursor < textLength) {
    segments.push({
      start: cursor,
      end: textLength,
      style: cloneStyle(DEFAULT_STYLE)
    });
  }

  return segments;
};

const splitSegments = (segments: Segment[], positions: number[]): Segment[] => {
  const boundaries = [...new Set(positions)].sort((a, b) => a - b);
  const result: Segment[] = [];

  for (const segment of segments) {
    const cuts = boundaries.filter((pos) => pos > segment.start && pos < segment.end);
    if (cuts.length === 0) {
      result.push(segment);
      continue;
    }

    let start = segment.start;
    for (const cut of cuts) {
      result.push({ start, end: cut, style: cloneStyle(segment.style) });
      start = cut;
    }

    result.push({ start, end: segment.end, style: cloneStyle(segment.style) });
  }

  return result;
};

const mergeSegments = (segments: Segment[]): Segment[] => {
  if (segments.length === 0) {
    return [];
  }

  const merged: Segment[] = [];

  for (const segment of segments) {
    const last = merged[merged.length - 1];
    if (last && stylesEqual(last.style, segment.style)) {
      last.end = segment.end;
      continue;
    }

    merged.push({
      start: segment.start,
      end: segment.end,
      style: cloneStyle(segment.style)
    });
  }

  return merged;
};

const segmentsToRuns = (segments: Segment[]): TextRun[] => {
  const runs: TextRun[] = [];

  for (const segment of segments) {
    if (stylesEqual(segment.style, DEFAULT_STYLE)) {
      continue;
    }

    runs.push({
      start: segment.start,
      end: segment.end,
      bold: segment.style.bold,
      color: segment.style.color
    });
  }

  return runs;
};

const isValidRange = (textLength: number, start: number, end: number): boolean => {
  return start >= 0 && end <= textLength && end > start;
};

export const applyBoldToggle = (
  text: string,
  runs: TextRun[],
  start: number,
  end: number
): TextRun[] => {
  if (!isValidRange(text.length, start, end)) {
    return runs;
  }

  const base = normalizeRuns(text.length, runs);
  const split = splitSegments(base, [start, end]);
  const shouldDisable = split.some(
    (segment) => segment.start >= start && segment.end <= end && segment.style.bold
  );

  const updated = split.map((segment) => {
    if (segment.start >= start && segment.end <= end) {
      return {
        ...segment,
        style: {
          ...segment.style,
          bold: !shouldDisable
        }
      };
    }

    return segment;
  });

  return segmentsToRuns(mergeSegments(updated));
};

export const applyColor = (
  text: string,
  runs: TextRun[],
  start: number,
  end: number,
  color: string | null
): TextRun[] => {
  if (!isValidRange(text.length, start, end)) {
    return runs;
  }

  const base = normalizeRuns(text.length, runs);
  const split = splitSegments(base, [start, end]);
  const updated = split.map((segment) => {
    if (segment.start >= start && segment.end <= end) {
      return {
        ...segment,
        style: {
          ...segment.style,
          color
        }
      };
    }

    return segment;
  });

  return segmentsToRuns(mergeSegments(updated));
};

export const adjustRunsForTextChange = (
  previousText: string,
  nextText: string,
  runs: TextRun[]
): TextRun[] => {
  if (previousText === nextText) {
    return runs;
  }

  const previousLength = previousText.length;
  const nextLength = nextText.length;
  const minLength = Math.min(previousLength, nextLength);

  let start = 0;
  while (start < minLength && previousText[start] === nextText[start]) {
    start += 1;
  }

  let previousEnd = previousLength - 1;
  let nextEnd = nextLength - 1;
  while (
    previousEnd >= start &&
    nextEnd >= start &&
    previousText[previousEnd] === nextText[nextEnd]
  ) {
    previousEnd -= 1;
    nextEnd -= 1;
  }

  const oldChangeEnd = previousEnd >= start ? previousEnd + 1 : start;
  const delta = nextLength - previousLength;

  const clamp = (value: number): number => {
    return Math.min(Math.max(value, 0), nextLength);
  };

  const updated: TextRun[] = [];

  const pushRun = (run: TextRun): void => {
    const startClamped = clamp(run.start);
    const endClamped = clamp(run.end);
    if (endClamped > startClamped) {
      updated.push({
        ...run,
        start: startClamped,
        end: endClamped
      });
    }
  };

  for (const run of runs) {
    if (run.end <= start) {
      pushRun(run);
      continue;
    }

    if (run.start >= oldChangeEnd) {
      pushRun({
        ...run,
        start: run.start + delta,
        end: run.end + delta
      });
      continue;
    }

    if (run.start < start) {
      pushRun({
        ...run,
        end: Math.min(run.end, start)
      });
    }

    if (run.end > oldChangeEnd) {
      pushRun({
        ...run,
        start: Math.max(run.start, oldChangeEnd) + delta,
        end: run.end + delta
      });
    }
  }

  updated.sort((a, b) => a.start - b.start);

  const merged: TextRun[] = [];
  for (const run of updated) {
    const last = merged[merged.length - 1];
    if (last && last.end === run.start && last.bold === run.bold && last.color === run.color) {
      last.end = run.end;
      continue;
    }

    merged.push({
      ...run
    });
  }

  return merged;
};
