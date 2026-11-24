import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld, NoPlayerHereError } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { officialsIn } from "../core2/modules/officials";
import { ownStance } from "../core2/officials-roster";
import { NAMED_QUESTIONS } from "../english/question-names";

// The opening address from this world's records (play-first-09). Two worlds
// drawn from all 56 places on seeds the builder did not choose open with
// addresses of different shape: how many priorities the President leads with
// and which, what the state's law says on each, the line they will not cross,
// whether the governors are addressed, which of the country's subjects the
// story tells. The year is told in words from its record and no figure is
// said (owner, Oct 27 and Nov 1); every priority is a policy question the
// President holds a view on, every law line a law row the laws engine holds;
// nothing is written in a sentence.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

setBookkeeping(false);
/** Draws a world may pass over before the test says no place had a home for the player. */
const DRAWS = 8;
const worlds = Array.from({ length: 4 }, (_, at) => {
  // A place where every adult lives in group quarters has no household for
  // the player, so no game opens there: it is passed over and printed, and
  // the next draw is tried.
  const passed: string[] = [];
  for (let tries = 0; tries < DRAWS; tries++) {
    const drawSeed = tries ? `${seed}:${at}:${tries}` : `${seed}:${at}`;
    const place = drawPlace(drawSeed, "opening-address");
    const where = `${place.name} (${place.key}), seed ${drawSeed}`;
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      return opened(where, world, passed);
    } catch (error) {
      if (!(error instanceof NoPlayerHereError)) throw error;
      passed.push(`${where}: every adult in group quarters`);
      process.stdout.write(`OPENING ADDRESS passed over ${passed.at(-1)}\n`);
    }
  }
  throw new Error(
    `no place with a home for the player in ${DRAWS} draws: ${passed.join("; ")}`,
  );
});

function opened(
  where: string,
  world: ReturnType<typeof buildBenchWorld>,
  passed: readonly string[],
) {
  if (passed.length) where = `${where} (passed over ${passed.length})`;
  const story = world.director.ledger.opening;
  console.log(
    `OPENING ADDRESS ${where}\n  ${(story?.address.sentences ?? []).map((row) => row.text).join("\n  ")}`,
  );
  return { where, world, story };
}

/** The address's shape: each sentence's part of the speech and what it is about. */
const shapeOf = (
  sentences: readonly { level: string; facts: readonly string[] }[],
) =>
  sentences.map(
    (row) =>
      `${row.level}:${row.facts.filter((key) => key !== "name").join("+")}`,
  );

describe("the opening address from a world's records", () => {
  it("differs in shape between worlds, each with its own priorities", () => {
    const [a, b] = worlds.slice(0, 2).map(({ story }) => story!.address);
    expect(a!.text).not.toBe(b!.text);
    // Over four worlds the shapes are not all one shape, nor the priorities one list.
    const shapes = new Set(
      worlds.map(({ story }) => shapeOf(story!.address.sentences).join(" ")),
    );
    process.stdout.write(`ADDRESS SHAPES ${seed}: ${shapes.size}\n`);
    // The structure itself varies with the President (owner, Nov 1: "Every
    // one of these speeches has the same general outline. They need to
    // vary."): what it leads with, and which parts it says, in its own order.
    const structures = new Set(
      worlds.map(({ story }) =>
        story!.address.sentences
          .map((row) => row.level)
          .filter((level, at, all) => level !== all[at - 1])
          .join(" > "),
      ),
    );
    process.stdout.write(
      `ADDRESS STRUCTURES ${seed}:\n  ${[...structures].join("\n  ")}\n`,
    );
    // Since the speech outline (Nov 12) the order is the kind's own row, so
    // the variety is in the theme and the points: four worlds give more
    // than one theme or more than one list of asks.
    const themes = new Set(
      worlds.map(({ story }) => `${story!.theme}:${story!.asks.join(",")}`),
    );
    expect(
      Math.max(structures.size, themes.size),
      `four worlds at ${seed}`,
    ).toBeGreaterThan(1);
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
        // A question the laws engine holds no row for is open, cited by the
        // powers record (SG-WORDS-speech-unseeded-law-open, W-E, Nov 12).
        if (!lawId) {
          expect(
            sentence.facts.includes("law-not-in-force"),
            `${where}: ${sentence.text}`,
          ).toBe(true);
          continue;
        }
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

  it("says no figure at all", () => {
    // An address says how far something moved in words, never a figure (owner,
    // Nov 1: "I don't like where this part of the speech where it just laces
    // statistics"; the Story lead's read of #9831, Nov 17: "no figure is
    // spoken in an address"). The context pieces that said a percent are gone.
    for (const { where, story } of worlds)
      for (const sentence of story!.address.sentences)
        expect(sentence.text, `${where}: "${sentence.text}"`).not.toMatch(
          /\d|percent/,
        );
  });
}, 600_000);
