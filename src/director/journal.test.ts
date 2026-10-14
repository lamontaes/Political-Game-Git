import { describe, expect, it } from "vitest";
import { addDays, ageOnDate, makeIsoDate } from "../simulation/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { buildDeepPast } from "../core2/deep-past";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { applyCoreEvent } from "../core2/state";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import { buildPopulation } from "../core2/population";
import type { CoreState } from "../core2/types";
import { composeJournal, composeLookBack, JOURNAL_DATA } from "./journal";
import { createDirector, type Director } from "./ledger";
import type { Moment } from "./types";

// M4-03, the journal: a first-person story in chapters, no year headers,
// relatives named by relation, repeats summarized, nothing invented.
const seed = process.env.GOLDEN_PATH_SEED ?? "journal-test";
const base = enrichCivicInputs(
  buildDeepPast(
    buildPopulation({
      seed,
      ...(process.env.GOLDEN_PATH_SEED
        ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
        : {}),
      startedAt: "2021-01-01",
      minimumPeople: 400,
    }),
  ),
);
const age = (birth: string) =>
  ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
const player = base.people.find(
  (person) =>
    person.tier !== "husk" &&
    age(person.birthDate) >= 30 &&
    person.jobId &&
    (person.pastFacts ?? []).some((fact) => fact.kind === "family:child"),
)!;
const input = { ...base, playerId: player.id };
const director = createDirector({ watch: [...initialFocusPeople(input)] });
const core = createLifeCore(input, { modules: [director.module] });
director.start(core);
advanceCore(core, addDays(makeIsoDate(core.date), 31));
const chapters = composeJournal(core, director, player.id);

/** Every record id a journal line may cite. */
function resolves(state: CoreState, id: string): boolean {
  const person = state.people.get(player.id)!;
  return (
    state.people.has(id) ||
    state.jobs.has(id) ||
    state.organizations.has(id) ||
    state.relationships.has(id) ||
    state.eventIds.has(id) ||
    state.households.has(id) ||
    (person.pastFacts ?? []).some((fact) => fact.id === id) ||
    id.startsWith("jurisdiction")
  );
}

describe(`the journal in ${base.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("tells the life in chapters, each line traced to a record", () => {
    expect(chapters.length).toBeGreaterThan(1);
    for (const chapter of chapters) {
      expect(chapter.title).not.toMatch(/^\d{4}$/);
      for (const line of chapter.lines) {
        expect(line.text).toMatch(/^[A-Z]/);
        expect(line.sourceRecordIds.length).toBeGreaterThan(0);
        for (const id of line.sourceRecordIds)
          expect(resolves(core, id), id).toBe(true);
      }
    }
  });

  it("names relatives by relation, never by name", () => {
    const person = core.people.get(player.id)!;
    const text = chapters.flatMap((row) => row.lines.map((l) => l.text));
    expect(text.some((line) => /\bMy (son|daughter|child)\b/.test(line))).toBe(
      true,
    );
    for (const id of person.familyIds) {
      const relative = core.people.get(id)!;
      for (const line of text)
        expect(line).not.toContain(
          `${relative.givenName} ${relative.familyName}`,
        );
    }
  });

  it("never invents a feeling: its words hold no feeling", () => {
    const feelings =
      /\b(happy|sad|angry|afraid|scared|proud|lonely|glad|upset|love[ds]?|hate[ds]?|miss(ed)?|worried|excited|hurt|felt|feel|joy|grief|ashamed|relieved)\b/i;
    for (const row of JOURNAL_DATA.lines)
      for (const variant of [
        ...row.line,
        ...(row.otherLine ?? []),
        ...(row.repeatLine ?? []),
        ...(row.title ?? []),
      ])
        expect(variant.text).not.toMatch(feelings);
  });

  it("folds repeats within a chapter into one line", () => {
    const book = director.ledger.people.get(player.id)!;
    const friendId = [...core.people.get(player.id)!.knownIds].find(
      (id) => !core.people.get(player.id)!.familyIds.has(id),
    )!;
    const seen = (date: string): Moment => ({
      id: `${player.id}:${date}:fixture-contact`,
      personId: player.id,
      date: makeIsoDate(date),
      label: "tie:contact:contact",
      causeId: friendId,
      causeKind: "contact:contact",
      counterpartIds: [friendId],
      impact: 1,
      channels: [],
      hindsight: 1,
      hindsightAt: makeIsoDate(date),
      echoes: [],
    });
    const fixture = {
      ...director,
      ledger: {
        ...director.ledger,
        people: new Map([
          [
            player.id,
            {
              ...book,
              moments: [
                seen("2021-03-01"),
                seen("2021-03-08"),
                seen("2021-03-15"),
              ],
            },
          ],
        ]),
      },
    } as Director;
    const lines = composeJournal(core, fixture, player.id, {
      through: makeIsoDate("2021-04-01"),
    }).flatMap((row) => row.lines);
    // Three sightings of one person fold into one line. No mined sentence
    // counts them ("I saw X three times."), so the line says it once.
    expect(lines).toHaveLength(1);
    expect(lines[0]!.text).toMatch(/^I .+\.$/);
    expect(lines[0]!.text).not.toMatch(/times/);
  });

  it("looks back on a life when it ends", () => {
    expect(composeLookBack(core, director, player.id)).toEqual([]);
    const person = core.people.get(player.id)!;
    person.alive = false;
    try {
      const lines = composeLookBack(core, director, player.id);
      // Each chapter's opening line; the death itself is left out because no
      // mined sentence says it from these records.
      expect(lines.length).toBe(chapters.length);
      expect(lines.some((line) => /\bdied\b/.test(line.text))).toBe(false);
      for (const line of lines)
        expect(line.sourceRecordIds.length).toBeGreaterThan(0);
    } finally {
      person.alive = true;
    }
  });

  it("turns a law and the raise it brings into a moment and journal lines (M4-01)", () => {
    const me = core.people.get(player.id)!;
    const source = {
      tag: "SOURCED" as const,
      citation: "Fixture shaped like GOV's laws module.",
      asOf: core.date,
    };
    // As GOV's laws module records them: the law for the town, the raise for the worker.
    applyCoreEvent(core, {
      id: "fixture-law-took-effect",
      date: core.date,
      kind: "law-took-effect",
      personIds: [],
      placeId: me.placeId,
      publicRecord: true,
      news: true,
      source,
      facts: { series: "minimum-wage", value: "15" },
    });
    applyCoreEvent(core, {
      id: "fixture-raise",
      date: core.date,
      kind: "pay-raised-to-minimum-wage",
      personIds: [player.id],
      placeId: me.placeId,
      source,
      facts: { fromMinor: "1200", toMinor: "1500" },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const raise = director.ledger.people
      .get(player.id)!
      .moments.find((row) => row.causeId === "fixture-raise")!;
    expect(
      raise.channels.find((row) => row.channel === "money")!.raw,
    ).toBeCloseTo(0.25);
    const text = composeJournal(core, director, player.id).flatMap((row) =>
      row.lines.map((line) => line.text),
    );
    // No mined sentence says a raise, so the raise's own line is left out;
    // the law that brought it is told by a mined sentence.
    expect(text.some((line) => /pay|\$15/.test(line))).toBe(false);
    expect(text).toContain("The bill passed.");
  });

  it("writes a relative's death and filing for office, from the events' own records", () => {
    const me = core.people.get(player.id)!;
    const relativeId = [...me.familyIds].find(
      (id) => core.people.get(id)?.alive && id !== player.id,
    )!;
    const share = 0.63;
    // As the health engine records a death the family hears of.
    applyCoreEvent(core, {
      id: `life.death:${relativeId}:${core.date}`,
      date: core.date,
      kind: "life.death",
      personIds: [relativeId],
      witnessIds: [player.id],
      placeId: me.placeId,
      topic: "health:serious-illness",
      desiredChange: "care-and-cure:serious-illness",
      stressImpulse: share,
      moodImpulse: -share,
      source: {
        tag: "SOURCED",
        citation: "Fixture shaped like the health engine.",
        asOf: core.date,
      },
    });
    // As GOV's elections module records a filing.
    applyCoreEvent(core, {
      id: "candidate-filed:fixture",
      date: core.date,
      kind: "candidate-filed",
      personIds: [player.id],
      placeId: me.placeId,
      publicRecord: true,
      news: true,
      source: {
        tag: "SOURCED",
        citation: "Fixture shaped like GOV's filing.",
        asOf: core.date,
      },
      facts: { office: "City Council, Seat 2", filingId: "fixture-filing" },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const text = composeJournal(core, director, player.id).flatMap((row) =>
      row.lines.map((line) => line.text),
    );
    expect(
      text.some((line) => /^My \w+ (died|passed away)\.$/.test(line)),
    ).toBe(true);
    expect(text).toContain("I ran for City Council, Seat 2.");
  });

  it("writes a relative moving away, as the moves engine records it", () => {
    // A watched person with a relative in town (a grown child moving out, a
    // sibling across town).
    const inTown = (id: string) => {
      const other = core.people.get(id);
      return !!other?.alive && other.tier !== "husk";
    };
    const watcherId = [...director.ledger.people.keys()]
      .sort()
      .find(
        (id) =>
          inTown(id) &&
          [...core.people.get(id)!.familyIds].some(
            (other) => other !== id && inTown(other),
          ),
      )!;
    const watcher = core.people.get(watcherId)!;
    const relativeId = [...watcher.familyIds].find(
      (id) => id !== watcherId && inTown(id),
    )!;
    const relative = core.people.get(relativeId)!;
    // The shape src/core2/modules/moves.ts emits when someone leaves town.
    applyCoreEvent(core, {
      id: `person.moved-away:${relativeId}:${core.date}`,
      date: core.date,
      kind: "person.moved-away",
      personIds: [relativeId],
      witnessIds: [watcherId],
      placeId: relative.placeId,
      publicRecord: false,
      topic: relative.countyId ?? relative.placeId,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: "Fixture shaped like the moves engine.",
        estimatedFrom: "SG-P15-moves-weights",
      },
      facts: { [`person:${relativeId}:residence`]: "elsewhere" },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const text = composeJournal(core, director, watcherId).flatMap((row) =>
      row.lines.map((line) => line.text),
    );
    // No mined sentence says a relative moved away, so the line is left out.
    expect(text.some((line) => /moved away/.test(line))).toBe(false);
  });

  it("writes a household move as the person's own move, never as their family leaving them", () => {
    // Break 19 of the October 12 three-year trace: a parent whose whole
    // household moved read "My daughter moved away." and never that they moved.
    const inTown = (id: string) => {
      const other = core.people.get(id);
      return !!other?.alive && other.tier !== "husk";
    };
    const moverId = [...director.ledger.people.keys()]
      .sort()
      .find(
        (id) =>
          inTown(id) &&
          (core.households.get(core.people.get(id)!.householdId)?.memberIds
            .length ?? 0) > 1 &&
          [...core.people.get(id)!.familyIds].some(
            (other) =>
              core.people.get(other)?.householdId ===
                core.people.get(id)!.householdId && inTown(other),
          ),
      )!;
    const mover = core.people.get(moverId)!;
    const withIds = [
      moverId,
      ...[...mover.familyIds].filter(
        (id) =>
          core.people.get(id)?.householdId === mover.householdId && inTown(id),
      ),
    ].sort();
    const date = core.date;
    const eventId = `person.moved-away:${moverId}:${date}`;
    // The shape src/core2/modules/moves.ts emits when a household leaves.
    applyCoreEvent(core, {
      id: eventId,
      date,
      kind: "person.moved-away",
      personIds: withIds,
      witnessIds: [],
      placeId: mover.placeId,
      publicRecord: false,
      topic: mover.countyId ?? mover.placeId,
      source: {
        tag: "ESTIMATED",
        asOf: date,
        citation: "Fixture shaped like the moves engine.",
        estimatedFrom: "SG-P15-moves-weights",
      },
      facts: Object.fromEntries(
        withIds.map((id) => [`person:${id}:residence`, "elsewhere"]),
      ),
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const moments = new Set(
      director.ledger.people
        .get(moverId)!
        .moments.filter((moment) => moment.causeId === eventId)
        .map((moment) => moment.id),
    );
    expect(moments.size).toBeGreaterThan(0);
    const lines = composeJournal(core, director, moverId)
      .flatMap((row) => row.lines)
      .filter((line) => line.momentIds.some((id) => moments.has(id)));
    const text = lines.map((line) => line.text);
    // The move itself has no mined sentence, and never reads as a family
    // member leaving the person.
    expect(text).toEqual([]);
    expect(text.some((line) => /^My \w+ moved away\.$/.test(line))).toBe(false);

    // When the person's place changes that day, the move is told once, with
    // the new place; a place with no name leaves the event's own line.
    const book = director.ledger.people.get(moverId)!;
    const own = book.moments.find((moment) => moment.causeId === eventId)!;
    const movedMoment: Moment = {
      ...own,
      id: `${moverId}:${own.date}:${mover.householdId}`,
      label: "home:moved",
      causeId: mover.householdId,
      causeKind: "moved",
      counterpartIds: [],
    };
    delete (movedMoment as { selfNamed?: true }).selfNamed;
    const fixture = {
      ...director,
      ledger: {
        ...director.ledger,
        people: new Map([[moverId, { ...book, moments: [own, movedMoment] }]]),
      },
    } as Director;
    const told = (placeId: string) =>
      composeJournal(
        {
          ...core,
          people: new Map([
            ...core.people,
            [moverId, { ...core.people.get(moverId)!, placeId }],
          ]),
        } as CoreState,
        fixture,
        moverId,
      )
        .flatMap((row) => row.lines)
        .map((line) => line.text);
    const named = told(mover.placeId);
    const moved = named.filter((line) => /^We /.test(line));
    expect(moved).toHaveLength(1);
    expect(moved[0]).toContain(
      lifePlaceByJurisdictionId(mover.placeId as never)!.displayName,
    );
    expect(named.some((line) => /^I /.test(line))).toBe(false);
    // A place with no name leaves nothing to say.
    expect(told("jurisdiction_unnamed")).toEqual([]);
  });

  it("writes starting at a school once, however many stages were spent there", () => {
    // Break 19: Juliaetta journals said "I started at Juliaetta Elementary
    // School." for the elementary and the middle-school years alike.
    const person = core.people.get(player.id)!;
    const school = (person.pastFacts ?? []).find((fact) =>
      fact.kind.startsWith("school:"),
    )!;
    const later = {
      ...school,
      id: `${school.id}:next-stage`,
      date: makeIsoDate(`${Number(school.date.slice(0, 4)) + 6}-08-26`),
      facts: { ...school.facts, stage: "middle" },
    };
    const moment = (fact: typeof school): Moment => ({
      id: `${player.id}:${fact.date}:past:${fact.id}:${fact.kind}`,
      personId: player.id,
      date: makeIsoDate(fact.date),
      label: `past:${fact.kind}`,
      causeId: player.id,
      causeFactId: fact.id,
      causeKind: fact.kind,
      counterpartIds: [],
      impact: 1,
      channels: [],
      hindsight: 1,
      hindsightAt: makeIsoDate(fact.date),
      echoes: [],
    });
    const book = director.ledger.people.get(player.id)!;
    const fixture = {
      ...director,
      ledger: {
        ...director.ledger,
        people: new Map([
          [player.id, { ...book, moments: [moment(school), moment(later)] }],
        ]),
      },
    } as Director;
    const state = {
      ...core,
      people: new Map([
        ...core.people,
        [
          player.id,
          { ...person, pastFacts: [...(person.pastFacts ?? []), later] },
        ],
      ]),
    } as CoreState;
    const text = composeJournal(state, fixture, player.id)
      .flatMap((row) => row.lines)
      .map((line) => line.text);
    expect(
      text.filter((line) => line.includes(String(school.facts!.schoolName))),
    ).toHaveLength(1);
  });
});
