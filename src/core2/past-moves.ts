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
import { addDays, ageInYears, makeIsoDate } from "./kernel/dates";
import { SeededRng } from "./kernel/rng";
import {
  grainDate,
  ownWindowOf,
  preStartHistory,
  preStartWindowOf,
  recordPreStartLater,
  wholePastOnce,
} from "./pre-start";
import { ownPastKind } from "./own-past-kinds";
import { coreAPI } from "./state";
import { stopgap } from "./stopgaps";
import type { HistoryRecord, HistoryWriter, PreStartWindow } from "./pre-start";
import type {
  CoreAPI,
  CoreState,
  IsoDate,
  PersonId,
  PersonState,
} from "./types";
import { townWithin } from "./places-elsewhere";
import { tenureScaleOf } from "./opening-tenure";
import { openingTenureOf } from "./modules/housing";

export const PERSON_MOVED_IN = ownPastKind("person.moved-in");
/** The past fact a person's birthplace is kept as (src/core2/person-birthplace.ts). */
const BIRTHPLACE = "birthplace";
/** A move to another home inside the county the person lived in then. */
export const PERSON_MOVED_WITHIN = ownPastKind("person.moved-within");

const MOVES = moveRows as unknown as Readonly<
  Record<string, { value: number }>
>;

/**
 * Each town household's multiple of its age's moving rate by the tenure of
 * its home on day one, as the housing opening drew it (opening-tenure.ts
 * `tenureScaleOf`, the rule the opening's years in place reads), its head's
 * age counted on `on`. The run before the start and one person's own past
 * opened later read the same homes.
 */
function tenureScaleIn(core: CoreState, on: IsoDate) {
  // stopgapId: SG-HIST-opening-tenure-town-only
  stopgap("SG-HIST-opening-tenure-town-only", core);
  return tenureScaleOf(
    openingTenureOf(core),
    [...core.households.values()].map((home) => ({
      id: home.id,
      head: Math.max(
        0,
        ...home.memberIds.map((id) => {
          const person = core.people.get(id as PersonId);
          return person ? ageInYears(person.birthDate, on) : 0;
        }),
      ),
    })),
  );
}

/** The moves engine's life-stage rate: the share of people of an age in a place's state who leave their county in a year (src/core2/modules/moves.ts `departureRateFor`). */
export type DepartureRate = (placeId: string, age: number) => number;

/**
 * The place a person's records say they came from: their recorded birthplace
 * when it is outside the county (src/core2/person-birthplace.ts), and none
 * when it is inside; with no birthplace on record, a parent living outside
 * the county.
 */
function originOf(
  core: Readonly<CoreState>,
  person: Readonly<PersonState>,
): { placeId: string; recordId: string } | undefined {
  const here = new Set([person.placeId, person.countyId].filter(Boolean));
  const born = birthplaceFactOf(person);
  if (born)
    return here.has(born.placeId)
      ? undefined
      : { placeId: born.placeId, recordId: born.id };
  for (const fact of person.pastFacts ?? []) {
    if (!["family:parent", "family:other-parent"].includes(fact.kind)) continue;
    const parent = core.people.get(fact.facts?.otherPersonId as PersonId);
    if (parent?.alive && !here.has(parent.placeId))
      return { placeId: parent.placeId, recordId: fact.id };
  }
  return undefined;
}

/** A person's birthplace fact, the one record of where they were born. */
function birthplaceFactOf(
  person: Readonly<PersonState>,
): { id: string; placeId: string } | undefined {
  const fact = (person.pastFacts ?? []).find((row) => row.kind === BIRTHPLACE);
  const placeId = fact?.facts?.placeId;
  return fact && typeof placeId === "string"
    ? { id: fact.id, placeId }
    : undefined;
}

/**
 * Where a person was born, by name as precisely as the record allows: their
 * birthplace fact (a state's record resolved to one of its towns, the same
 * town the move from it names), else where the moves put them that day.
 */
export function bornIn(
  core: Readonly<CoreState>,
  person: Readonly<PersonState>,
): Residence {
  const born = birthplaceFactOf(person);
  return born
    ? {
        placeId: townWithin(core, person.id, born.placeId) ?? born.placeId,
        recordId: born.id,
      }
    : residenceOn(core, person, person.birthDate);
}

/** Whether a person has a parent the world holds as a person. */
export function hasParentHere(
  core: Readonly<CoreState>,
  person: Readonly<PersonState>,
): boolean {
  return (person.pastFacts ?? []).some(
    (fact) =>
      (fact.kind === "family:parent" || fact.kind === "family:other-parent") &&
      core.people.has(fact.facts?.otherPersonId as PersonId),
  );
}

/**
 * A child's birthplace, written once the moves before the start are run:
 * where the parent they lived with was that day (`residenceOn`, the parent's
 * move that carried them). Only a person with a parent in the world and no
 * birthplace yet; everyone else's is written before the moves.
 */
export function writeChildBirthplaces(
  core: Readonly<CoreState>,
  people: Iterable<PersonState>,
): void {
  for (const person of people) {
    if (birthplaceFactOf(person) || !hasParentHere(core, person)) continue;
    const lived = residenceOn(core, person, person.birthDate);
    person.pastFacts = [
      ...(person.pastFacts ?? []),
      {
        id: `${person.id}:birthplace`,
        date: makeIsoDate(person.birthDate),
        kind: BIRTHPLACE,
        summary: "birthplace",
        source: {
          tag: "ESTIMATED",
          asOf: core.date,
          citation:
            "Where their parent lived the day they were born (src/core2/past-moves.ts residenceOn).",
          estimatedFrom:
            "The moves before the start: the place their parent came from, if they came after the birth, else the town.",
        },
        facts: { placeId: lived.placeId, residenceRecordId: lived.recordId },
      },
    ];
  }
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

/**
 * The moves into the county before the start, by the moves engine's yearly
 * pull. `people` are everyone full by default; with `worldFrom`, the run is one
 * person's own past: a move before the world's window is kept, and the
 * children who came with them are named in the record's facts, not as people
 * it belongs to (a child's own past is written when the child is opened).
 */
function moveRecords(
  api: CoreAPI,
  window: PreStartWindow,
  rate: DepartureRate,
  people: Iterable<PersonState> = (api.state as CoreState).people.values(),
  /** The first day of the world's window: the run is one person's own past. */
  worldFrom: IsoDate | undefined = undefined,
): Omit<HistoryRecord, "moduleId">[] {
  const core = api.state as CoreState;
  stopgap("SG-HIST-moves-life-stage-only");
  const grown = api.parameter("votingAge");
  const daysPerYear = api.parameter("daysPerMeanYear");
  const enough = MOVES.movesStayPull!.value;
  const childrenHold = Math.exp(-MOVES.movesChildrenHold!.value);
  const tenureScale = tenureScaleIn(core, window.through);
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
  for (const person of people) {
    // The run over everyone skips relatives living elsewhere; their own past,
    // opened one at a time, runs the same rule against the place they live.
    if (!person.alive || (person.tier === "husk" && !worldFrom)) continue;
    // A child comes with the parent who moved, never alone.
    const born = makeIsoDate(person.birthDate);
    if (addDays(born, Math.round(grown * daysPerYear)) > window.through)
      continue;
    const origin = originOf(core, person);
    if (!origin) continue;
    const children = childrenOf(core, person);
    const scale = tenureScale(person.householdId);
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
      // A renter's pull builds faster than an owner's (the owner hold).
      const year =
        rate(person.placeId, age) *
        (atHome ? childrenHold : 1) *
        (scale?.(age) ?? 1);
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
    // A move before the world's window is told on the person's birthday that year.
    if (worldFrom && date < worldFrom)
      date = grainDate(person, date, worldFrom);
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
      personIds: worldFrom ? [person.id] : [person.id, ...withThem],
      facts: {
        personId: person.id,
        ...(worldFrom && withThem.length
          ? { childIds: withThem.join(" ") }
          : {}),
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

/**
 * The moves to another home inside the county before the start (gap sheet,
 * Nov 12, 2026, row 16: a past held at most one move). Each year from the
 * year they were grown, the share of people their age in their state who
 * moved within their county that year (ACS 2024, B07401, the moves engine's
 * `withinCountyRateFor`) builds a pull against their own seeded line; a pull
 * that reaches it is a move on the day it does, and a new line begins. The county is
 * the one they lived in that year: their origin's before they came, the
 * town's after (`arrived`). Seeded generation of what happened before the
 * world opened; no roll decides what anyone does.
 */
function withinRecords(
  api: CoreAPI,
  window: PreStartWindow,
  rate: DepartureRate,
  people: Iterable<PersonState>,
  arrivals: readonly Omit<HistoryRecord, "moduleId">[],
  worldFrom: IsoDate | undefined,
): Omit<HistoryRecord, "moduleId">[] {
  const core = api.state as CoreState;
  const grown = api.parameter("votingAge");
  const daysPerYear = api.parameter("daysPerMeanYear");
  const arrivedOn = new Map(
    arrivals.map((row) => [String(row.facts.personId), row]),
  );
  const tenureScale = tenureScaleIn(core, window.through);
  const rows: Omit<HistoryRecord, "moduleId">[] = [];
  for (const person of people) {
    if (!person.alive || (person.tier === "husk" && !worldFrom)) continue;
    const scale = tenureScale(person.householdId);
    const born = makeIsoDate(person.birthDate);
    const arrived =
      arrivedOn.get(person.id) ??
      preStartHistory(core, { kind: PERSON_MOVED_IN, personId: person.id })[0];
    const rng = new SeededRng(core.seed).fork(`past-moved-within:${person.id}`);
    const lineOf = (move: number) =>
      -Math.log(1 - rng.fork(`move:${move}`).next());
    const children = childrenOf(core, person);
    let count = 0;
    let line = lineOf(count);
    const grainedYears = new Set<string>();
    let pull = 0;
    for (let age = grown; ; age += 1) {
      const from = addDays(born, Math.round(age * daysPerYear));
      if (from > window.through) break;
      const placeId =
        arrived && from < arrived.date
          ? String(arrived.facts.fromPlaceId)
          : person.placeId;
      // A renter moves more often than an owner (the owner hold).
      const year = -Math.log(1 - rate(placeId, age)) * (scale?.(age) ?? 1);
      for (; pull + year >= line; line = lineOf(count)) {
        const share = (line - pull) / year;
        pull -= line;
        count += 1;
        let date: string = addDays(
          makeIsoDate(from),
          Math.round(share * daysPerYear),
        );
        if (date > window.through) break;
        if (date < window.from) continue;
        // Never the same year as the move into the county: that move is told.
        if (arrived && date.slice(0, 4) === arrived.date.slice(0, 4)) continue;
        // Before the world's window a move is told on the birthday in its
        // year, so a year holds one move there.
        if (worldFrom && date < worldFrom) {
          date = grainDate(person, date, worldFrom);
          if (grainedYears.has(date.slice(0, 4))) continue;
          grainedYears.add(date.slice(0, 4));
        }
        // The county is the one they lived in on the move's own day: a year
        // counted from a birthday by mean years can start a day before an
        // arrival told on that birthday, and a move after they came is in
        // the town, never back where they came from.
        const movedIn =
          arrived && date < arrived.date
            ? String(arrived.facts.fromPlaceId)
            : person.placeId;
        // stopgapId: SG-HIST-within-moves-child-own-past
        stopgap("SG-HIST-within-moves-child-own-past", core);
        const withThem = children
          .filter(
            (child) =>
              child.alive &&
              child.householdId === person.householdId &&
              child.birthDate < date &&
              addDays(
                makeIsoDate(child.birthDate),
                Math.round(grown * daysPerYear),
              ) > date,
          )
          .map((child) => child.id);
        rows.push({
          id: `${PERSON_MOVED_WITHIN}:${person.id}:${count}`,
          date: makeIsoDate(date),
          kind: PERSON_MOVED_WITHIN,
          placeId: movedIn,
          personIds: [person.id],
          facts: {
            personId: person.id,
            fromPlaceId: movedIn,
            toPlaceId: movedIn,
            ...(withThem.length ? { childIds: withThem.join(" ") } : {}),
          },
          publicRecord: false,
          source: {
            tag: "ESTIMATED",
            asOf: core.date,
            citation:
              "ACS 2024 B07401, moved within the same county by age and state (data/research/migration/mover-rates-acs-2024.json, withinCountyPerYearByAge).",
            estimatedFrom:
              "The person's own seeded line against that yearly share, from the year they were grown, in the county they lived in that year.",
          },
        });
      }
      pull += year;
    }
  }
  return rows;
}

/** The pre-start pass: every full adult who came to the county, and every move inside a county, written through the history. */
export function pastMovesHistory(
  api: CoreAPI,
  window: PreStartWindow,
  history: HistoryWriter,
  rate: DepartureRate,
  within?: DepartureRate,
): void {
  const arrivals = moveRecords(api, window, rate);
  for (const row of arrivals) history.record(row);
  if (!within) return;
  for (const row of withinRecords(
    api,
    window,
    within,
    (api.state as CoreState).people.values(),
    arrivals,
    undefined,
  ))
    history.record(row);
}

/**
 * A person's moves into the county over their own life, once (the owner's
 * ruling, Nov 9, 2026): a move before the world's window is kept, and one
 * the pre-start run already wrote stays as it is.
 */
export function pastMovesFor(
  core: CoreState,
  people: readonly PersonState[],
  rate: DepartureRate,
  moduleId: string,
  within?: DepartureRate,
): void {
  for (const person of people) {
    const window = ownWindowOf(core, person);
    if (!window || !wholePastOnce(core, person.id, "moves")) continue;
    // A person already brought here (their own move, or a parent's they came
    // with as a child) came once: no second arrival from their birthplace.
    const held = preStartHistory(core, {
      kind: PERSON_MOVED_IN,
      personId: person.id,
    });
    const rows = held.length
      ? []
      : moveRecords(
          coreAPI(core),
          window,
          rate,
          [person],
          preStartWindowOf(core)!.from,
        );
    if (within) {
      const heldWithin = new Set(
        preStartHistory(core, {
          kind: PERSON_MOVED_WITHIN,
          personId: person.id,
        }).map((row) => row.id),
      );
      rows.push(
        ...withinRecords(
          coreAPI(core),
          window,
          within,
          [person],
          rows,
          preStartWindowOf(core)!.from,
        ).filter((row) => !heldWithin.has(row.id)),
      );
    }
    recordPreStartLater(core, moduleId, rows, { person: person.id });
  }
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
  // Where the record says only a state, they lived in one of its towns,
  // the same every time (`townWithin`).
  const from = String(moved?.facts.fromPlaceId ?? "");
  return moved && date < moved.date
    ? {
        placeId: townWithin(core, person.id, from) ?? from,
        recordId: moved.id,
      }
    : { placeId: person.placeId, recordId: moved?.id ?? person.id };
}
