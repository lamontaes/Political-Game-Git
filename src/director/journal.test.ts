import { describe, expect, it } from "vitest";
import { addDays, ageOnDate, makeIsoDate } from "../simulation/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { buildDeepPast } from "../core2/deep-past";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { applyCoreEvent } from "../core2/state";
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
    // The contact lines, past the opening line from the birth record.
    const lines = composeJournal(core, fixture, player.id, {
      through: makeIsoDate("2021-04-01"),
    })
      .flatMap((row) => row.lines)
      .filter((line) => !line.id.endsWith(":born"));
    expect(lines).toHaveLength(1);
    expect(lines[0]!.text).toMatch(/three times\.$/);
    expect(lines[0]!.momentIds).toHaveLength(3);
  });

  it("looks back on a life when it ends", () => {
    expect(composeLookBack(core, director, player.id)).toEqual([]);
    const person = core.people.get(player.id)!;
    person.alive = false;
    try {
      const lines = composeLookBack(core, director, player.id);
      expect(lines.length).toBe(chapters.length + 1);
      expect(lines.at(-1)!.text).toMatch(/^I died in .+, at \d+\.$/);
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
    expect(text).toContain("My pay went up to $15.00 an hour.");
    expect(text).toContain("A new minimum wage took effect.");
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
    expect(text.some((line) => /^My \w+ died\.$/.test(line))).toBe(true);
    expect(text).toContain("I filed to run for City Council, Seat 2.");
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
    expect(text.some((line) => /^My \w+ moved away\.$/.test(line))).toBe(true);
  });

  it("opens the story where the person was born, from the birth record", () => {
    const first = composeJournal(core, director, player.id)[0]!.lines[0]!;
    expect(first.text).toMatch(/^I was born in \d{4} in .+\.$/);
    expect(first.sourceRecordIds.length).toBeGreaterThan(0);
  });
});
