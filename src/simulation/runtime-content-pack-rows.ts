/**
 * JSON-only row envelopes for content packs.
 *
 * The envelope gives every row section one stable identity shape. Section
 * consumers remain responsible for interpreting `data` as their compiled
 * domain type; this module deliberately has no dispatch hooks or code loading.
 * This boundary is intentionally structural: domain-specific compiled
 * validators must be called before these rows affect simulation or presentation.
 */
export type ContentRowValue =
  | null
  | boolean
  | number
  | string
  | readonly ContentRowValue[]
  | { readonly [key: string]: ContentRowValue };

export interface RuntimeContentRow {
  readonly id: string;
  readonly data: { readonly [key: string]: ContentRowValue };
}

export interface RuntimeContentRows {
  readonly policyRows?: readonly RuntimeContentRow[];
  readonly institutionRows?: readonly RuntimeContentRow[];
  readonly effectRows?: readonly RuntimeContentRow[];
  readonly balanceRows?: readonly RuntimeContentRow[];
  readonly characterRows?: readonly RuntimeContentRow[];
  readonly dialogueRows?: readonly RuntimeContentRow[];
}

export type RuntimeContentRowSection = keyof RuntimeContentRows;

const SECTIONS: readonly RuntimeContentRowSection[] = [
  "policyRows",
  "institutionRows",
  "effectRows",
  "balanceRows",
  "characterRows",
  "dialogueRows",
];
const MAX_ROWS_PER_SECTION = 512;
const MAX_ROW_DEPTH = 16;
const MAX_ROW_TEXT = 8_000;
const FORBIDDEN_FIELD =
  /(?:callback|function|handler|script|sourcecode|filepath|url)/iu;
const NAMESPACED_ID = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertDataValue(
  value: unknown,
  section: RuntimeContentRowSection,
  rowId: string,
  depth: number,
): asserts value is ContentRowValue {
  if (depth > MAX_ROW_DEPTH)
    throw new Error(
      `${section} row '${rowId}' exceeds the data nesting limit.`,
    );
  if (
    value === null ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  )
    return;
  if (typeof value === "string") {
    if (
      value.length > MAX_ROW_TEXT ||
      /https?:\/\//iu.test(value) ||
      /^(?:file:|\\\\|\/)/iu.test(value)
    )
      throw new Error(
        `${section} row '${rowId}' contains a URL, path or oversized text value.`,
      );
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 1024)
      throw new Error(`${section} row '${rowId}' contains an oversized list.`);
    value.forEach((entry) => assertDataValue(entry, section, rowId, depth + 1));
    return;
  }
  if (!isRecord(value))
    throw new Error(`${section} row '${rowId}' contains a non-data value.`);
  for (const [field, entry] of Object.entries(value)) {
    if (FORBIDDEN_FIELD.test(field) || /(?:^|_)path$/iu.test(field))
      throw new Error(
        `${section} row '${rowId}' contains forbidden field '${field}'.`,
      );
    assertDataValue(entry, section, rowId, depth + 1);
  }
}

function assertSectionRows(
  section: RuntimeContentRowSection,
  value: unknown,
): asserts value is readonly RuntimeContentRow[] {
  if (!Array.isArray(value) || value.length > MAX_ROWS_PER_SECTION)
    throw new Error(
      `${section} must be a list of at most ${MAX_ROWS_PER_SECTION} rows.`,
    );
  const ids = new Set<string>();
  for (const row of value) {
    if (!isRecord(row))
      throw new Error(`${section} contains a non-object row.`);
    if (
      Object.keys(row).some((field) => field !== "id" && field !== "data") ||
      typeof row.id !== "string" ||
      !NAMESPACED_ID.test(row.id) ||
      !isRecord(row.data)
    )
      throw new Error(
        `${section} rows require only a namespaced id and data object.`,
      );
    if (ids.has(row.id))
      throw new Error(`${section} repeats row identity '${row.id}'.`);
    ids.add(row.id);
    assertDataValue(row.data, section, row.id, 0);
  }
}

export function assertRuntimeContentRows(
  value: unknown,
): asserts value is RuntimeContentRows {
  if (!isRecord(value)) throw new Error("Content rows require an object.");
  if (
    Object.keys(value).some(
      (section) => !SECTIONS.includes(section as RuntimeContentRowSection),
    )
  )
    throw new Error("Content rows contain an unsupported section.");
  for (const section of SECTIONS) {
    if (Object.hasOwn(value, section))
      assertSectionRows(section, value[section]);
  }
}

export function mergeRuntimeContentRows(
  packs: readonly (RuntimeContentRows | undefined)[],
): RuntimeContentRows {
  const merged: Partial<Record<RuntimeContentRowSection, RuntimeContentRow[]>> =
    {};
  for (const section of SECTIONS) {
    const rows: RuntimeContentRow[] = [];
    const identities = new Set<string>();
    for (const pack of packs) {
      for (const row of pack?.[section] ?? []) {
        if (identities.has(row.id))
          throw new Error(
            `${section} identity '${row.id}' is already defined.`,
          );
        identities.add(row.id);
        rows.push(structuredClone(row));
      }
    }
    if (rows.length) merged[section] = rows;
  }
  return merged;
}
