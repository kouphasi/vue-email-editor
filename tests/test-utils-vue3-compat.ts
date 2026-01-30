import {
  mount as baseMount,
  shallowMount as baseShallowMount,
  config
} from "@vue/test-utils-vue3";

type UnknownRecord = Record<string, unknown>;
type MountOptions = Parameters<typeof baseMount>[1];

const normalizeOptions = (options?: MountOptions): MountOptions | undefined => {
  if (!options || typeof options !== "object" || !("propsData" in options)) {
    return options;
  }

  const { propsData, ...rest } = options as UnknownRecord & { propsData?: unknown; props?: unknown };
  const restRecord = rest as UnknownRecord;
  const mergedProps: UnknownRecord = {
    ...(typeof restRecord.props === "object" && restRecord.props ? (restRecord.props as UnknownRecord) : {}),
    ...(typeof propsData === "object" && propsData ? (propsData as UnknownRecord) : {})
  };

  return {
    ...(rest as MountOptions),
    props: mergedProps
  } as MountOptions;
};

const withDestroy = <T extends { destroy?: () => void; unmount?: () => void }>(wrapper: T): T => {
  if (!wrapper.destroy && wrapper.unmount) {
    wrapper.destroy = () => wrapper.unmount?.();
  }
  return wrapper;
};

export const mount: typeof baseMount = (component, options) =>
  withDestroy(baseMount(component, normalizeOptions(options)));
export const shallowMount: typeof baseShallowMount = (component, options) =>
  withDestroy(baseShallowMount(component, normalizeOptions(options)));

export { config };
