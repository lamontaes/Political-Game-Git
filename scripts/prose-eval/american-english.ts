/** Development-time authored-copy checks, not a simulation or grounding rule. */
import { BRITISH_IDIOM, queueIdiom } from "./british-idiom.mjs";

export { BRITISH_IDIOM };

export type CopyField = {
  path: string;
  text: string;
  provenance:
    | "authored"
    | "identifier"
    | "quotation"
    | "official-name"
    | "source-example"
    | "historical";
  /** Non-authored exceptions must name their source or preservation reason. */
  reason?: string;
  /** Reviewed meaning of this authored field, never a provenance exemption.
   * A caller must establish that every queue reference is administrative
   * processing, not infer this from an identifier or a word-list pass.
   */
  authoredUsage?: {
    kind: "administrative-processing-queue";
    reason: string;
  };
};

export function checkAmericanEnglish(fields: readonly CopyField[]): string[] {
  return fields.flatMap((field) => {
    if (field.provenance !== "authored")
      return field.reason?.trim()
        ? []
        : [`${field.path}: exception needs a source or preservation reason`];
    if (
      field.authoredUsage &&
      (field.authoredUsage.kind !== "administrative-processing-queue" ||
        !field.authoredUsage.reason.trim())
    )
      return [
        `${field.path}: authored usage needs a supported kind and contextual reason`,
      ];
    return BRITISH_IDIOM.filter(
      ({ pattern }) =>
        !(
          pattern === queueIdiom &&
          field.authoredUsage?.kind === "administrative-processing-queue"
        ) && pattern.test(field.text),
    ).map(
      ({ pattern, instead }) =>
        `${field.path}: ${pattern.source} — say ${instead}`,
    );
  });
}

/** Traverse explicit authored field names, never every string or object key.
 * Callers split source examples, quotations and historical records before this
 * adapter, and supply their provenance separately to checkAmericanEnglish.
 */
export function authoredDataFields(
  value: unknown,
  keys: ReadonlySet<string>,
  path = "$",
): CopyField[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) => {
    const location = `${path}.${key}`;
    if (typeof item === "string" && keys.has(key))
      return [{ path: location, text: item, provenance: "authored" as const }];
    return authoredDataFields(item, keys, location);
  });
}
