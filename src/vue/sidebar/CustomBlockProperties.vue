<template>
  <div class="ee-custom-properties">
    <div v-if="!definition" class="ee-custom-missing">
      Custom block definition not found.
    </div>

    <div v-else class="ee-custom-fields">
      <SettingsFieldInput
        v-for="field in definition.settingsSchema.fields"
        :key="field.key"
        :field="field"
        :value="getFieldValue(field)"
        @update="handleFieldUpdate(field, $event)"
      />
    </div>

    <CustomBlockValidationSummary
      :missing-fields="validation.missingFields"
      :errors="validation.errors ?? []"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type {
  CustomBlockDefinition,
  CustomBlockInstance,
  SettingsField,
  ValidationError,
  ValidationResult
} from "../../core/types";
import {
  getCustomBlockDefinition,
  subscribeCustomBlockDefinitions
} from "../../core/custom_block_registry";
import { validateSettingsSchema } from "../../core/custom_block_validation";
import SettingsFieldInput from "./SettingsFieldInput.vue";
import CustomBlockValidationSummary from "./CustomBlockValidationSummary.vue";

const props = defineProps<{
  block: CustomBlockInstance;
}>();

const emit = defineEmits<{
  (event: "update", block: CustomBlockInstance): void;
}>();

const definition = ref<CustomBlockDefinition | undefined>(
  getCustomBlockDefinition(props.block.definitionId)
);
const draftConfig = ref<Record<string, unknown>>({});
const validation = ref<ValidationResult>({ ok: true, missingFields: [], errors: [] });
let unsubscribe: (() => void) | null = null;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const deepMerge = (base: unknown, overrides: unknown): unknown => {
  if (Array.isArray(base) || Array.isArray(overrides)) {
    return overrides !== undefined ? overrides : base;
  }

  if (isPlainObject(base) && isPlainObject(overrides)) {
    const merged: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(overrides)) {
      merged[key] = deepMerge(base[key], value);
    }
    return merged;
  }

  return overrides !== undefined ? overrides : base;
};

const buildSchemaDefaults = (current: CustomBlockDefinition): Record<string, unknown> => {
  const defaults: Record<string, unknown> = {};
  for (const field of current.settingsSchema.fields) {
    if (field.default !== undefined) {
      defaults[field.key] = field.default;
    }
  }
  return defaults;
};

const refreshDraftConfig = (): void => {
  if (!definition.value) {
    draftConfig.value = { ...props.block.config };
    return;
  }

  const baseConfig = deepMerge(
    buildSchemaDefaults(definition.value),
    definition.value.defaultConfig
  ) as Record<string, unknown>;
  draftConfig.value = deepMerge(baseConfig, props.block.config) as Record<string, unknown>;
};

const resolveValidation = (config: Record<string, unknown>): ValidationResult => {
  if (!definition.value) {
    return {
      ok: false,
      missingFields: [],
      errors: [{ field: "definition", message: "Definition not found." }]
    };
  }

  const schemaValidation = validateSettingsSchema(definition.value.settingsSchema, config);
  const missing = new Set(schemaValidation.missingFields);
  const errors: ValidationError[] = [...(schemaValidation.errors ?? [])];

  try {
    const customValidation = definition.value.validate(config);
    for (const field of customValidation.missingFields) {
      missing.add(field);
    }
    errors.push(...(customValidation.errors ?? []));
  } catch {
    errors.push({ field: "definition", message: "Validation failed." });
  }

  return {
    ok: missing.size === 0 && errors.length === 0,
    missingFields: [...missing],
    errors
  };
};

const updateValidation = (): void => {
  validation.value = resolveValidation(draftConfig.value);
};

const handleFieldUpdate = (field: SettingsField, value: unknown): void => {
  const nextConfig = { ...draftConfig.value, [field.key]: value };
  draftConfig.value = nextConfig;
  const nextValidation = resolveValidation(nextConfig);
  validation.value = nextValidation;

  if (nextValidation.ok) {
    emit("update", {
      ...props.block,
      config: nextConfig,
      state: "ready",
      readOnly: false
    });
  }
};

const getFieldValue = (field: SettingsField): unknown => {
  const value = draftConfig.value[field.key];
  if (value === undefined) {
    return field.type === "boolean" ? false : "";
  }
  return value;
};

onMounted(() => {
  refreshDraftConfig();
  updateValidation();
  unsubscribe = subscribeCustomBlockDefinitions((definitions) => {
    definition.value = definitions.find((item) => item.id === props.block.definitionId);
    refreshDraftConfig();
    updateValidation();
  });
});

watch(
  () => props.block,
  () => {
    definition.value = getCustomBlockDefinition(props.block.definitionId);
    refreshDraftConfig();
    updateValidation();
  },
  { deep: true }
);

onBeforeUnmount(() => {
  if (unsubscribe) {
    unsubscribe();
  }
  unsubscribe = null;
});
</script>

<style scoped>
.ee-custom-properties {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.ee-custom-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ee-custom-missing {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #f59e0b;
  background: #fffbeb;
  color: #92400e;
  font-size: 13px;
}
</style>
