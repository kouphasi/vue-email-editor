import { getQueriesForElement } from "@testing-library/dom";
import { mount } from "@vue/test-utils";
import type { CustomBlockDefinition, Document } from "../../src/core/types";
import { registerCustomBlock } from "../../src/core/custom_block_registry";
import BlockList from "../../src/vue/components/BlockList.vue";

const createDefinition = (id: string, displayName = "Hero"): CustomBlockDefinition => ({
  id,
  displayName,
  settingsSchema: {
    fields: [
      { key: "headline", label: "Headline", type: "string", required: true, default: "Hello" }
    ]
  },
  defaultConfig: { headline: "Hello" },
  validate: () => ({ ok: true, missingFields: [] }),
  renderHtml: (config) => `<div>${config.headline}</div>`
});

describe("Custom block fallback behavior", () => {
  it("shows a placeholder warning and read-only message for missing definitions", () => {
    const document: Document = {
      id: "doc-missing",
      layout: { previewMode: "desktop", previewWidthPx: 640 },
      blocks: [
        {
          id: "block-missing",
          type: "custom",
          definitionId: "missing-hero",
          config: { headline: "Hello" },
          state: "missing-definition",
          readOnly: true
        }
      ]
    };

    const wrapper = mount(BlockList, {
      propsData: { document, widthPx: 640 }
    });

    const { getByText } = getQueriesForElement(wrapper.element as HTMLElement);
    expect(getByText("Missing custom block: missing-hero")).toBeTruthy();
    expect(getByText("Read-only (delete only)")).toBeTruthy();

    wrapper.destroy();
  });

  it("renders normally once the definition is registered", async () => {
    const uniqueName = `Hero-${Date.now()}`;
    const definition = createDefinition(`hero-${Date.now()}-restore`, uniqueName);

    const document: Document = {
      id: "doc-restore",
      layout: { previewMode: "desktop", previewWidthPx: 640 },
      blocks: [
        {
          id: "block-restore",
          type: "custom",
          definitionId: definition.id,
          config: { headline: "Welcome" },
          state: "missing-definition",
          readOnly: true
        }
      ]
    };

    const wrapper = mount(BlockList, {
      propsData: { document, widthPx: 640 }
    });

    registerCustomBlock(definition);
    await wrapper.vm.$nextTick();

    const { getAllByText } = getQueriesForElement(wrapper.element as HTMLElement);
    expect(getAllByText(uniqueName).length).toBeGreaterThan(0);

    wrapper.destroy();
  });
});
