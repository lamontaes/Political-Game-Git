import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import addressJson from "./data/opening-address.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { questionSubject } from "../english/policy-names";

// The address from this world's numbers and this President
// (play-first-09-opening-speech-per-world). Every address cites at least
// three of the country's numbers besides unemployment, each from the
// economy's own month records. A President whose first goal bears on one of
// those numbers opens with them, right after the salutation; any other opens
// with the occasion. Both are on the President's own stage, so the camera's
// order (the President, Congress, the state, the family) holds. Places are
// drawn in turn until two worlds' addresses differ in length and in the
// order of their sections, and no two give the same lines.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const WORLDS = 8;
const NUMBER_FACTS: Record<string, string> = {
  inflation: "inflation-rate",
  growth: "growth-rate",
  wages: "wage-growth",
  mortgage: "mortgage-rate",
  jobs: "jobs-added",
};
const BEARS = addressJson.numbersBySubject as Record<string, string[]>;

it(`two worlds' addresses differ in length and order, each citing its own numbers (seed ${seed})`, () => {
  setBookkeeping(false);
  const seen: {
    where: string;
    lines: string[];
    order: string[];
  }[] = [];
  for (let attempt = 0; attempt < WORLDS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "opening-address");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    const { director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const sentences = director.ledger.opening?.address.sentences ?? [];
    expect(sentences.length, `${where}: no address`).toBeGreaterThan(0);
    // At least three of the country's numbers besides unemployment, each
    // citing the economy's records beside the President.
    const numbers = sentences.filter(
      (row) =>
        row.level === "country" &&
        row.facts.some((key) => Object.values(NUMBER_FACTS).includes(key)),
    );
    expect(numbers.length, where).toBeGreaterThanOrEqual(3);
    for (const row of numbers)
      expect(
        row.sourceRecordIds.some((id) => id.includes("macro")),
        `${where}: "${row.text}" cites ${row.sourceRecordIds.join(", ")}`,
      ).toBe(true);
    // The numbers come before the occasion when the President's first goal
    // bears on a number the address says.
    const levels = [...new Set(sentences.map((row) => row.level))];
    const firstGoal = sentences
      .find((row) => row.level === "congress" && row.facts.includes("goal"))
      ?.sourceRecordIds.find((id) => id.startsWith("question:"))
      ?.slice("question:".length);
    const said = new Set(sentences.flatMap((row) => row.facts));
    const leads =
      !!firstGoal &&
      (BEARS[questionSubject(firstGoal) ?? ""] ?? []).some((number) =>
        said.has(NUMBER_FACTS[number]!),
      );
    if (levels.includes("occasion"))
      expect(
        levels.indexOf("country") < levels.indexOf("occasion"),
        `${where}: first goal ${firstGoal} (${questionSubject(firstGoal ?? "")}), sections ${levels.join(" → ")}`,
      ).toBe(leads);
    const lines = sentences.map((row) => row.text);
    console.log(
      `OPENING ADDRESS ${where}: ${lines.length} lines, ${levels.join(" → ")}; first goal ${firstGoal} (${questionSubject(firstGoal ?? "")})\n  ${lines.join("\n  ")}`,
    );
    // No two worlds give the same address.
    for (const other of seen)
      expect(lines, `${where} and ${other.where}`).not.toEqual(other.lines);
    seen.push({ where, lines, order: levels });
    const pair = seen.find(
      (other) =>
        other.lines.length !== lines.length &&
        other.order.join() !== levels.join(),
    );
    if (pair) {
      console.log(`OPENING ADDRESS pair: ${pair.where} and ${where}`);
      return;
    }
  }
  throw new Error(
    `no two of ${seen.length} worlds differ in both length and order (seed ${seed}): ${seen
      .map((row) => `${row.where} ${row.lines.length} ${row.order.join(">")}`)
      .join("; ")}`,
  );
}, 1_800_000);
