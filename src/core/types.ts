export type BlockType = "text" | "button" | "image" | "html" | "custom" | "table";
export type PreviewMode = "mobile" | "desktop";
export type PreviewWidthPx = 375 | 640;

export interface LayoutSettings {
  previewMode: PreviewMode;
  previewWidthPx: PreviewWidthPx;
}

export interface Document {
  id: string;
  blocks: Block[];
  layout: LayoutSettings;
}

export interface BlockBase {
  id: string;
  type: BlockType;
}

export interface TextRun {
  start: number;
  end: number;
  bold: boolean;
  color: string | null;
}

export interface TextBlock extends BlockBase {
  type: "text";
  text: string;
  runs: TextRun[];
  fontSize?: number;
  align?: BlockAlign;
}

export type ButtonShape = "square" | "rounded" | "pill";

export interface ButtonBlock extends BlockBase {
  type: "button";
  label: string;
  url: string;
  shape: ButtonShape;
  textColor: string;
  backgroundColor: string;
  fontSize?: number;
  align?: BlockAlign;
}

export type ImageStatus = "pending" | "ready" | "uploading" | "error";
export type BlockAlign = "left" | "center" | "right";
export type ImageAlign = BlockAlign;

export interface ImageBlock extends BlockBase {
  type: "image";
  url: string;
  status: ImageStatus;
  display: {
    widthPx?: number;
    heightPx?: number;
    align?: BlockAlign;
  };
}

export interface HtmlBlock extends BlockBase {
  type: "html";
  content: string;
}

export type CellBlock = TextBlock | ButtonBlock | ImageBlock | HtmlBlock;

export interface TableCell {
  id: string;
  widthPercent?: number;
  blocks: CellBlock[];
}

export interface TableRow {
  id: string;
  cells: TableCell[];
}

export interface TableBlock extends BlockBase {
  type: "table";
  rows: TableRow[];
  columnCount: number;
  cellPadding?: number;
}

export type SettingsFieldType =
  | "string"
  | "number"
  | "boolean"
  | "color"
  | "select"
  | "url"
  | "html"
  | "richtext";

export interface SettingsFieldOption {
  label: string;
  value: string | number;
}

export interface SettingsField {
  key: string;
  label: string;
  type: SettingsFieldType;
  required?: boolean;
  default?: unknown;
  options?: SettingsFieldOption[];
  min?: number;
  max?: number;
  pattern?: string;
  helpText?: string;
}

export interface SettingsSchema {
  fields: SettingsField[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  ok: boolean;
  missingFields: string[];
  errors?: ValidationError[];
}

export interface CustomBlockDefinition {
  id: string;
  displayName: string;
  settingsSchema: SettingsSchema;
  defaultConfig: Record<string, unknown>;
  validate: (config: Record<string, unknown>, context?: unknown) => ValidationResult;
  renderHtml: (
    config: Record<string, unknown>,
    context?: { mode?: "preview" | "export"; [key: string]: unknown }
  ) => string;
}

export type CustomBlockState = "ready" | "invalid" | "missing-definition";

export interface CustomBlockInstance extends BlockBase {
  type: "custom";
  definitionId: string;
  config: Record<string, unknown>;
  state: CustomBlockState;
  readOnly: boolean;
}

export type Block =
  | TextBlock
  | ButtonBlock
  | ImageBlock
  | HtmlBlock
  | CustomBlockInstance
  | TableBlock;

export const PREVIEW_WIDTHS: Record<PreviewMode, PreviewWidthPx> = {
  mobile: 375,
  desktop: 640
};

export interface EditorState {
  selectedBlockId: string | null;
  isEditingText: boolean;
}
