import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import outlineBank from "../../data/english/parts/outline.json" with { type: "json" };
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld, NoPlayerHereError } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { officialsIn } from "../core2/modules/officials";
import { coreAPI } from "../core2/state";
import { inauguralFacts, tellInaugural } from "../director/inaugural-telling";
import { partsOf, tell, type TellingFacts } from "./outline-planner";

/**
 * The one outline planner (the Story lead, Nov 24, 2026; owner, Nov 23:
 * "It. What is it?" and "this is all following the same grammatical
 * pattern"). Pieces know what came before; speakers do not share a
 * skeleton; a fact is said no more than its budget.
 */
const f = (text: string) => ({ text, sourceRecordIds: ["record:test"] });
const facts: TellingFacts = Object.fromEntries(
  Object.entries({
    "term-left": "four years",
    "run-span": "four years",
    "run-hard": "yes",
    "run-inherited": "yes",
    "run-prices-ahead": "yes",
    "took-oath": "yes",
    "elected-last-fall": "yes",
    "theme-name": "the cost of a place to live",
    "theme-short": "housing",
    about: "a cap on rent increases",
    to: "cap rent increases",
    "law-name": "the cap on rent increases",
    "stance-against": "yes",
    "law-not-in-force": "yes",
    "other-side": "cap rent increases",
    belief: "a cap on rent means fewer homes get built",
    "belief-sentence": "A cap on rent means fewer homes get built.",
    today: "Landlords set the rent, and new buildings keep going up.",
    "today-clause": "landlords set the rent, and new buildings keep going up.",
    "the-vice-president": "Vice President Ann Lee",
  }).map(([key, text]) => [key, f(text)]),
);
const traitsOf = (facets: readonly string[], level: number) =>
  Object.fromEntries(
    facets.map((facet) => [`personality-v1:facet-${facet}`, level]),
  );
const PROFILES = [
  traitsOf(["blunt", "informal", "cocky"], 2),
  traitsOf(["sincere", "duty-bound", "devoted"], 2),
  traitsOf(["analytical", "practical", "studious"], 2),
  traitsOf(["dramatic", "charming", "excitable"], 2),
  traitsOf(["assertive", "argumentative", "competitive"], 2),
];
const told = (traits: Record<string, number>, key = "moment") =>
  tell({
    kind: "inaugural",
    facts,
    momentKey: key,
    worldSeed: "seed",
    sourceRecordIds: ["record:test"],
    knower: "person:president",
    traits,
  });

describe("the outline planner", () => {
  it("lets a piece that leans on the sentence before it play only after the moves it names", () => {
    const parts = (
      outlineBank as unknown as {
        parts: { key: string; text: string; after?: string[] }[];
      }
    ).parts;
    const leaning = /^(?:That|That's|It|It's|This|These|Those|So|And|Not me)\b/;
    for (const part of parts)
      if (leaning.test(part.text))
        expect(part.after?.length, part.key).toBeGreaterThan(0);
    for (const traits of PROFILES) {
      const text = told(traits)!;
      for (const [at, row] of text.sentences.entries()) {
        const part = partsOf("inaugural").find((p) => p.key === row.piece)!;
        if (!part.after) continue;
        const before = text.sentences[at - 1];
        const opens = !before || before.paragraph !== row.paragraph;
        expect(part.after, row.text).toContain(opens ? "start" : before.move);
      }
    }
  });

  it("gives speakers of different traits different skeletons from one record", () => {
    const skeletons = new Set(
      PROFILES.map((traits) =>
        told(traits)!
          .sentences.map((row) => row.shape)
          .filter((shape, at, all) => all.indexOf(shape) === at)
          .join(" > "),
      ),
    );
    expect(skeletons.size).toBeGreaterThanOrEqual(3);
  });

  it("says a fact's words no more often than its budget", () => {
    for (const traits of PROFILES)
      for (const key of ["a", "b", "c"]) {
        const text = told(traits, key)!.paragraphs.join(" ");
        expect(text.split("four years").length - 1, text).toBeLessThanOrEqual(
          3,
        );
        expect(text.split("housing").length - 1, text).toBeLessThanOrEqual(1);
      }
  });

  it("ends no point of an inaugural in an ask of Congress more than once", () => {
    for (const traits of PROFILES) {
      const text = told(traits)!.paragraphs.join(" ");
      expect(
        (text.match(/\bask Congress\b/g) ?? []).length,
      ).toBeLessThanOrEqual(1);
      expect(text).not.toMatch(/Hold me to it/);
    }
  });

  // Played worlds, not a hand-made record: the inaugural each drawn world's
  // President gives, told through the one planner. A piece whose `after`
  // names the moves it leans on ("That is why ...", "It ...") is never a
  // paragraph's first sentence unless "start" is among them, and inside a
  // paragraph follows only a move it names (owner, Nov 23: "It. What is it?"). Five worlds told; a world whose President gives no
  // inaugural is passed over by name.
  it("says a piece that leans on the sentence before it only after a move it names, and never first in a paragraph unless it may start one, in drawn worlds' inaugurals", () => {
    const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
    const WANT = 5;
    const DRAWS = 10;
    const MOMENTS = 20;
    const was = setBookkeeping(false);
    const used: string[] = [];
    const passed: string[] = [];
    let opened = 0;
    let leaned = 0;
    try {
      for (let draw = 0; draw < DRAWS && used.length < WANT; draw += 1) {
        const place = drawPlace(
          draw === 0 ? seed : `${seed}:${draw}`,
          "outline-after",
        );
        const where = `${place.name} (${place.key}), seed ${place.seed}`;
        let core;
        try {
          ({ core } = buildBenchWorld(place.seed, gameStartDate(), {
            twoLevel: true,
            placeKey: place.key,
          }));
        } catch (error) {
          if (!(error instanceof NoPlayerHereError)) throw error;
          passed.push(`${where}: no player can live here`);
          continue;
        }
        const official = officialsIn(coreAPI(core), "US:president")[0];
        const president = official ? core.people.get(official.id) : undefined;
        if (!official || !president) {
          passed.push(`${where} on ${core.date}: no President seated`);
          continue;
        }
        const told = tellInaugural(
          core,
          president,
          official,
          `inauguration:${core.date}`,
        );
        if (!told?.sentences.length) {
          passed.push(`${where} on ${core.date}: the inaugural told nothing`);
          continue;
        }
        used.push(where);
        // The world's own telling, then the same facts told under other
        // moments, so the check samples the planner's pick rather than one draw.
        const facts = inauguralFacts(
          core,
          president,
          official,
          told.plan,
          `inauguration:${core.date}`,
        );
        const tellings = [
          told.sentences.map((row) => ({
            key: row.pieces[0]!,
            paragraph: row.part,
            text: row.text,
          })),
          ...Array.from({ length: MOMENTS }, (_, at) =>
            (
              tell({
                kind: "inaugural",
                facts,
                momentKey: `outline-after:${at}`,
                worldSeed: core.seed,
                sourceRecordIds: [official.id],
                knower: president.id,
                traits: president.traits,
              })?.sentences ?? []
            ).map((row) => ({
              key: row.piece,
              paragraph: row.paragraph,
              text: row.text,
            })),
          ),
        ];
        const movesOf = (key: string) =>
          partsOf("inaugural").find((row) => row.key === key)!.move;
        for (const sentences of tellings)
          for (const [at, sentence] of sentences.entries()) {
            const part = partsOf("inaugural").find(
              (row) => row.key === sentence.key,
            );
            expect(part, `${where}: ${sentence.key}`).toBeTruthy();
            const before = sentences[at - 1];
            const opens = !before || before.paragraph !== sentence.paragraph;
            if (opens) opened += 1;
            if (!part!.after) continue;
            leaned += 1;
            // First in its paragraph: only a piece that may start one.
            // Inside a paragraph: only after a move it names.
            expect(
              part!.after,
              opens
                ? `${where}: "${sentence.text}" (${sentence.key}) opens paragraph ${sentence.paragraph}`
                : `${where}: "${sentence.text}" (${sentence.key}) follows ${before!.key}`,
            ).toContain(opens ? "start" : movesOf(before!.key));
          }
      }
    } finally {
      setBookkeeping(was);
    }
    process.stdout.write(
      `outline-after (GOLDEN_PATH_SEED=${seed}): told in ${used.join(" | ")}; ${opened} paragraph openings and ${leaned} leaning pieces checked over ${MOMENTS + 1} tellings a world; passed over: ${passed.join(" | ") || "none"}\n`,
    );
    expect(
      used.length,
      `drew ${DRAWS} places, seed ${seed}; passed over: ${passed.join(" | ")}`,
    ).toBe(WANT);
    expect(
      leaned,
      `no leaning piece was said in ${used.join(" | ")}`,
    ).toBeGreaterThan(0);
  }, 600_000);
});
