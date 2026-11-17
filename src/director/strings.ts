/**
 * The director's strings (the board design, section 4): each card (a
 * situation type's cause, a circumstance row) hangs on the strings its own
 * row names, and this index inverts them once, at load, so a moment or a
 * record is checked only against the cards on its own strings, never the
 * whole library. Built once per library and kept; nothing here reads the
 * world.
 *
 * Strings:
 * - `label:<label>`: a cause that matches one moment label;
 * - `prefix:<prefix>`: a cause that matches a label prefix (a tie's turn);
 * - `cause-kind:<kind>`: a cause that matches the cause's own kind;
 * - `open`: a cause that names none of these, tried on every moment;
 * - `record:<kind>`: a circumstance row a record of that kind can call.
 *
 * The cards on a string keep the library's own order, so a lookup binds the
 * same types in the same order the full loop did.
 */
import {
  CIRCUMSTANCES,
  type CircumstanceLibrary,
  type CircumstanceRow,
} from "./circumstance";
import type {
  SituationCause,
  SituationLibrary,
  SituationType,
} from "./scheduling";
import type { Moment } from "./types";
import { P } from "../core2/parameters";

const [first, second] = [P.zero, P.one];

/** One situation type's cause on the strings it names, with its place in the library. */
export interface CauseCard {
  type: SituationType;
  cause: SituationCause;
  /** The type's index in the library, then the cause's within the type. */
  order: readonly [number, number];
}

export interface StringIndex {
  /** Each string's situation-type causes, in library order. */
  causes: Map<string, CauseCard[]>;
  /** The label prefixes some cause names, each its own `prefix:` string. */
  prefixes: readonly string[];
  /** Each `record:<kind>` string's circumstance rows, in file order. */
  rows: Map<string, CircumstanceRow[]>;
}

const built = new WeakMap<
  SituationLibrary,
  WeakMap<CircumstanceLibrary, StringIndex>
>();

function add<T>(into: Map<string, T[]>, key: string, value: T): void {
  const list = into.get(key);
  if (list) list.push(value);
  else into.set(key, [value]);
}

/** The strings a cause hangs on: its label, label prefix or cause kind, or `open`. */
function stringsOfCause(cause: SituationCause): string[] {
  const match = cause.match;
  // A cause with no match fires on nothing (causeMatches).
  if (!match) return [];
  if (match.label !== undefined) return [`label:${match.label}`];
  if (match.labelPrefix !== undefined) return [`prefix:${match.labelPrefix}`];
  if (match.causeKind !== undefined) return [`cause-kind:${match.causeKind}`];
  return ["open"];
}

/** The index of every card by the strings it names, built once per library. */
export function cardsByString(
  library: SituationLibrary,
  circumstances: CircumstanceLibrary = CIRCUMSTANCES,
): StringIndex {
  let byRows = built.get(library);
  if (!byRows) built.set(library, (byRows = new WeakMap()));
  const kept = byRows.get(circumstances);
  if (kept) return kept;
  const causes = new Map<string, CauseCard[]>();
  const prefixes = new Set<string>();
  library.types.forEach((type, typeAt) =>
    type.causes.forEach((cause, causeAt) => {
      for (const key of stringsOfCause(cause)) {
        add(causes, key, { type, cause, order: [typeAt, causeAt] });
        if (key.startsWith("prefix:")) prefixes.add(cause.match!.labelPrefix!);
      }
    }),
  );
  const rows = new Map<string, CircumstanceRow[]>();
  for (const row of circumstances.rows)
    for (const kind of row.recordKinds) add(rows, `record:${kind}`, row);
  const index: StringIndex = { causes, prefixes: [...prefixes], rows };
  byRows.set(circumstances, index);
  return index;
}

/**
 * The causes a moment could match, by the strings it touches (its label,
 * every prefix its label starts with, its cause kind, and the open causes),
 * in the library's order: type by type, cause by cause.
 */
export function causesOnMoment(
  index: StringIndex,
  moment: Pick<Moment, "label" | "causeKind">,
): CauseCard[] {
  const keys = [
    `label:${moment.label}`,
    ...index.prefixes
      .filter((prefix) => moment.label.startsWith(prefix))
      .map((prefix) => `prefix:${prefix}`),
    `cause-kind:${moment.causeKind}`,
    "open",
  ];
  const cards = keys.flatMap((key) => index.causes.get(key) ?? []);
  return cards.length > P.one
    ? cards.sort(
        (a, b) =>
          a.order[first] - b.order[first] || a.order[second] - b.order[second],
      )
    : cards;
}

/** The circumstance rows a record of this kind can call, in file order. */
export function rowsOnRecord(
  index: StringIndex,
  kind: string,
): readonly CircumstanceRow[] {
  return index.rows.get(`record:${kind}`) ?? [];
}
