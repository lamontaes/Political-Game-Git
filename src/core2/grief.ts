/**
 * P15 part 4: grief after a death, and each person's own resilience line.
 *
 * Owner's ruling (October 10, 2026): each person carries their own emotional
 * resilience, generated once and keyed to them, and grief's pull toward rest
 * and family fades by it. Here the line is a grief half-life read at the
 * person's stable key from a log-normal spread. The spread is solved from
 * Bonanno et al. (2002): the share whose grief has fallen to "little" by 6
 * months (45.9%, the resilient pattern) and the share still above it at 18
 * months (15.6%, chronic grief). Nothing is rolled when someone dies: a
 * relative's grief is their closeness to the person who died, halving every
 * half-life of their own.
 */
import { daysBetweenText } from "./kernel/dates";
import { stableHash } from "./kernel/ids";
import { inverseStandardNormal } from "./kernel/deterministic-math";
import { currentCloseness } from "./closeness";
import data from "./data/grief.json" with { type: "json" };
import { extendData } from "./data";
import type {
  CoreAPI,
  CoreData,
  CoreEventInput,
  IsoDate,
  PersonState,
  ReasonBinding,
} from "./types";

export const GRIEF = data;

export interface Bereavement {
  eventId: string;
  deceasedId: string;
  date: IsoDate;
  /** Grief at the death: closeness to the person who died, 0 to 1. */
  grief: number;
}

const bereavements = new WeakMap<object, Map<string, Bereavement[]>>();
const halfLives = new WeakMap<object, Map<string, number>>();

function byPerson<T>(store: WeakMap<object, Map<string, T>>, key: object) {
  let rows = store.get(key);
  if (!rows) {
    rows = new Map();
    store.set(key, rows);
  }
  return rows;
}

/**
 * The person's grief half-life in days. With f the share of the starting
 * grief that counts as little, grief is little by day t when the half-life is
 * at most t·ln2/ln(1/f); the log-normal's two quantiles at 6 and 18 months
 * give its center and spread.
 */
export function griefHalfLifeDays(api: CoreAPI, personId: string): number {
  const cache = byPerson(halfLives, api.state);
  const known = cache.get(personId);
  if (known !== undefined) return known;
  const p = (key: string) => api.parameter(key);
  api.stopgap(GRIEF.stopgapId);
  const month = p("daysPerMeanYear") / p("monthsPerYear");
  const scale = Math.LN2 / Math.log(p("one") / p("griefLittleFraction"));
  const early = Math.log(p("griefEarlyCheckMonths") * month * scale);
  const late = Math.log(p("griefLateCheckMonths") * month * scale);
  const zEarly = inverseStandardNormal(p("griefResilientShare"));
  const zLate = inverseStandardNormal(p("one") - p("griefChronicShare"));
  const spread = (late - early) / (zLate - zEarly);
  const center = early - spread * zEarly;
  const digits = p("seedHashDigits");
  const radix = p("seedPlaceHashRadix");
  const hash = stableHash(
    `${api.state.seed}:${GRIEF.resilienceKey}:${personId}`,
  );
  const draw =
    (Number.parseInt(hash.slice(p("zero"), digits), radix) +
      p("one") / p("two")) /
    radix ** digits;
  const days = Math.exp(center + spread * inverseStandardNormal(draw));
  cache.set(personId, days);
  return days;
}

/** A death reaches each relative who learns of it with grief equal to their closeness. */
export function recordDeath(
  api: CoreAPI,
  event: CoreEventInput,
  learnedBy: readonly string[],
): void {
  if (!GRIEF.deathEventKinds.includes(event.kind)) return;
  api.stopgap(GRIEF.stopgapId);
  const store = byPerson(bereavements, api.state);
  for (const deceasedId of event.personIds)
    for (const id of learnedBy) {
      if (id === deceasedId) continue;
      const person = api.state.people.get(id);
      if (!person?.alive || !person.familyIds.has(deceasedId)) continue;
      const tie = api.state.relationships.get(
        [id, deceasedId].sort().join(":"),
      );
      if (!tie) continue;
      const rows = store.get(id) ?? [];
      rows.push({
        eventId: event.id,
        deceasedId,
        date: event.date,
        grief: currentCloseness(api.state, tie),
      });
      store.set(id, rows);
    }
}

/** Today's grief, summed over the person's losses and at most 1. */
export function griefToday(
  api: CoreAPI,
  person: Readonly<PersonState>,
): { grief: number; sourceIds: string[] } {
  const rows = bereavements.get(api.state)?.get(person.id);
  if (!rows?.length) return { grief: api.parameter("zero"), sourceIds: [] };
  const halfLife = griefHalfLifeDays(api, person.id);
  let grief = api.parameter("zero");
  for (const row of rows)
    grief +=
      row.grief *
      api.parameter("two") **
        (-daysBetweenText(row.date, api.state.date) / halfLife);
  return {
    grief: Math.min(api.parameter("one"), grief),
    sourceIds: rows.map((row) => row.eventId),
  };
}

/**
 * The acts grief bears on carry its reason only when the people module, which
 * provides it, is loaded; createLifeCore adds them, as drives add theirs.
 */
export function withGrief(base: CoreData): CoreData {
  const byAction = new Map<string, ReasonBinding[]>();
  for (const row of GRIEF.bindings)
    byAction.set(row.actionId, [
      ...(byAction.get(row.actionId) ?? []),
      row.binding as ReasonBinding,
    ]);
  return extendData(base, {
    actions: base.actions
      .filter((action) => byAction.has(action.id))
      .map((action) => ({
        ...action,
        reasonBindings: [
          ...(action.reasonBindings ?? []).filter(
            (binding) =>
              !byAction.get(action.id)!.some((row) => row.id === binding.id),
          ),
          ...byAction.get(action.id)!,
        ],
      })),
  });
}
