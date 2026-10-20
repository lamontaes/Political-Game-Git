import { describe, expect, it } from "vitest";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { buildDeepPast } from "../core2/deep-past";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { applyCoreEvent } from "../core2/state";
import { corePlaceByJurisdictionId } from "../core2/place-lookup";
import { buildPopulation } from "../core2/population";
import type { CoreState } from "../core2/types";
import { composeJournal, composeLookBack, JOURNAL_DATA } from "./journal";
import { createDirector, type Director } from "./ledger";
import type { Moment } from "./types";

// M4-03, the journal: a first-person memoir in chapters (owner, Oct 14: "a
// dramatized story, not a list of facts"), no year headers, relatives named by
// relation, no school or workplace as an entry by itself, nothing invented.
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
    expect(chapters.length).toBeGreaterThan(0);
    // A workplace or a school never titles a chapter (owner, batch 7).
    const settings = new Set(
      [...core.organizations.values()].map((row) => row.name),
    );
    for (const chapter of chapters) {
      expect(settings.has(chapter.title), chapter.title).toBe(false);
      expect(chapter.title).not.toMatch(/^\d{4}$/);
      for (const line of chapter.lines) {
        expect(line.text).toMatch(/^[A-Z]/);
        expect(line.sourceRecordIds.length).toBeGreaterThan(0);
        for (const id of line.sourceRecordIds)
          expect(resolves(core, id), id).toBe(true);
      }
    }
  });

  it("tells each child's birth in that child's chapter, and no look-back twice", () => {
    const born = /^(My (?:son|daughter|child)) was born\b/;
    const endings: string[] = [];
    for (const chapter of chapters)
      for (const line of chapter.lines) {
        const child = born.exec(line.text)?.[1];
        // A birth is remembered, never "I didn't know at the time" (owner, batch 9).
        if (child)
          expect(line.text).not.toMatch(/know|idea|clue|realize|meant/i);
        if (child && chapter.title.startsWith("My "))
          expect(chapter.title).toBe(child);
        const said = line.text.split(/(?<=[.!?])\s+/);
        if (said.length > 1)
          endings.push(
            said.at(-1)!.toLowerCase().split(/\s+/).slice(-2).join(" "),
          );
      }
    expect(new Set(endings).size).toBe(endings.length);
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

  it("frames by age only what happens around a young person, and keeps names", () => {
    // A race, a filing or a letter is told as itself, never "When I was 17".
    const framed = JOURNAL_DATA.lines.filter((row) => row.framesAge);
    expect(framed.length).toBeGreaterThan(0);
    for (const row of framed)
      expect(row.kindPrefix).not.toMatch(/^event:(election|candidate|office)/);
    const names = new Set(
      [...core.people.values()].map((person) => person.givenName),
    );
    for (const id of initialFocusPeople(input))
      for (const chapter of composeJournal(core, director, id))
        for (const line of chapter.lines) {
          const after = /^When I was \d+[^,]*, (\p{L}+)/u.exec(line.text)?.[1];
          if (!after) continue;
          const named = after.charAt(0).toUpperCase() + after.slice(1);
          // A name after the frame keeps its capital ("Emma won", not "emma").
          if (names.has(named)) expect(after).toBe(named);
        }
  });

  it("never makes a school, a workplace or a visit an entry by itself", () => {
    // Owner, grading batch 7: "School entries are not journal entries" unless
    // something happened there; a job or a contact is a setting, not a story.
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
            { ...book, moments: [seen("2021-03-01"), seen("2021-03-08")] },
          ],
        ]),
      },
    } as Director;
    expect(
      composeJournal(core, fixture, player.id, {
        through: makeIsoDate("2021-04-01"),
      }).flatMap((row) => row.lines),
    ).toEqual([]);
    for (const line of chapters.flatMap((row) => row.lines))
      expect(line.text).not.toMatch(
        /^(I went to|I attended|I was at|Then I went to|I went on to|I graduated from|I started working|I went to work)\b/,
      );
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
    // a law the person had no part in is not their story (owner, Oct 14).
    expect(text.some((line) => /pay|\$15/.test(line))).toBe(false);
    expect(text).not.toContain("The bill passed.");
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
    // A death in the family is a hard time; running begins with deciding to.
    expect(text.some((line) => /^My \w+ (died|passed away)\./.test(line))).toBe(
      true,
    );
    expect(
      text.some((line) =>
        /^(I ran for City Council, Seat 2\.|So I ran\.)/.test(line),
      ),
    ).toBe(true);
  });

  it("keeps a relative's lost race as a moment and tells no hand-written line about it", () => {
    const me = core.people.get(player.id)!;
    const relativeId = [...me.familyIds].find(
      (id) => core.people.get(id)?.alive && id !== player.id,
    )!;
    const rivalId = [...core.people.keys()].find(
      (id) => id !== relativeId && id !== player.id,
    )!;
    // As the voting module records a count: the relative lost.
    applyCoreEvent(core, {
      id: "election-result:fixture-loss",
      date: core.date,
      kind: "election-result",
      personIds: [relativeId, rivalId],
      witnessIds: [player.id],
      placeId: me.placeId,
      publicRecord: true,
      news: true,
      source: {
        tag: "SOURCED",
        citation: "Fixture shaped like the voting module's count.",
        asOf: core.date,
      },
      facts: { office: "City Council, Seat 3", winnerId: rivalId },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const told = composeJournal(core, director, player.id)
      .flatMap((row) => row.lines)
      .filter((line) =>
        line.sourceRecordIds.includes("election-result:fixture-loss"),
      );
    // The director keeps the count as a moment in the watcher's book. The
    // journal sentence for it is hand-written and held (owner, Oct 6, EN-1 to
    // EN-3; pool item words-journal-relative-race), so the journal says
    // nothing about it, and never a line that gets the result wrong.
    const book = director.ledger.people.get(player.id)!;
    expect(
      book.moments.some(
        (row) => row.causeId === "election-result:fixture-loss",
      ),
    ).toBe(true);
    expect(told).toEqual([]);
  });

  it("keeps a relative's win as a moment and tells no hand-written line about it", () => {
    const me = core.people.get(player.id)!;
    const relativeId = [...me.familyIds].find(
      (id) => core.people.get(id)?.alive && id !== player.id,
    )!;
    applyCoreEvent(core, {
      id: "election-result:fixture-win",
      date: core.date,
      kind: "election-result",
      personIds: [relativeId],
      witnessIds: [player.id],
      placeId: me.placeId,
      publicRecord: true,
      news: true,
      source: {
        tag: "SOURCED",
        citation: "Fixture shaped like the voting module's count.",
        asOf: core.date,
      },
      facts: { office: "Mayor", winnerId: relativeId },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const told = composeJournal(core, director, player.id)
      .flatMap((row) => row.lines)
      .filter((line) =>
        line.sourceRecordIds.includes("election-result:fixture-win"),
      );
    // The count is a moment in the book; its journal sentence is hand-written
    // and held (pool item words-journal-relative-race), so none is told.
    const book = director.ledger.people.get(player.id)!;
    expect(
      book.moments.some((row) => row.causeId === "election-result:fixture-win"),
    ).toBe(true);
    expect(told).toEqual([]);
  });

  it("names a child at birth, and says no look-back that points at nothing", () => {
    const lines = chapters.flatMap((chapter) => chapter.lines);
    const births = lines.filter((line) => / was born\./.test(line.text));
    expect(births.length).toBeGreaterThan(0);
    // "My daughter Jane was born." or, for a second child, "Jane was born."
    for (const line of births)
      expect(line.text).toMatch(/^(My \w+ )?[A-Z][a-z]+ was born\./);
    for (const line of lines) {
      expect(line.text).not.toMatch(/Little did I know\.?$/);
      // A turning point needs a later chapter of another kind in the record.
      if (/turning point/.test(line.text)) {
        const moment = line.momentIds[0]!;
        const book = director.ledger.people.get(player.id)!;
        const own = book.moments.find((row) => row.id === moment)!;
        const kinds = new Set(
          book.moments
            .filter((row) => row.date > own.date)
            .map((row) => row.causeKind.split(":")[0]),
        );
        expect(kinds.size, line.text).toBeGreaterThan(0);
      }
    }
  });

  it("keeps a relative moving away as a moment and tells no hand-written line about it", () => {
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
    const movedId = `person.moved-away:${relativeId}:${core.date}`;
    applyCoreEvent(core, {
      id: movedId,
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
    const lines = composeJournal(core, director, watcherId).flatMap(
      (row) => row.lines,
    );
    // The engine words it from the move record: who moved, by relation, and
    // the line cites the record it came from.
    // The move is a moment in the book; the journal sentence for it is
    // hand-written and held (owner, Oct 6, EN-1 to EN-3; pool item
    // words-journal-relative-moved-away), so none is told.
    const book = director.ledger.people.get(watcherId)!;
    expect(book.moments.some((row) => row.causeId === movedId)).toBe(true);
    expect(lines.filter((line) => /moved away/.test(line.text))).toEqual([]);
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
      corePlaceByJurisdictionId(mover.placeId as never)!.displayName,
    );
    expect(named.some((line) => /^I /.test(line))).toBe(false);
    // A place with no name leaves nothing to say.
    expect(told("jurisdiction_unnamed")).toEqual([]);
  });

  it("never titles a chapter by a school, and remembers a schoolmate who matters later", () => {
    // Owner, Oct 14: school years are not entries unless something happened;
    // a schoolmate who becomes important is remembered as their story.
    const person = core.people.get(player.id)!;
    const mate = (person.pastFacts ?? []).find(
      (fact) =>
        fact.kind === "social:generated-school-acquaintance" &&
        fact.facts?.contextFactId &&
        person.knownIds.has(fact.facts?.otherPersonId ?? ""),
    )!;
    const school = (person.pastFacts ?? []).find(
      (fact) => fact.id === mate.facts!.contextFactId,
    )!;
    const moment: Moment = {
      id: `${player.id}:${school.date}:past:${school.id}:${school.kind}`,
      personId: player.id,
      date: makeIsoDate(school.date),
      label: `past:${school.kind}`,
      causeId: player.id,
      causeFactId: school.id,
      causeKind: school.kind,
      counterpartIds: [],
      impact: 1,
      channels: [],
      hindsight: 1,
      hindsightAt: makeIsoDate(school.date),
      echoes: [],
    };
    const book = director.ledger.people.get(player.id)!;
    const fixture = {
      ...director,
      ledger: {
        ...director.ledger,
        people: new Map([[player.id, { ...book, moments: [moment] }]]),
      },
    } as Director;
    // Nothing happened there, and nobody from it holds office: no chapter.
    expect(
      composeJournal(core, fixture, player.id, { officeOf: () => undefined }),
    ).toEqual([]);
    // Years later the schoolmate holds office: they are remembered, in a
    // chapter the school does not title.
    const mayor = { text: "Mayor", sourceRecordIds: ["fixture-term"] };
    const chapters = composeJournal(core, fixture, player.id, {
      officeOf: (id) => (id === mate.facts!.otherPersonId ? mayor : undefined),
    });
    const schoolName = String(school.facts?.schoolName ?? "");
    for (const chapter of chapters)
      if (schoolName) expect(chapter.title).not.toContain(schoolName);
    const lines = chapters.flatMap((row) => row.lines);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.text).not.toMatch(/^Except/);
    expect(lines[0]!.text).toMatch(/mayor/);
    expect(lines[0]!.sourceRecordIds).toContain(mate.id);
  });
});
