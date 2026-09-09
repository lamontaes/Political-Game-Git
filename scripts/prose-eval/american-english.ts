/** Development-time authored-copy checks, not a simulation or grounding rule. */
const queueIdiom = /\bqueue(d|ing|s)?\b/i;

export const BRITISH_IDIOM: readonly { pattern: RegExp; instead: string }[] = [
  { pattern: /\bprogrammes?\b/i, instead: "program(s)" },
  { pattern: /£/, instead: "$" },
  { pattern: /\bcouncillors?\b/i, instead: "council member(s)" },
  { pattern: /\blorr(y|ies)\b/i, instead: "truck / trucks" },
  { pattern: /\bwhilst\b/i, instead: "while" },
  { pattern: /\bamongst\b/i, instead: "among" },
  { pattern: /\bfortnights?\b/i, instead: "two weeks" },
  { pattern: /\bcatchment\b/i, instead: "attendance zone" },
  { pattern: /\bthe bins\b/i, instead: "the trash cans" },
  { pattern: /\bcar parks?\b/i, instead: "parking lot(s)" },
  { pattern: /\bpetrol\b/i, instead: "gas" },
  { pattern: /\bpavements?\b/i, instead: "sidewalk(s)" },
  { pattern: /\bmaths\b/i, instead: "math" },
  { pattern: /\bchemist's\b/i, instead: "pharmacy" },
  { pattern: /\bsolicitors?\b/i, instead: "lawyer(s)" },
  {
    pattern: /\bcentral ministry\b/i,
    instead: "a named federal or state agency",
  },
  { pattern: /\bpostcodes?\b/i, instead: "ZIP code(s)" },
  { pattern: /\bnappies\b/i, instead: "diapers" },
  { pattern: queueIdiom, instead: "line / lined up" },
];

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
