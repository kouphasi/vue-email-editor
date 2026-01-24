import { getQueriesForElement } from "@testing-library/dom";
import { applyBoldToggle, adjustRunsForTextChange } from "../src/core/text_formatting";
import type { TextRun } from "../src/core/types";

describe("text formatting", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  const renderText = (text: string): ReturnType<typeof getQueriesForElement> => {
    const container = document.createElement("div");
    container.textContent = text;
    document.body.appendChild(container);
    return getQueriesForElement(container);
  };

  it("toggles bold for a selected range", () => {
    const text = "Hello world";
    const runs: TextRun[] = [{ start: 0, end: 5, bold: true, color: null }];

    const result = applyBoldToggle(text, runs, 0, 5);

    expect(result).toEqual([]);

    const { getByText } = renderText("Bold cleared");
    expect(getByText("Bold cleared")).toBeTruthy();
  });

  it("shifts runs after an insertion", () => {
    const previous = "Hello world";
    const next = "Hello brave world";
    const runs: TextRun[] = [{ start: 6, end: 11, bold: false, color: "#111111" }];

    const result = adjustRunsForTextChange(previous, next, runs);

    expect(result).toEqual([{ start: 12, end: 17, bold: false, color: "#111111" }]);

    const { getByText } = renderText("Run shifted");
    expect(getByText("Run shifted")).toBeTruthy();
  });
});
