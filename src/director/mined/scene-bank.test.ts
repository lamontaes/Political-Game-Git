import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../../core2/kernel/dates";
import { enrichCivicInputs } from "../../core2/civic-inputs";
import { buildDeepPast } from "../../core2/deep-past";
import { initialFocusPeople } from "../../core2/focus";
import { advanceCore, createLifeCore } from "../../core2/life";
import { buildPopulation } from "../../core2/population";
import { applyCoreEvent } from "../../core2/state";
import { bringItUp } from "../bring-it-up";
import { createDirector } from "../ledger";
import { composeScene } from "../scene";
import {
  BRING_BANK,
  bringDataFromBank,
  SCENE_BANK,
  sceneWordsFromBank,
} from "./scene-bank";

/**
 * The mined scene and bring-it-up banks through the director's own
 * `composeScene` and `bringItUp` in a generated place: every line is a mined
 * sentence filled from records, and each cites them.
 */
const seed = process.env.GOLDEN_PATH_SEED ?? "words-scenes";
const base = enrichCivicInputs(
  buildDeepPast(
    buildPopulation({
      seed,
      ...(process.env.GOLDEN_PATH_SEED
        ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
        : {}),
      startedAt: "2021-01-01",
      minimumPeople: 600,
    }),
  ),
);
const age = (birth: string) =>
  ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
const player = base.people.find(
  (person) =>
    person.tier !== "husk" &&
    age(person.birthDate) >= 18 &&
    age(person.birthDate) <= 30,
)!;
const input = { ...base, playerId: player.id };
const director = createDirector({ watch: [...initialFocusPeople(input)] });
const core = createLifeCore(input, { modules: [director.module] });
director.start(core);
advanceCore(core, "2021-02-15");

const mined = (bank: { parts: { text: string }[] }) =>
  bank.parts.map(
    (part) =>
      new RegExp(
        `^${part.text
          .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
          .replace(/\{host\}/g, ".+'s")
          .replace(/\{\w+\}/g, ".+")}$`,
        "i",
      ),
  );

describe(`mined scenes and bring-it-up in ${base.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("narrates staged scenes from mined sentences, each traced to records", () => {
    const words = sceneWordsFromBank();
    const patterns = mined(SCENE_BANK);
    let lines = 0;
    for (const book of director.ledger.people.values())
      for (const entry of book.schedule) {
        if (!entry.bindings.length) continue;
        const scene = composeScene(core, director, book.personId, entry, words);
        for (const line of scene?.narration ?? []) {
          expect(
            patterns.some((pattern) => pattern.test(line.text)),
            line.text,
          ).toBe(true);
          expect(line.sourceRecordIds.length, line.text).toBeGreaterThan(0);
          lines += 1;
        }
      }
    expect(lines).toBeGreaterThan(0);
  }, 240_000);

  it("brings up a closure in mined sentences", () => {
    const worker = [...core.people.values()].find(
      (row) =>
        row.tier !== "husk" && row.alive && row.jobId && row.knownIds.size > 2,
    )!;
    const org = core.jobs.get(worker.jobId!)!.organizationId;
    applyCoreEvent(core, {
      id: `organization.closed:${org}:${core.date}`,
      date: core.date,
      kind: "organization.closed",
      personIds: [worker.id],
      placeId: worker.placeId,
      publicRecord: true,
      source: {
        tag: "SOURCED",
        citation: "Closure as the finance writer records it.",
        asOf: core.date,
      },
      facts: { [`organization:${org}:status`]: "closed" },
    });
    const listener = [...worker.knownIds][0]!;
    const said = bringItUp(core, worker.id, listener, bringDataFromBank());
    expect(said).not.toBeNull();
    const patterns = mined(BRING_BANK);
    expect(said!.lines.length).toBeGreaterThan(0);
    for (const line of said!.lines) {
      expect(
        patterns.some((pattern) => pattern.test(line.text)),
        line.text,
      ).toBe(true);
      expect(line.sourceRecordIds.length).toBeGreaterThan(0);
    }
  }, 120_000);
});

describe("the scene leads for a law taking effect and a meeting held", () => {
  const leads = sceneWordsFromBank().leads;
  const parts = SCENE_BANK.parts as unknown as {
    key: string;
    origin?: string;
    author?: string;
    date?: string;
    uses: { role: string }[];
  }[];
  it.each(["law-takes-effect", "public-hearing"])(
    "%s has several wordings, each authored with author and date",
    (typeKey) => {
      const lead = leads.find((row) => row.typeKey === typeKey);
      expect(lead?.variants.length).toBeGreaterThanOrEqual(3);
      for (const part of parts.filter((row) =>
        row.uses.some((use) => use.role === typeKey),
      )) {
        expect(part.origin, part.key).toBe("authored");
        expect(part.author, part.key).toBeTruthy();
        expect(part.date, part.key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    },
  );
});
