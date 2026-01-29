import { TextRun } from "./types";

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const FONT_SIZE_MIN_PX = 8;
export const FONT_SIZE_MAX_PX = 72;
export const DEFAULT_FONT_SIZE_PX = 16;

export function isValidHttpUrl(value: string): boolean {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidHexColor(value: string | null | undefined): boolean {
  if (value == null) {
    return true;
  }

  return HEX_COLOR_REGEX.test(value);
}

export function areTextRunsValid(text: string, runs: TextRun[]): boolean {
  if (!Array.isArray(runs)) {
    return false;
  }

  const length = text.length;
  let lastEnd = 0;

  for (const run of runs) {
    if (!Number.isInteger(run.start) || !Number.isInteger(run.end)) {
      return false;
    }

    if (run.start < 0 || run.end > length || run.end <= run.start) {
      return false;
    }

    if (run.start < lastEnd) {
      return false;
    }

    lastEnd = run.end;
  }

  return true;
}

export function isValidFontSize(value: number | undefined): boolean {
  if (value === undefined) {
    return true;
  }

  return (
    Number.isFinite(value) &&
    value >= FONT_SIZE_MIN_PX &&
    value <= FONT_SIZE_MAX_PX
  );
}
