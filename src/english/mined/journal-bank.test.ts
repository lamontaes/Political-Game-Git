import { describe, expect, it } from "vitest";
import { addDays, ageOnDate, makeIsoDate } from "../../core2/kernel/dates";
import { enrichCivicInputs } from "../../core2/civic-inputs";
import { buildDeepPast } from "../../core2/deep-past";
import { initialFocusPeople } from "../../core2/focus";
import { advanceCore, createLifeCore } from "../../core2/life";
import { buildPopulation } from "../../core2/population";
import type { CoreState } from "../../core2/types";
import { composeJournal } from "../../director/journal";
import { createDirector } from "../../director/ledger";
import { JOURNAL_BANK, journalDataFromBank } from "./journal-bank";

/**
 * The mined journal bank, written through the story director's own
 * `composeJournal` in a generated place: every line is a mined sentence with
 * its slots filled from the person's records, each record id resolves, and
 * no line names a feeling.
 */
const seed = process.env.GOLDEN_PATH_SEED ?? "words-journal";
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
const chapters = composeJournal(core, director, player.id, {
  data: journalDataFromBank(),
});

const minedPatterns = JOURNAL_BANK.parts.map(
  (part) =>
    new RegExp(
      `^${part.text
        .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
        .replace(/\{\w+\}/g, ".+")}$`,
      "i",
    ),
);
const FEELINGS =
  /\b(?:happy|sad|glad|proud|angry|afraid|scared|lonely|loved|hated|miss(?:ed)?|grief|joy|upset|worried|excited)\b/i;

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

describe(`the mined journal in ${base.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("writes the life from mined sentences, each traced to a record", () => {
    const lines = chapters.flatMap((chapter) => chapter.lines);
    expect(lines.length).toBeGreaterThan(2);
    for (const line of lines) {
      expect(
        minedPatterns.some((pattern) => pattern.test(line.text)),
        line.text,
      ).toBe(true);
      expect(line.text, line.text).not.toMatch(FEELINGS);
      expect(line.sourceRecordIds.length, line.text).toBeGreaterThan(0);
      for (const id of line.sourceRecordIds)
        expect(resolves(core, id), id).toBe(true);
    }
  }, 240_000);

  it("names no feeling anywhere in the bank", () => {
    for (const part of JOURNAL_BANK.parts)
      expect(part.text, part.key).not.toMatch(FEELINGS);
  });
});
