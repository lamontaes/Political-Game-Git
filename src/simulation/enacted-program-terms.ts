import { addDays } from "./dates";
import { currentMeasureProvisions } from "./legislative-politics";
import type { EntityId, IsoDate, World } from "./types";

/**
 * The structure lever (spec 3 of "04 SYSTEM SPECS") for a program's life: an
 * enacted law that sets an end date for a program, extends it, or repeals it.
 *
 * Nothing is copied into a new record. The enacted section's own date is the
 * fact, read back from the law each time, so an adopted amendment to that
 * date is the date that counts. The latest enacted change wins, as a later
 * Act supersedes an earlier one, except that nothing revives a repealed
 * program: after a repeal, a later sunset or extension can only bring the
 * last day earlier. Each change binds only the jurisdiction that enacted it.
 *
 * Known gaps. The background legislative clock still drafts spending against
 * a standing program without asking whether it has ended. The transit
 * funding reader recognizes only the end-date variant. A program-life law
 * passed as one part of a bundle is not read. Spending already provided
 * before the last day keeps paying out, as a saving clause preserves
 * obligations entered into before it.
 */

export const PROGRAM_SUNSET_FAMILY = "program-sunset";

/** The section that carries each variant's date, and what the date means. */
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

function firstDate(text: string): IsoDate | null {
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

/**
 * What a program-life law names as its target. A standing program is named
 * by key within one jurisdiction; a program a bill set up, by that bill.
 */
export type ProgramTarget =
  | { readonly authorityKey: string; readonly jurisdictionId: EntityId }
  | { readonly measureId: EntityId };

const KIND: Readonly<Record<string, ProgramTermChange["kind"]>> = {
  "terminate-on-date": "sunset",
  "extend-authority": "extension",
  "repeal-outright": "repeal",
};

/** The term change one enacted measure makes, if it is a program-life law. */
export function programTermChangeOf(
  world: World,
  measureId: EntityId,
): (ProgramTermChange & { readonly target: ProgramTarget }) | null {
  const enactment = (world.history.legislativeEnactments ?? []).find(
    (row) => row.measureId === measureId && row.outcome === "enacted",
  );
  const lineage = (world.history.legislativeDraftLineages ?? []).find(
    (row) =>
      row.measureId === measureId &&
      row.familyKey === PROGRAM_SUNSET_FAMILY &&
      row.componentKey === undefined,
  );
  const measure = (world.history.legislativeMeasures ?? []).find(
    (row) => row.id === measureId,
  );
  if (!enactment || !lineage || !measure) return null;
  const dated = DATED_SECTION[lineage.variantKey];
  const kind = KIND[lineage.variantKey];
  if (!dated || !kind) return null;
  const section = currentMeasureProvisions(world, measureId).find(
    (row) => row.provisionKey === dated.provisionKey,
  );
  const date = section ? firstDate(section.text) : null;
  if (!section || date === null) return null;
  const target: ProgramTarget | null = lineage.authorityMeasureId
    ? { measureId: lineage.authorityMeasureId }
    : lineage.authorityKey
      ? {
          authorityKey: lineage.authorityKey,
          jurisdictionId: measure.jurisdictionId,
        }
      : null;
  if (!target) return null;
  return {
    measureId,
    provisionId: section.id,
    kind,
    lastDay: addDays(date, dated.lastDayOffset),
    enactedOn: enactment.resolvedAt,
    enactmentSequence: enactment.sequence,
    jurisdictionId: measure.jurisdictionId,
    target,
  };
}

function sameTarget(left: ProgramTarget, right: ProgramTarget): boolean {
  return "authorityKey" in left
    ? "authorityKey" in right &&
        left.authorityKey === right.authorityKey &&
        left.jurisdictionId === right.jurisdictionId
    : "measureId" in right && left.measureId === right.measureId;
}

/**
 * The program's last day in force as enacted law now sets it, or null when no
 * enacted law has set one. Changes apply in the order they were enacted; the
 * latest wins, but once a repeal is enacted a later change can only shorten
 * the program. Read-only.
 */
export function programLastDay(
  world: World,
  target: ProgramTarget,
): ProgramTermChange | null {
  const lifeLaws = new Set(
    (world.history.legislativeDraftLineages ?? [])
      .filter((row) => row.familyKey === PROGRAM_SUNSET_FAMILY)
      .map((row) => row.measureId),
  );
  if (lifeLaws.size === 0) return null;
  const changes: ProgramTermChange[] = [];
  for (const enactment of world.history.legislativeEnactments ?? []) {
    if (enactment.outcome !== "enacted" || !lifeLaws.has(enactment.measureId))
      continue;
    const change = programTermChangeOf(world, enactment.measureId);
    if (change && sameTarget(change.target, target)) changes.push(change);
  }
  changes.sort((left, right) =>
    left.enactedOn === right.enactedOn
      ? left.enactmentSequence - right.enactmentSequence
      : left.enactedOn < right.enactedOn
        ? -1
        : 1,
  );
  let current: ProgramTermChange | null = null;
  let repealed = false;
  for (const change of changes) {
    // Neither a sunset nor an extension re-enacts a repealed program.
    if (!repealed || current === null || change.lastDay < current.lastDay)
      current = change;
    if (change.kind === "repeal") repealed = true;
  }
  return current;
}

/** Whether enacted law has ended the program as of the world's date. */
export function programHasEnded(
  world: World,
  target: ProgramTarget | null,
): boolean {
  if (target === null) return false;
  const term = programLastDay(world, target);
  return term !== null && world.currentDate > term.lastDay;
}
