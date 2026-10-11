import { addDays } from "./calendar";
type EntityId = string;
type IsoDate = string;
const DATED_SECTION: Readonly<
  Record<
    string,
    { readonly provisionKey: string; readonly lastDayOffset: number }
  >
> = {
  // "shall have no further effect after <date>": the date is its last day.
  "terminate-on-date": { provisionKey: "sunset-date", lastDayOffset: 0 },
  // "The expiration date ... is replaced with <date>".
  "extend-authority": { provisionKey: "extension-date", lastDayOffset: 0 },
  // "The repeal ... takes effect on <date>": the day before is its last day.
  "repeal-outright": { provisionKey: "effective-date", lastDayOffset: -1 },
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// STOPGAP RULES4-OW-006: first textual date is parsed permissively; see stopgaps.json.
export function firstDate(text: string): IsoDate | null {
  const match = /([A-Z][a-z]+) (\d{1,2}), (\d{4})/.exec(text);
  if (!match) return null;
  const month = MONTHS.indexOf(match[1]!);
  if (month < 0) return null;
  return `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[2]!.padStart(2, "0")}` as IsoDate;
}

export interface ProgramTermChange {
  readonly measureId: EntityId;
  readonly provisionId: EntityId;
  readonly kind: "sunset" | "extension" | "repeal";
  /** The last day the program is in force under this Act. */
  readonly lastDay: IsoDate;
  readonly enactedOn: IsoDate;
  readonly enactmentSequence: number;
  readonly jurisdictionId: EntityId;
}

export type ProgramTarget =
  | { readonly authorityKey: string; readonly jurisdictionId: EntityId }
  | { readonly measureId: EntityId };

const KIND: Readonly<Record<string, ProgramTermChange["kind"]>> = {
  "terminate-on-date": "sunset",
  "extend-authority": "extension",
  "repeal-outright": "repeal",
};

export function sameTarget(left: ProgramTarget, right: ProgramTarget): boolean {
  return "authorityKey" in left
    ? "authorityKey" in right &&
        left.authorityKey === right.authorityKey &&
        left.jurisdictionId === right.jurisdictionId
    : "measureId" in right && left.measureId === right.measureId;
}

export interface ProgramTermFacts {
  readonly enactment: {
    readonly resolvedAt: string;
    readonly sequence: number;
  } | null;
  readonly lineage: {
    readonly variantKey: string;
    readonly authorityMeasureId?: string;
    readonly authorityKey?: string;
    readonly componentKey?: string;
  } | null;
  readonly jurisdictionId: string | null;
  readonly sections: readonly {
    readonly id: string;
    readonly provisionKey: string;
    readonly text: string;
  }[];
}
/** The caller selects the first enacted row and first unbundled program-sunset lineage. */
// STOPGAP RULES4-OW-007: bundled program-life lineages remain excluded.
export function programTermChangeFromFacts(
  measureId: string,
  facts: ProgramTermFacts,
): (ProgramTermChange & { readonly target: ProgramTarget }) | null {
  const { enactment, lineage, jurisdictionId, sections } = facts;
  if (
    !enactment ||
    !lineage ||
    jurisdictionId === null ||
    lineage.componentKey !== undefined
  )
    return null;
  const dated = DATED_SECTION[lineage.variantKey];
  const kind = KIND[lineage.variantKey];
  if (!dated || !kind) return null;
  const section = sections.find(
    (row) => row.provisionKey === dated.provisionKey,
  );
  const date = section ? firstDate(section.text) : null;
  if (!section || date === null) return null;
  const target: ProgramTarget | null = lineage.authorityMeasureId
    ? { measureId: lineage.authorityMeasureId }
    : lineage.authorityKey
      ? { authorityKey: lineage.authorityKey, jurisdictionId }
      : null;
  if (!target) return null;
  return {
    measureId,
    provisionId: section.id,
    kind,
    lastDay: addDays(date, dated.lastDayOffset),
    enactedOn: enactment.resolvedAt,
    enactmentSequence: enactment.sequence,
    jurisdictionId,
    target,
  };
}
/** Input order retains enactment order for equal dates and sequences. No date cutoff existed in legacy. */
export function programLastDayFromFacts(
  changes: readonly (ProgramTermChange & { readonly target: ProgramTarget })[],
  target: ProgramTarget,
): ProgramTermChange | null {
  const selected = changes.filter((change) =>
    sameTarget(change.target, target),
  );
  selected.sort((left, right) =>
    left.enactedOn === right.enactedOn
      ? left.enactmentSequence - right.enactmentSequence
      : left.enactedOn < right.enactedOn
        ? -1
        : 1,
  );
  let current: ProgramTermChange | null = null;
  let repealed = false;
  for (const change of selected) {
    if (!repealed || current === null || change.lastDay < current.lastDay)
      current = change;
    if (change.kind === "repeal") repealed = true;
  }
  return current;
}
export function programHasEndedFromFacts(
  at: string,
  target: ProgramTarget | null,
  changes: readonly (ProgramTermChange & { readonly target: ProgramTarget })[],
): boolean {
  if (target === null) return false;
  const term = programLastDayFromFacts(changes, target);
  return term !== null && at > term.lastDay;
}
