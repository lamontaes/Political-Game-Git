import { describe, expect, it } from "vitest";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { applyCoreEvent } from "../core2/state";
import { buildPopulation } from "../core2/population";
import { composeJournal, composeLookBack } from "./journal";
import { JOURNAL_WORDS } from "../english/journal-words";
import { createDirector, type Director } from "./ledger";
import type { Moment } from "./types";

// M4-03, the journal: a first-person memoir in chapters (owner, Oct 14: "a
// dramatized story, not a list of facts"), no year headers, relatives named by
// relation, no school or workplace as an entry by itself, nothing invented.
const seed = process.env.GOLDEN_PATH_SEED ?? "journal-test";
const base = enrichCivicInputs(
  buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 400,
  }),
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

describe(`the journal in ${base.placeMetadata?.placeName} (seed ${seed})`, () => {
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

  it("never invents a feeling: its words hold no feeling", () => {
    const feelings =
      /\b(happy|sad|angry|afraid|scared|proud|lonely|glad|upset|love[ds]?|hate[ds]?|miss(ed)?|worried|excited|hurt|felt|feel|joy|grief|ashamed|relieved)\b/i;
    for (const row of JOURNAL_WORDS.lines)
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
    const framed = JOURNAL_WORDS.lines.filter((row) => row.framesAge);
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
    // The household's own past still tells the family; the visits tell nothing.
    const contactIds = [seen("2021-03-01").id, seen("2021-03-08").id];
    expect(
      composeJournal(core, fixture, player.id, {
        through: makeIsoDate("2021-04-01"),
      })
        .flatMap((row) => row.lines)
        .filter((line) => line.momentIds.some((id) => contactIds.includes(id))),
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
    const book = director.ledger.people.get(player.id)!;
    const raise = book.moments.find((row) => row.causeId === "fixture-raise");
    if (raise)
      expect(
        raise.channels.find((row) => row.channel === "money")!.raw,
      ).toBeCloseTo(0.25);
    // A raise small against the person's own traits sits under the moment
    // floor (directorMomentFloor): the director counts it there and stores no
    // moment, so the person's record shows it one way or the other.
    else
      expect(
        book.belowFloor.get("money:event:pay-raised-to-minimum-wage") ?? 0,
        `${base.placeMetadata?.placeName}: the raise was neither a moment nor counted below the floor`,
      ).toBeGreaterThan(0);
    const text = composeJournal(core, director, player.id).flatMap((row) =>
      row.lines.map((line) => line.text),
    );
    // No mined sentence says a raise, so the raise's own line is left out;
    // a law the person had no part in is not their story.
    expect(text.some((line) => /pay|\$15/.test(line))).toBe(false);
    expect(text).not.toContain("The bill passed.");
  });
});
