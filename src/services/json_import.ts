import { Document } from "../core/types";
import { validateDocument } from "./json_validation";

export const parseDocument = (json: string): Document => {
  const parsed = JSON.parse(json) as unknown;
  const validation = validateDocument(parsed as Document);
  if (!validation.valid) {
    throw new Error(validation.errors.join("; "));
  }

  return parsed as Document;
};
