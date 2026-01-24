import { getQueriesForElement } from "@testing-library/dom";
import { shallowMount } from "@vue/test-utils";
import type { Document } from "../src/core/types";
import BlockList from "../src/vue/components/BlockList.vue";

describe("BlockList", () => {
  it("renders block labels and remove actions", () => {
    const document: Document = {
      id: "doc-1",
      layout: {
        previewMode: "desktop",
        previewWidthPx: 640
      },
      blocks: [
        {
          id: "text-1",
          type: "text",
          text: "Hello",
          runs: []
        },
        {
          id: "button-1",
          type: "button",
          label: "Click",
          url: "https://example.com",
          shape: "rounded",
          textColor: "#ffffff",
          backgroundColor: "#2563eb"
        },
        {
          id: "image-1",
          type: "image",
          url: "https://example.com/image.png",
          status: "ready",
          display: {
            widthPx: 320,
            heightPx: 200,
            align: "center"
          }
        }
      ]
    };

    const wrapper = shallowMount(BlockList, {
      propsData: {
        document,
        widthPx: 640
      }
    });

    const { getByText, getAllByText } = getQueriesForElement(wrapper.element as HTMLElement);

    expect(getByText("Text block")).toBeTruthy();
    expect(getByText("Button block")).toBeTruthy();
    expect(getByText("Image block")).toBeTruthy();
    expect(getAllByText("Remove")).toHaveLength(3);

    wrapper.destroy();
  });
});
