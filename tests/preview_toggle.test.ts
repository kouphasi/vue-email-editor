import { getQueriesForElement } from "@testing-library/dom";
import { mount } from "@vue/test-utils";
import PreviewToggle from "../src/vue/components/PreviewToggle.vue";

describe("PreviewToggle", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders buttons with the active state", () => {
    const wrapper = mount(PreviewToggle, {
      propsData: {
        mode: "desktop"
      }
    });

    const { getByRole } = getQueriesForElement(wrapper.element as HTMLElement);
    const desktopButton = getByRole("button", { name: "Desktop" });
    const mobileButton = getByRole("button", { name: "Mobile" });

    expect(desktopButton.classList.contains("is-active")).toBe(true);
    expect(mobileButton.classList.contains("is-active")).toBe(false);

    wrapper.destroy();
  });

  it("emits change when a button is clicked", async () => {
    const wrapper = mount(PreviewToggle, {
      propsData: {
        mode: "desktop"
      }
    });

    const buttons = wrapper.findAll("button");
    await buttons.at(1)?.trigger("click");

    expect(wrapper.emitted("change")).toEqual([["mobile"]]);

    wrapper.destroy();
  });
});
