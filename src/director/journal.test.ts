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

  it("writes a race won and lost, taking office and a vote, as GOV's engines record them", () => {
    const me = core.people.get(player.id)!;
    const opponentId = [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.tier !== "husk" &&
          row.id !== player.id &&
          !me.familyIds.has(row.id),
      )
      .map((row) => row.id)
      .sort()[0]!;
    const gov = (
      id: string,
      kind: string,
      personIds: string[],
      facts: Record<string, string>,
    ) =>
      applyCoreEvent(core, {
        id,
        date: core.date,
        kind,
        personIds,
        placeId: me.placeId,
        publicRecord: true,
        news: true,
        source: {
          tag: "SOURCED",
          citation: "Fixture shaped like GOV's voting and legislature.",
          asOf: core.date,
        },
        facts,
      });
    // The shapes src/core2/modules/voting.ts and legislature.ts emit.
    gov(
      "election-result:fixture-seat-2",
      "election-result",
      [player.id, opponentId],
      {
        contestId: "fixture-seat-2",
        office: "City Council, Seat 2",
        winnerId: player.id,
        totals: "{}",
      },
    );
    gov(
      "election-result:fixture-mayor",
      "election-result",
      [opponentId, player.id],
      {
        contestId: "fixture-mayor",
        office: "Mayor",
        winnerId: opponentId,
        totals: "{}",
      },
    );
    gov("took-office:fixture-seat-2", "took-office", [player.id], {
      office: "City Council, Seat 2",
      seatId: "fixture-seat-2",
      winnerId: player.id,
    });
    gov("bill-vote:fixture", "legislative-vote", [player.id, opponentId], {
      billId: "fixture-bill",
      number: "Ordinance 2021-4",
      chamber: "fixture-council",
      yes: "5",
      no: "2",
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const lines = composeJournal(core, director, player.id).flatMap(
      (row) => row.lines,
    );
    const text = lines.map((line) => line.text);
    expect(text).toContain("I won the race for City Council, Seat 2.");
    expect(text).toContain("I lost the race for Mayor.");
    expect(text).toContain("I took office as City Council, Seat 2.");
    expect(text).toContain("We voted on Ordinance 2021-4, 5 to 2.");
    // As GOV's meetings engine records a town hall: one the player held, and
    // one a relative held that the player went to.
    const relativeId = [...me.familyIds].find(
      (id) => id !== player.id && core.people.get(id)?.alive,
    )!;
    gov("town-hall:fixture-own", "town-hall", [player.id, opponentId], {
      townHallId: "fixture-own",
      hostId: player.id,
      attendees: "1",
      questions: "",
    });
    gov("town-hall:fixture-relative", "town-hall", [relativeId, player.id], {
      townHallId: "fixture-relative",
      hostId: relativeId,
      attendees: "1",
      questions: "",
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const halls = composeJournal(core, director, player.id)
      .flatMap((row) => row.lines)
      .filter((line) => / held a town hall\.$/.test(line.text));
    expect(halls.map((line) => line.text)).toContain("I held a town hall.");
    expect(
      halls.some(
        (line) =>
          line.text !== "I held a town hall." &&
          line.sourceRecordIds.includes("town-hall:fixture-relative"),
      ),
    ).toBe(true);
    // As WORLD's business engine records an owner's business closing.
    const business = [...core.organizations.values()]
      .map((row) => row.id)
      .sort()[0]!;
    applyCoreEvent(core, {
      id: `event:business.closed:${business}`,
      date: core.date,
      kind: "business.closed",
      personIds: [player.id],
      placeId: me.placeId,
      publicRecord: true,
      topic: business,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: "Fixture shaped like WORLD's business engine.",
        estimatedFrom: "Fixture.",
      },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const closed = composeJournal(core, director, player.id)
      .flatMap((row) => row.lines)
      .find((line) => line.sourceRecordIds.includes(business));
    expect(closed?.text).toMatch(/ closed\.$/);
    // The opponent is not named in the player's own lines.
    const won = lines.find((line) => line.text.startsWith("I won"))!;
    expect(won.sourceRecordIds).toContain("election-result:fixture-seat-2");
    // Winning is sized as a change of work, losing as the run it ends.
    const impact = (causeId: string) =>
      director.ledger.people
        .get(player.id)!
        .moments.find((moment) => moment.causeId === causeId)!.impact;
    expect(impact("election-result:fixture-seat-2")).toBeGreaterThan(
      impact("election-result:fixture-mayor"),
    );
  });

  it("tells a marriage or a couple getting together, by the partnership's record", () => {
    const partnered = [...director.ledger.people.keys()]
      .map((id) => core.people.get(id)!)
      .find((person) =>
        (person.pastFacts ?? []).some((fact) => fact.kind === "family:partner"),
      )!;
    expect(partnered).toBeDefined();
    const fact = partnered.pastFacts!.find(
      (row) => row.kind === "family:partner",
    )!;
    const partner = core.people.get(fact.facts!.otherPersonId!)!;
    const line = composeJournal(core, director, partnered.id)
      .flatMap((chapter) => chapter.lines)
      .find((row) => row.sourceRecordIds.includes(fact.id));
    expect(line?.text).toBe(
      fact.facts!.partnershipKind === "legal:marriage"
        ? `I married ${partner.givenName}.`
        : `${partner.givenName} and I got together.`,
    );
  });

  it("tells a marriage in play, the person's own and a relative's", () => {
    const me = core.people.get(player.id)!;
    const known = [...me.knownIds]
      .filter((id) => !me.familyIds.has(id) && core.people.get(id)?.alive)
      .sort();
    const [spouseId, otherId] = known;
    // A watched person with a relative in town, close enough for that
    // relative's news to be a moment.
    const inTown = (id: string) => {
      const row = core.people.get(id);
      return !!row?.alive && row.tier !== "husk";
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
    const relativeId = [...core.people.get(watcherId)!.familyIds]
      .filter((id) => id !== watcherId && inTown(id))
      .sort()[0]!;
    const married = (id: string, personIds: string[]) =>
      applyCoreEvent(core, {
        id,
        date: core.date,
        kind: "family.married",
        personIds,
        placeId: me.placeId,
        publicRecord: true,
        source: {
          tag: "ESTIMATED",
          asOf: core.date,
          citation: "Fixture shaped like the partnering engine.",
          estimatedFrom: "Fixture.",
        },
        facts: { partnershipKind: "legal:marriage" },
      });
    married("family.married:fixture-own", [player.id, spouseId!]);
    married(
      "family.married:fixture-relative",
      [relativeId, otherId === relativeId ? spouseId! : otherId!].filter(
        (id) => id !== watcherId,
      ),
    );
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const lines = composeJournal(core, director, player.id).flatMap(
      (chapter) => chapter.lines,
    );
    const own = lines.find((line) =>
      line.sourceRecordIds.includes("family.married:fixture-own"),
    );
    expect(own?.text).toBe(
      `I married ${core.people.get(spouseId!)!.givenName}.`,
    );
    const relative = composeJournal(core, director, watcherId)
      .flatMap((chapter) => chapter.lines)
      .find((line) =>
        line.sourceRecordIds.includes("family.married:fixture-relative"),
      );
    expect(relative?.text).toMatch(/^My \w+ got married\.$/);
  });

  it("tells losing health insurance, as the coverage engine records it", () => {
    const me = core.people.get(player.id)!;
    applyCoreEvent(core, {
      id: `health.coverage-lost:${core.date}:${player.id}`,
      date: core.date,
      kind: "health.coverage-lost",
      personIds: [player.id],
      placeId: me.placeId,
      publicRecord: false,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: "Fixture shaped like the coverage engine.",
        estimatedFrom: "Fixture.",
      },
      facts: { from: "employer" },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const text = composeJournal(core, director, player.id).flatMap((chapter) =>
      chapter.lines.map((line) => line.text),
    );
    expect(text).toContain("I lost my health insurance.");
  });

  it("tells a couple moving in together, as the partnering engine records it", () => {
    const me = core.people.get(player.id)!;
    const partnerId = [...me.knownIds]
      .filter((id) => !me.familyIds.has(id) && core.people.get(id)?.alive)
      .sort()
      .at(-1)!;
    applyCoreEvent(core, {
      id: "family.moved-in-together:fixture",
      date: core.date,
      kind: "family.moved-in-together",
      personIds: [player.id, partnerId],
      placeId: me.placeId,
      publicRecord: false,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: "Fixture shaped like the partnering engine.",
        estimatedFrom: "Fixture.",
      },
      facts: { partnershipKind: "romantic:couple" },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const line = composeJournal(core, director, player.id)
      .flatMap((chapter) => chapter.lines)
      .find((row) =>
        row.sourceRecordIds.includes("family.moved-in-together:fixture"),
      );
    expect(line?.text).toBe(
      `${core.people.get(partnerId)!.givenName} and I moved in together.`,
    );
  });

  it("tells a divorce, as the partnering engine records it", () => {
    const me = core.people.get(player.id)!;
    const exId = [...me.knownIds]
      .filter((id) => !me.familyIds.has(id) && core.people.get(id)?.alive)
      .sort()[0]!;
    applyCoreEvent(core, {
      id: "family.divorced:fixture",
      date: core.date,
      kind: "family.divorced",
      personIds: [player.id, exId],
      placeId: me.placeId,
      publicRecord: true,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: "Fixture shaped like the partnering engine.",
        estimatedFrom: "Fixture.",
      },
      facts: { leftId: exId },
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const line = composeJournal(core, director, player.id)
      .flatMap((chapter) => chapter.lines)
      .find((row) => row.sourceRecordIds.includes("family.divorced:fixture"));
    expect(line?.text).toBe(
      `${core.people.get(exId)!.givenName} and I divorced.`,
    );
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
    expect(text).toContain("We moved away.");
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
    expect(named.filter((line) => /moved/.test(line))).toEqual([
      `We moved to ${lifePlaceByJurisdictionId(mover.placeId as never)!.displayName}.`,
    ]);
    expect(
      told("jurisdiction_unnamed").filter((line) => /moved/.test(line)),
    ).toEqual(["We moved away."]);
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
    expect(text.filter((line) => line.startsWith("I started at"))).toEqual([
      `I started at ${school.facts!.schoolName}.`,
    ]);
  });
});
