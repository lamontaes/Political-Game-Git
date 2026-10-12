/** Measurement-only plain JSON census; no world, cash writer or aggregate JSON string. */
import type { Parameter } from "../parameters";

export const OPENING_INPUT_BYTES_PER_RESIDENT =
  "openingInputMaxBytesPerResident";
export const OPENING_INPUT_SOURCE_SHARE = "openingInputMaxSourceByteShare";
export const OPENING_INPUT_SOURCE_DEFINITION =
  "direct nonoverlapping compact Source objects plus escaped-layer compact inner Source objects in canonical encoded JSON; all noncanonical encoded JSON object/array records use separately reported physical-token upper bounds, including records with unknown or discarded Source content";

type Tally = {
  bytes: number;
  directSourceBytes: number;
  encodedSourceBytes: number;
  noncanonicalEncodedRecordUpperBoundBytes: number;
  sourceOccurrences: number;
};
type Kind = Tally & { rows: number; dueDates: Record<string, number> };
const empty = (): Tally => ({
  bytes: 0,
  directSourceBytes: 0,
  encodedSourceBytes: 0,
  noncanonicalEncodedRecordUpperBoundBytes: 0,
  sourceOccurrences: 0,
});
function safe(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error("Opening input byte census overflows.");
  return value;
}
function add(to: Tally, from: Tally): void {
  for (const key of Object.keys(to) as (keyof Tally)[])
    to[key] = safe(to[key] + from[key]);
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function sourceRecord(value: unknown): value is Record<string, unknown> {
  if (!record(value)) return false;
  const tag = Object.getOwnPropertyDescriptor(value, "tag")?.value,
    citation = Object.getOwnPropertyDescriptor(value, "citation")?.value,
    asOf = Object.getOwnPropertyDescriptor(value, "asOf")?.value;
  return (
    (tag === "SOURCED" || tag === "ESTIMATED") &&
    typeof citation === "string" &&
    typeof asOf === "string"
  );
}
/** Standard well-formed JSON string token bytes, including quotes, without constructing it. */
export function compactJsonStringBytes(text: string): number {
  let bytes = 2;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code === 34 || code === 92) bytes += 2;
    else if (code <= 31) bytes += [8, 9, 10, 12, 13].includes(code) ? 2 : 6;
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        i += 1;
      } else bytes += 6;
    } else if (code >= 0xdc00 && code <= 0xdfff) bytes += 6;
    else bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : 3;
  }
  return safe(bytes);
}
const omitted = (value: unknown) =>
  value === undefined ||
  typeof value === "function" ||
  typeof value === "symbol";
function escapedPieceBytes(piece: string, depth: number): number {
  for (let layer = 0; layer < depth; layer += 1)
    piece = JSON.stringify(piece).slice(1, -1);
  return Buffer.byteLength(piece, "utf8");
}
/** Descriptor-only nearest hook lookup, also for callable objects before omission. */
function rejectJsonHook(value: object): void {
  for (
    let owner: object | null = value;
    owner !== null;
    owner = Object.getPrototypeOf(owner)
  ) {
    const hook = Object.getOwnPropertyDescriptor(owner, "toJSON");
    if (!hook) continue;
    if (!("value" in hook) || typeof hook.value === "function")
      throw new TypeError("Opening census rejects toJSON hooks and accessors.");
    return; // Native nonfunction shadowing stops lookup here.
  }
}
/** JSON.parse makes a finite data graph; check every container before native stringify. */
function rejectDecodedJsonHooks(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  rejectJsonHook(value);
  for (const key of Object.keys(value)) {
    const field = Object.getOwnPropertyDescriptor(value, key);
    if (!field || !("value" in field))
      throw new TypeError("Opening census requires decoded data properties.");
    rejectDecodedJsonHooks(field.value);
  }
}

function encodedSources(
  text: string,
  depth: number,
): Pick<
  Tally,
  | "encodedSourceBytes"
  | "noncanonicalEncodedRecordUpperBoundBytes"
  | "sourceOccurrences"
> {
  const result = {
    encodedSourceBytes: 0,
    noncanonicalEncodedRecordUpperBoundBytes: 0,
    sourceOccurrences: 0,
  };
  if (!/^\s*[[{]/.test(text)) return result;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return result;
  }
  // Do not let inherited hooks run in canonical validation or Source-leaf stringify.
  rejectDecodedJsonHooks(parsed);
  const walk = (value: unknown, layer: number): typeof result => {
    const out = {
      encodedSourceBytes: 0,
      noncanonicalEncodedRecordUpperBoundBytes: 0,
      sourceOccurrences: 0,
    };
    if (sourceRecord(value)) {
      out.encodedSourceBytes = escapedPieceBytes(JSON.stringify(value), layer);
      out.sourceOccurrences = 1;
    } else if (Array.isArray(value) || record(value)) {
      for (const child of Array.isArray(value) ? value : Object.values(value)) {
        const next = walk(child, layer);
        out.encodedSourceBytes = safe(
          out.encodedSourceBytes + next.encodedSourceBytes,
        );
        out.noncanonicalEncodedRecordUpperBoundBytes = safe(
          out.noncanonicalEncodedRecordUpperBoundBytes +
            next.noncanonicalEncodedRecordUpperBoundBytes,
        );
        out.sourceOccurrences = safe(
          out.sourceOccurrences + next.sourceOccurrences,
        );
      }
    } else if (typeof value === "string")
      return encodedSources(value, layer + 1);
    return out;
  };
  let canonical = false;
  // Each validation serializes one already encoded record, never aggregate input.
  try {
    canonical = JSON.stringify(parsed) === text;
  } catch {
    canonical = false;
  }
  const found = walk(parsed, depth);
  if (canonical) return found;
  // Duplicate keys may erase genuine Source objects during parse. Every noncanonical
  // encoded JSON record is conservatively unknown, including Source-free records.
  result.noncanonicalEncodedRecordUpperBoundBytes = escapedPieceBytes(
    JSON.stringify(text),
    depth - 1,
  );
  result.sourceOccurrences = found.sourceOccurrences;
  return result;
}

export function censusOpeningInput(input: unknown) {
  if (!record(input))
    throw new Error("Opening input census requires a plain root record.");
  const roster = Object.getOwnPropertyDescriptor(input, "people");
  if (
    !roster?.enumerable ||
    !("value" in roster) ||
    !Array.isArray(roster.value)
  )
    throw new TypeError(
      "Opening census requires an enumerable own data-array people roster.",
    );
  const residents = roster.value.length;
  const summaryString = (
    term: Record<string, unknown>,
    key: string,
    missing: string,
  ): string => {
    const field = Object.getOwnPropertyDescriptor(term, key);
    if (field && !("value" in field))
      throw new TypeError(
        "Opening census rejects accessor contract summary fields.",
      );
    return field?.enumerable && typeof field.value === "string"
      ? field.value
      : missing;
  };
  const ancestors = new Set<object>(),
    sections: Record<string, Tally> = Object.create(null),
    contractKinds: Record<string, Kind> = Object.create(null);
  const count = (
    value: unknown,
    path: readonly string[],
    insideSource = false,
  ): Tally => {
    const tally = empty();
    // Native stringify would consult BigInt.prototype.toJSON if installed.
    // BigInt is unsupported even when that hook could manufacture a JSON value.
    if (typeof value === "bigint")
      throw new TypeError("Opening census rejects BigInt.");
    if (typeof value === "string") {
      tally.bytes = compactJsonStringBytes(value);
      if (!insideSource) Object.assign(tally, encodedSources(value, 1));
      return tally;
    }
    if (value === null || typeof value !== "object") {
      const token = JSON.stringify(value);
      if (token === undefined)
        throw new TypeError("Opening census requires a JSON-compatible value.");
      tally.bytes = Buffer.byteLength(token, "utf8");
      return tally;
    }
    const array = Array.isArray(value),
      proto = Object.getPrototypeOf(value);
    if (
      array
        ? proto !== Array.prototype
        : proto !== Object.prototype && proto !== null
    )
      throw new TypeError(
        "Opening census requires plain record/array prototypes.",
      );
    rejectJsonHook(value);
    if (ancestors.has(value))
      throw new TypeError("Opening census rejects cyclic JSON.");
    ancestors.add(value);
    const ownSource = !insideSource && sourceRecord(value);
    try {
      tally.bytes = 2;
      let emitted = false;
      function* keys(): Generator<string> {
        if (array)
          for (let i = 0; i < (value as unknown[]).length; i += 1)
            yield String(i);
        else yield* Object.keys(value as object);
      }
      for (const key of keys()) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        // Native arrays read inherited indices. Reject rather than silently count null;
        // `in` detects data/getter entries without reading an inherited getter.
        if (array && !descriptor && key in value)
          throw new TypeError(
            "Opening census rejects inherited array indices.",
          );
        if (descriptor && !("value" in descriptor))
          throw new TypeError("Opening census requires plain data properties.");
        const child = descriptor?.value;
        // Callable objects have native toJSON lookup before omission/null conversion.
        if (typeof child === "function") rejectJsonHook(child);
        if (!array && omitted(child)) continue;
        if (emitted) tally.bytes += 1;
        emitted = true;
        if (!array) tally.bytes += compactJsonStringBytes(key) + 1;
        const next = count(
          array && omitted(child) ? null : child,
          [...path, key],
          insideSource || ownSource,
        );
        add(tally, next);
        if (path.length === 0) sections[key] = next;
        if (
          array &&
          path.length === 2 &&
          path[0] === "finance" &&
          path[1] === "contracts"
        ) {
          const term = record(child) ? child : {},
            kind = summaryString(term, "kind", "<missing-kind>");
          const bucket = contractKinds[kind] ?? {
            ...empty(),
            rows: 0,
            dueDates: Object.create(null) as Record<string, number>,
          };
          bucket.rows += 1;
          for (const name of Object.keys(next) as (keyof Tally)[])
            bucket[name] = safe(bucket[name] + next[name]);
          const due = summaryString(term, "dueAt", "<missing-due>");
          bucket.dueDates[due] = (bucket.dueDates[due] ?? 0) + 1;
          contractKinds[kind] = bucket;
        }
      }
      safe(tally.bytes);
      if (ownSource) {
        tally.directSourceBytes = tally.bytes;
        tally.sourceOccurrences = 1;
      }
      return tally;
    } finally {
      ancestors.delete(value);
    }
  };
  const totals = count(input, []);
  const exactSourceBytes = safe(
      totals.directSourceBytes + totals.encodedSourceBytes,
    ),
    declaredSourceBytes = safe(
      exactSourceBytes + totals.noncanonicalEncodedRecordUpperBoundBytes,
    );
  if (declaredSourceBytes > totals.bytes)
    throw new Error(
      "Opening Source attribution overlaps physical input bytes.",
    );
  return {
    definition:
      "Exact standard compact JSON UTF-8 bytes; no trailing newline; repeated aliases counted per occurrence.",
    sourceDefinition: OPENING_INPUT_SOURCE_DEFINITION,
    residents,
    bytes: totals.bytes,
    bytesPerResident: residents > 0 ? totals.bytes / residents : null,
    directSourceBytes: totals.directSourceBytes,
    canonicalEncodedSourceBytes: totals.encodedSourceBytes,
    noncanonicalEncodedRecordUpperBoundBytes:
      totals.noncanonicalEncodedRecordUpperBoundBytes,
    sourceOccurrences: totals.sourceOccurrences,
    exactSourceByteShare: exactSourceBytes / totals.bytes,
    declaredConservativeSourceByteShare: declaredSourceBytes / totals.bytes,
    sections,
    contractKinds,
  };
}
export type OpeningInputCensus = ReturnType<typeof censusOpeningInput>;
export function openingInputBudget(
  census: OpeningInputCensus,
  registry: Readonly<Record<string, Parameter>>,
) {
  const violations: string[] = [];
  const read = (id: string, share: boolean) => {
    const row = registry[id];
    if (
      !row ||
      row.tag !== "TUNABLE" ||
      !row.citation?.trim() ||
      !row.estimatedFrom?.trim() ||
      !row.checkRange?.ref?.trim() ||
      !Number.isFinite(row.value) ||
      row.value <= 0 ||
      (share && row.value > 1)
    ) {
      violations.push(`Missing/invalid registered opening-input budget: ${id}`);
      return null;
    }
    return row.value;
  };
  const maxBytesPerResident = read(OPENING_INPUT_BYTES_PER_RESIDENT, false),
    maxSourceByteShare = read(OPENING_INPUT_SOURCE_SHARE, true);
  if (census.residents <= 0 || census.bytesPerResident === null)
    violations.push("Opening input requires a positive actual resident count.");
  if (
    maxBytesPerResident !== null &&
    census.bytesPerResident !== null &&
    census.bytesPerResident > maxBytesPerResident
  )
    violations.push(
      "Opening input bytes per resident exceed the registered budget.",
    );
  if (
    maxSourceByteShare !== null &&
    census.declaredConservativeSourceByteShare > maxSourceByteShare
  )
    violations.push(
      "Opening input declared conservative Source-byte share exceeds the registered budget.",
    );
  return {
    passed: violations.length === 0,
    maxBytesPerResident,
    maxSourceByteShare,
    sourceShareUsed: "declaredConservativeSourceByteShare",
    violations,
  };
}
