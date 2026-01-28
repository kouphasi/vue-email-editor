import type { CustomBlockDefinition } from "./types";

type RegistrySubscriber = (definitions: CustomBlockDefinition[]) => void;

export class DuplicateCustomBlockDefinitionError extends Error {
  definitionId: string;

  constructor(definitionId: string) {
    super(`Custom block definition with id \"${definitionId}\" already exists`);
    this.name = "DuplicateCustomBlockDefinitionError";
    this.definitionId = definitionId;
  }
}

const registry = new Map<string, CustomBlockDefinition>();
const subscribers = new Set<RegistrySubscriber>();

const notifySubscribers = (): void => {
  const snapshot = listCustomBlockDefinitions();
  for (const subscriber of subscribers) {
    subscriber(snapshot);
  }
};

export const registerCustomBlock = (definition: CustomBlockDefinition): void => {
  if (registry.has(definition.id)) {
    throw new DuplicateCustomBlockDefinitionError(definition.id);
  }

  registry.set(definition.id, definition);
  notifySubscribers();
};

export const getCustomBlockDefinition = (
  definitionId: string
): CustomBlockDefinition | undefined => {
  return registry.get(definitionId);
};

export const listCustomBlockDefinitions = (): CustomBlockDefinition[] => {
  return [...registry.values()].sort((a, b) => {
    return a.displayName.localeCompare(b.displayName);
  });
};

export const subscribeCustomBlockDefinitions = (
  subscriber: RegistrySubscriber
): (() => void) => {
  subscribers.add(subscriber);
  subscriber(listCustomBlockDefinitions());

  return () => {
    subscribers.delete(subscriber);
  };
};

const isDefinitionValid = (definition: CustomBlockDefinition): boolean => {
  return Boolean(
    definition.id &&
      definition.displayName &&
      definition.settingsSchema &&
      Array.isArray(definition.settingsSchema.fields) &&
      definition.defaultConfig &&
      typeof definition.validate === "function" &&
      typeof definition.renderHtml === "function"
  );
};

export const resolveCustomBlockState = (
  block: { definitionId: string; state?: "ready" | "invalid" | "missing-definition" }
): { state: "ready" | "invalid" | "missing-definition"; readOnly: boolean } => {
  const definition = getCustomBlockDefinition(block.definitionId);
  if (!definition) {
    return { state: "missing-definition", readOnly: true };
  }

  if (!isDefinitionValid(definition)) {
    return { state: "invalid", readOnly: false };
  }

  if (block.state === "invalid") {
    return { state: "invalid", readOnly: false };
  }

  return { state: "ready", readOnly: false };
};
