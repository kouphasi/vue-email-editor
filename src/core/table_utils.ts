import type { TableRow } from "./types";

/**
 * セル幅のパーセンテージを計算します。
 * 未定義の幅は残りのスペースから均等配分されます。
 * 合計が100%にならない場合は正規化されます。
 */
export const resolveCellWidths = (row: TableRow, columnCount: number): number[] => {
  const cells = row.cells;
  if (cells.length === 0) {
    return [];
  }

  const fallback = columnCount > 0 ? 100 / columnCount : 100 / cells.length;
  const widths = cells.map((cell) =>
    typeof cell.widthPercent === "number" &&
    Number.isFinite(cell.widthPercent) &&
    cell.widthPercent > 0
      ? cell.widthPercent
      : undefined
  );

  const defined = widths.filter((value) => value !== undefined) as number[];
  const definedSum = defined.reduce((sum, value) => sum + value, 0);
  const missingCount = widths.length - defined.length;

  if (defined.length === 0) {
    return cells.map(() => fallback);
  }

  if (missingCount > 0) {
    const remaining = Math.max(0, 100 - definedSum);
    const fill = remaining > 0 ? remaining / missingCount : fallback;
    return widths.map((value) => value ?? fill);
  }

  if (definedSum > 0 && Math.abs(definedSum - 100) > 0.01) {
    const scale = 100 / definedSum;
    return defined.map((value) => value * scale);
  }

  return defined;
};
