/**
 * Moves before the start (owner, Oct 28, 2026: "simulate to the birth
 * year... general to make the game flow"; pool item history-past-moves).
 * Whether a full adult came to the county is read from their records: a
 * parent living outside it, else a recorded birthplace outside it. When they
 * came is run by the moves engine's own rule, a year at a step: from the
 * year they were grown, their pull to leave where they were builds by the
 * share of people their age in their state who leave a county in a year
 * (ACS 2024, the moves engine's own rate, handed in by the people engine),
 * held back while
 * they have children at home, and they move on the day it reaches one whole
 * move (`movesStayPull`). Someone whose pull would not reach it before the
 * start came in the run's last year. No roll decides anything. Their
 * children at home born by then come with them.
 *
 * `residenceOn` is the one reader of where a full person lived on a day
 * before the start: the school engine's run, the working-life run and the
 * people engine's births and partnerships read it.
 */
import moveRows from "./data/moves/parameters.json" with { type: "json" };
import { addDays, makeIsoDate } from "./kernel/dates";
import { preStartHistory } from "./pre-start";
import { stopgap } from "./stopgaps";
import type { HistoryRecord, HistoryWriter, PreStartWindow } from "./pre-start";
import type { CoreAPI, CoreState, PersonId, PersonState } from "./types";

export const PERSON_MOVED_IN = "person.moved-in";

const MOVES = moveRows as unknown as Readonly<
  Record<string, { value: number }>
>;

/** The moves engine's life-stage rate: the share of people of an age in a place's state who leave their county in a year (src/core2/modules/moves.ts `departureRateFor`). */
export type DepartureRate = (placeId: string, age: number) => number;

/** The place a person's records say they came from: a parent living outside the county, else their recorded birthplace outside it. */
function originOf(
  core: Readonly<CoreState>,
  person: Readonly<PersonState>,
): { placeId: string; recordId: string } | undefined {
  const here = new Set([person.placeId, person.countyId].filter(Boolean));
  for (const fact of person.pastFacts ?? []) {
    if (!["family:parent", "family:other-parent"].includes(fact.kind)) continue;
    const parent = core.people.get(fact.facts?.otherPersonId as PersonId);
    if (parent?.alive && !here.has(parent.placeId))
      return { placeId: parent.placeId, recordId: fact.id };
  }
  const born = (person.pastFacts ?? []).find(
    (fact) => fact.kind === "birthplace",
  );
  const bornIn = born?.facts?.placeId;
  return born && bornIn && !here.has(bornIn)
    ? { placeId: bornIn, recordId: born.id }
    : undefined;
}

/** The person's own children, by their family records. */
function childrenOf(
  core: Readonly<CoreState>,
  person: Readonly<PersonState>,
): PersonState[] {
  return (person.pastFacts ?? []).flatMap((fact) => {
    if (fact.kind !== "family:child") return [];
    const child = core.people.get(fact.facts?.otherPersonId as PersonId);
    return child ? [child] : [];
  });
}

/** The moves into the county before the start, by the moves engine's yearly pull. */
function moveRecords(
  api: CoreAPI,
  window: PreStartWindow,
  rate: DepartureRate,
): Omit<HistoryRecord, "moduleId">[] {
  const core = api.state as CoreState;
  stopgap("SG-HIST-moves-life-stage-only");
  const grown = api.parameter("votingAge");
  const daysPerYear = api.parameter("daysPerMeanYear");
  const enough = MOVES.movesStayPull!.value;
  const childrenHold = Math.exp(-MOVES.movesChildrenHold!.value);
  const lastYear = Number(window.through.slice(0, 4)) - 1;
  // The economy pass's months, oldest first: the one in force on a day is
  // the latest at or before it.
  const months = preStartHistory(core, { kind: "economy.conditions" });
  const monthOn = (date: string) => {
    let found: string | undefined;
    for (const row of months) {
      if (row.date > date) break;
      found = row.id;
    }
    return found;
  };
  const rows: Omit<HistoryRecord, "moduleId">[] = [];
  for (const person of core.people.values()) {
    if (!person.alive || person.tier === "husk") continue;
    // A child comes with the parent who moved, never alone.
    const born = makeIsoDate(person.birthDate);
    if (addDays(born, Math.round(grown * daysPerYear)) > window.through)
      continue;
    const origin = originOf(core, person);
    if (!origin) continue;
    const children = childrenOf(core, person);
    let pull = 0;
    let date: string | undefined;
    for (
      let age = grown;
      Number(born.slice(0, 4)) + age <= lastYear && !date;
      age += 1
    ) {
      const from = addDays(born, Math.round(age * daysPerYear));
      if (from >= window.through) break;
      // Children at home that year hold them where they are.
      const atHome = children.some(
        (child) =>
          child.birthDate <= from &&
          addDays(
            makeIsoDate(child.birthDate),
            Math.round(grown * daysPerYear),
          ) > from,
      );
      const year = rate(person.placeId, age) * (atHome ? childrenHold : 1);
      if (pull + year >= enough) {
        const share = (enough - pull) / year;
        date = addDays(makeIsoDate(from), Math.round(share * daysPerYear));
      }
      pull += year;
    }
    // A pull that would not reach one whole move before the start: they came
    // in the run's last year, on their birthday.
    date ??= `${lastYear}-${born.slice(5)}`.replace("-02-29", "-03-01");
    if (date < window.from || date > window.through) continue;
    const withThem = children
      .filter(
        (child) =>
          child.alive &&
          child.householdId === person.householdId &&
          child.birthDate < date!,
      )
      .map((child) => child.id);
    rows.push({
      id: `${PERSON_MOVED_IN}:${person.id}`,
      date: makeIsoDate(date),
      kind: PERSON_MOVED_IN,
      placeId: person.placeId,
      personIds: [person.id, ...withThem],
      facts: {
        personId: person.id,
        fromPlaceId: origin.placeId,
        toPlaceId: person.placeId,
        originRecordId: origin.recordId,
        // The month of the life-stage pull that carried them: the economy
        // pass's record in force that day where it has one.
        pushedBy:
          monthOn(date) ?? `life-stage:${date.slice(0, "YYYY-MM".length)}`,
      },
      publicRecord: false,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation:
          "The moves engine's life-stage rate (ACS 2024 county leaving by age and state, data/research/migration/mover-rates-acs-2024.json), held back by children at home (movesChildrenHold), to one whole move (movesStayPull).",
        estimatedFrom:
          "Whether they came from the person's family and birthplace records; when, from the yearly run of that pull from the year they were grown.",
      },
    });
  }
  return rows;
}

/** The pre-start pass: every full adult who came to the county, written through the history. */
export function pastMovesHistory(
  api: CoreAPI,
  window: PreStartWindow,
  history: HistoryWriter,
  rate: DepartureRate,
): void {
  for (const row of moveRecords(api, window, rate)) history.record(row);
}

export interface Residence {
  placeId: string;
  /** The record that says so: the move, else the person. */
  recordId: string;
}

/** The place a person lived on a day before the start, and the record that places them. */
export function residenceOn(
  core: Readonly<CoreState>,
  person: Readonly<PersonState>,
  date: string,
): Residence {
  const moved = preStartHistory(core as CoreState, {
    kind: PERSON_MOVED_IN,
    personId: person.id,
  })[0];
  return moved && date < moved.date
    ? { placeId: String(moved.facts.fromPlaceId), recordId: moved.id }
    : { placeId: person.placeId, recordId: moved?.id ?? person.id };
}
