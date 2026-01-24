declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, {}, unknown>;
  export default component;
}
