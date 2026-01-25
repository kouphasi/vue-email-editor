import { getQueriesForElement } from "@testing-library/dom";
import { areTextRunsValid, isValidHexColor, isValidHttpUrl } from "../src/core/validation";

describe("validation helpers", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  const renderMessage = (message: string): ReturnType<typeof getQueriesForElement> => {
    const container = document.createElement("div");
    container.textContent = message;
    document.body.appendChild(container);
    return getQueriesForElement(container);
  };

  it("checks URL and color formats", () => {
    expect(isValidHttpUrl("https://example.com")).toBe(true);
    expect(isValidHttpUrl("ftp://example.com")).toBe(false);
    expect(isValidHexColor("#fff")).toBe(true);
    expect(isValidHexColor("#12g")).toBe(false);

    const { getByText } = renderMessage("Validation checked");
    expect(getByText("Validation checked")).toBeTruthy();
  });

  it("rejects overlapping text runs", () => {
    const text = "Hello world";
    const runs = [
      { start: 0, end: 5, bold: true, color: null },
      { start: 4, end: 11, bold: false, color: "#111111" }
    ];

    expect(areTextRunsValid(text, runs)).toBe(false);

    const { getByText } = renderMessage("Runs invalid");
    expect(getByText("Runs invalid")).toBeTruthy();
  });
});
