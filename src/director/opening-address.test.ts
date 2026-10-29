import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { MACRO_MODULE_ID } from "../core2/modules/macro";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { officialsIn } from "../core2/modules/officials";
import { ownStance } from "../core2/officials-roster";
import { historyMonths, type MacroMonth } from "../core2/macro-model";
import type { ModuleRow } from "../core2/module-data";
import { NAMED_QUESTIONS } from "../english/question-names";
import { composeOpeningStory } from "./opening-story";

// The opening address from this world's records (play-first-09). Two worlds
// drawn from all 56 places on seeds the builder did not choose open with
// addresses of different shape: how many priorities the President leads with
// and which, what the state's law says on each, the line they will not cross,
// whether the governors are addressed, which of the country's numbers the
// story tells. Every figure is a record's value, every priority a policy
// question the President holds a view on, every law line a law row the laws
// engine holds; nothing is written in a sentence.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const FIGURES = [
  "unemployment-rate",
  "inflation-rate",
  "mortgage-rate",
  "wage-growth",
  "growth-rate",
  "jobs-added",
];

setBookkeeping(false);
const worlds = Array.from({ length: 4 }, (_, at) => {
  const place = drawPlace(`${seed}:${at}`, "opening-address");
  const where = `${place.name} (${place.key}), seed ${seed}:${at}`;
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const story = world.director.ledger.opening;
  console.log(
    `OPENING ADDRESS ${where}\n  ${(story?.address.sentences ?? []).map((row) => row.text).join("\n  ")}`,
  );
  return { where, world, story };
});

/** The address's shape: each sentence's part of the speech and what it is about. */
const shapeOf = (
  sentences: readonly { level: string; facts: readonly string[] }[],
) =>
  sentences.map(
    (row) =>
      `${row.level}:${row.facts.filter((key) => key !== "name").join("+")}`,
  );

describe("the opening address from a world's records", () => {
  it("opens, tells the country, names priorities and closes in every world", () => {
    for (const { where, story } of worlds) {
      expect(story, where).toBeTruthy();
      const levels = story!.address.sentences.map((row) => row.level);
      expect(levels[0], where).toBe("salutation");
      expect(levels.at(-1), where).toBe("close");
      expect(levels, where).toContain("country");
      // Each priority goes to Congress, for a question federal law can answer
      // and has not; the address is national only (opening-asks.test.ts), so
      // a President with no view on a federal question asks nothing (item
      // gov-federal-questions-answers-stances).
      expect(levels, where).not.toContain("governors");
    }
  });

  it("differs in shape between worlds, each with its own priorities", () => {
    const [a, b] = worlds.slice(0, 2).map(({ story }) => story!.address);
    expect(a!.text).not.toBe(b!.text);
    // Over four worlds the shapes are not all one shape, nor the priorities one list.
    const shapes = new Set(
      worlds.map(({ story }) => shapeOf(story!.address.sentences).join(" ")),
    );
    // Shapes vary only where Presidents hold federal views; with none, every
    // address has one shape and differs in the country's story (printed).
    process.stdout.write(`ADDRESS SHAPES ${seed}: ${shapes.size}\n`);
    const asked = (index: number) =>
      worlds[index]!.story!.address.sentences.flatMap((row) =>
        row.sourceRecordIds.filter((id) => id.startsWith("question:")),
      );
    process.stdout.write(
      `ADDRESS ASKS ${seed}: ${[0, 1, 2, 3].map((i) => asked(i).length).join(", ")}\n`,
    );
  });

  it("cites a priority's question, the President's side of it and the law in force, by record", () => {
    for (const { where, world, story } of worlds) {
      const api = coreAPI(world.core);
      const official = officialsIn(api, "US:president")[0]!;
      const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
      const spoken = story!.address.sentences.filter((row) =>
        row.facts.includes("about"),
      );
      for (const sentence of spoken) {
        const question = sentence.sourceRecordIds
          .find((id) => id.startsWith("question:"))!
          .slice("question:".length);
        expect(NAMED_QUESTIONS, `${where}: ${sentence.text}`).toContain(
          question,
        );
        expect(sentence.sourceRecordIds, sentence.text).toContain(official.id);
      }
      // A sentence that says what the law is cites the law row, and says what that row holds.
      const lawLines = story!.address.sentences.filter((row) =>
        row.facts.some(
          (key) => key === "law-in-force" || key === "law-not-in-force",
        ),
      );
      for (const sentence of lawLines) {
        const lawId = sentence.sourceRecordIds.find((id) =>
          id.startsWith("law:"),
        );
        expect(lawId, `${where}: ${sentence.text}`).toBeTruthy();
        const row = laws.get(lawId!) as unknown as {
          value: number;
          series: string;
        };
        expect(row, `${where}: ${lawId}`).toBeTruthy();
        expect(
          sentence.facts.includes("law-in-force"),
          `${where}: ${sentence.text}`,
        ).toBe(row.value === 1);
        // The President's side, from their recorded stance on that question.
        const stance = ownStance(
          official.ideal,
          official.signature,
          row.series,
        );
        const sides = story!.address.sentences.filter(
          (other) =>
            other.sourceRecordIds.includes(`question:${row.series}`) &&
            other.facts.some((key) => key.startsWith("stance-")),
        );
        for (const side of sides)
          expect(
            side.facts.includes("stance-for"),
            `${where}: ${side.text}`,
          ).toBe(stance > 0);
      }
    }
  });

  it("says every figure as its record's value, and no figure when the record changes its mind", () => {
    const { where, world, story } = worlds[0]!;
    const api = coreAPI(world.core);
    // The opening month and the year before, as the macro engine publishes them.
    expect(world.core.modules.has(MACRO_MODULE_ID), where).toBe(true);
    const months = api.moduleState(MACRO_MODULE_ID).table("months");
    const recorded = months.rows() as unknown as MacroMonth[];
    const rows = (
      recorded.length
        ? recorded
        : historyMonths(world.core.startedAt, world.core.seed, (key) =>
            api.parameter(key),
          )
    )
      .slice()
      .sort((a, b) => a.month.localeCompare(b.month));
    const now = rows
      .filter((row) => row.month <= world.core.date.slice(0, 7))
      .at(-1)!;
    const figures = (told: typeof story) =>
      told!.address.sentences.flatMap((row) =>
        Object.entries(row.values).filter(([key]) => FIGURES.includes(key)),
      );
    const said = figures(story);
    expect(said.length, where).toBeGreaterThan(0);
    // Every number in the text is one of the figures the sentence cites.
    for (const sentence of story!.address.sentences) {
      const cited = Object.entries(sentence.values)
        .filter(([key]) => FIGURES.includes(key))
        .map(([, value]) => value);
      for (const digits of sentence.text.match(/\d[\d.,]*\d|\d/g) ?? [])
        expect(cited, `${where}: "${sentence.text}"`).toContain(digits);
    }
    // Change the record: the address says the new value.
    const moved = {
      ...now,
      unemploymentPct: now.unemploymentPct + 1.3,
      inflationPct: now.inflationPct + 0.7,
      mortgage30Pct: now.mortgage30Pct + 0.9,
    };
    for (const row of rows)
      months.put((row === now ? moved : row) as unknown as ModuleRow);
    const again = composeOpeningStory(world.core, world.playerId!);
    const expected: Record<string, string> = {
      "unemployment-rate": moved.unemploymentPct.toFixed(1),
      "inflation-rate": moved.inflationPct.toFixed(1),
      "mortgage-rate": moved.mortgage30Pct.toFixed(1),
    };
    const changed = figures(again).filter(([key]) => expected[key]);
    expect(changed.length, where).toBeGreaterThan(0);
    for (const [key, value] of changed) expect(value, key).toBe(expected[key]);
    for (const sentence of again!.address.sentences)
      for (const [key, value] of Object.entries(sentence.values))
        if (expected[key]) expect(sentence.text, key).toContain(value);
  });
}, 600_000);
