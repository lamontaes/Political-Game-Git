/**
 * The town's counted residents as voters (two-level population): each counted
 * adult votes from their own record (age, traits, work hours) without being
 * filled in as a full person. Filled-in residents are full people and vote
 * through the named route.
 */
import { registerCountedPeople, registerViewLeans } from "./campaign-views";
import { residentsRuntime } from "./modules/residents";
import { VIEWS_KEYS, VIEWS_MODULE_ID, viewOf } from "./modules/views";
import { corePlaceByJurisdictionId } from "./place-lookup";
import viewsData from "./data/views/views.json" with { type: "json" };
import { coreAPI } from "./state";
import type { CoreState, PersonInput } from "./types";

export interface CountedVoter {
  readonly id: string;
  readonly birthDate: string;
  readonly placeId: string;
  readonly traits: Readonly<Record<string, number>>;
  /** Scheduled weekly work, from their recorded commitments. */
  readonly weeklyMinutes: number;
}

const cache = new WeakMap<CoreState, { date: string; rows: CountedVoter[] }>();

/** Every counted resident still counted (not filled in), with their record's facts. */
export function countedResidents(core: CoreState): readonly CountedVoter[] {
  const hit = cache.get(core);
  if (hit && hit.date === core.date) return hit.rows;
  const rt = residentsRuntime(core);
  const rows: CountedVoter[] = [];
  if (rt)
    for (const record of rt.households.values()) {
      if (rt.filledIn.has(record.household.id)) continue;
      const minutes = new Map<string, number>();
      for (const c of record.workCommitments)
        if (c.endsAt === undefined || c.endsAt > core.date)
          minutes.set(
            c.personId,
            (minutes.get(c.personId) ?? 0) + c.expectedWeeklyMinutes,
          );
      for (const person of record.people as readonly PersonInput[]) {
        if (core.people.has(person.id)) continue;
        rows.push({
          id: person.id,
          birthDate: person.birthDate,
          placeId: person.placeId,
          traits: person.traits,
          weeklyMinutes: minutes.get(person.id) ?? 0,
        });
      }
    }
  rows.sort((a, b) => a.id.localeCompare(b.id));
  cache.set(core, { date: core.date, rows });
  return rows;
}

/** Let the counted residents rank with the full people for lean. */
export function registerElectorate(core: CoreState): void {
  registerCountedPeople(core.people, () => countedResidents(core));
  // Where PEOPLE's views engine runs, a full person's lean is their own
  // view; a counted resident's is their survey cell's (state, age,
  // education and faith) spread by their personality.
  if (!core.modules.has(VIEWS_MODULE_ID)) return;
  const api = coreAPI(core);
  const counted = new Map<string, CountedVoter>();
  registerViewLeans(core.people, (person, z) => {
    if (core.people.has(person.id)) return viewOf(api, person.id)?.lean ?? 0;
    if (!counted.size)
      for (const row of countedResidents(core)) counted.set(row.id, row);
    const row = counted.get(person.id);
    if (!row) return 0;
    const cell = surveyCell(row.placeId, row.birthDate, core.startedAt);
    return cell.mean + cell.sd * z;
  });
}

const MIN_CELL = (
  viewsData.parameters as unknown as Record<string, { value: number }>
).minimumCellRespondents!.value;
const cells = new Map<
  string,
  { mean: number; sd: number; engagement?: number }
>();
/**
 * A counted resident's survey cell: their state's CES 2024 spread at their
 * age (the state's whole spread where the age cell is thin, the nation's
 * where the survey has no state sample), shared by everyone of that age.
 */
function surveyCell(
  placeId: string,
  birthDate: string,
  date: string,
): { mean: number; sd: number; engagement?: number } {
  const key = corePlaceByJurisdictionId(placeId as never)?.stateJurisdictionKey;
  const state = key ? key.slice(key.lastIndexOf("-") + 1) : "";
  const age =
    Number(date.slice(0, 4)) -
    Number(birthDate.slice(0, 4)) -
    (date.slice(5) < birthDate.slice(5) ? 1 : 0);
  const band =
    VIEWS_KEYS.ageBands.find((b) => {
      const [low, high] = b.split("-");
      return age >= Number(low) && (high === "plus" || age <= Number(high));
    }) ?? VIEWS_KEYS.ageBands[0]!;
  const id = `${state}:${band}`;
  let cell = cells.get(id);
  if (!cell) {
    const row = VIEWS_KEYS.states[state];
    const byAge = row?.byAge[band];
    cell = row
      ? byAge && byAge.n >= MIN_CELL
        ? byAge
        : row
      : VIEWS_KEYS.national;
    cells.set(id, cell);
  }
  return cell;
}

/**
 * How closely a voter follows politics (CES 2024 news interest, 0 to 1),
 * where PEOPLE's views engine runs: a full person's own, a counted
 * resident's survey cell's (state and age). Null without the engine.
 */
export function engagementOf(
  core: CoreState,
  voter: {
    readonly id: string;
    readonly birthDate?: string;
    readonly placeId?: string;
  },
): number | null {
  if (!core.modules.has(VIEWS_MODULE_ID)) return null;
  if (core.people.has(voter.id))
    return viewOf(coreAPI(core), voter.id)?.engagement ?? null;
  if (!voter.birthDate || !voter.placeId) return null;
  const cell = surveyCell(voter.placeId, voter.birthDate, core.startedAt) as {
    engagement?: number;
  };
  return cell.engagement ?? VIEWS_KEYS.national.engagement ?? null;
}

/** The nation's average engagement, the center turnout reads it against. */
export const NATIONAL_ENGAGEMENT = VIEWS_KEYS.national.engagement ?? 0;
