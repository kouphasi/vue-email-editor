import {
  mount as baseMount,
  shallowMount as baseShallowMount,
  config
} from "@vue/test-utils-vue3";

type AnyRecord = Record<string, any>;

const normalizeOptions = (options?: AnyRecord): AnyRecord | undefined => {
  if (!options || !("propsData" in options)) {
    return options;
  }

  const { propsData, ...rest } = options;
  return {
    ...rest,
    props: {
      ...(rest.props as AnyRecord | undefined),
      ...(propsData as AnyRecord)
    }
  };
};

const withDestroy = <T extends { destroy?: () => void; unmount?: () => void }>(wrapper: T): T => {
  if (!wrapper.destroy && wrapper.unmount) {
    wrapper.destroy = () => wrapper.unmount?.();
  }
  return wrapper;
};

export const mount = (component: any, options?: AnyRecord) =>
  withDestroy(baseMount(component, normalizeOptions(options) as any));
export const shallowMount = (component: any, options?: AnyRecord) =>
  withDestroy(baseShallowMount(component, normalizeOptions(options) as any));

export { config };
