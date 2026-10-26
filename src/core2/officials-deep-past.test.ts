/**
 * Officials have a life before office (pool item core-officials-deep-past):
 * the president, governors, members of Congress and every other named person
 * the world fills in carry the childhood, schools and era the opening gives
 * everyone, built from the world's seed and their birth, beside their party,
 * seat and prior office. Checked on every seated official in a played world.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`every seated official has a childhood, schools and an era, in a drawn place (seed ${seed})`, () => {
  const place = drawPlace(seed, "officials-deep-past");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const officials = [...core.people.values()].filter((p) =>
    p.pastFacts?.some((f) => f.kind === "identity:seat"),
  );
  expect(officials.length, `${where}: seated officials`).toBeGreaterThan(0);
  const missing: string[] = [];
  for (const official of officials) {
    const kinds = new Set((official.pastFacts ?? []).map((f) => f.kind));
    for (const kind of [
      "identity:party",
      "identity:seat",
      "birth-date",
      "school:cohort-estimate",
      "era:public-context",
      "household:moment",
    ])
      if (!kinds.has(kind)) missing.push(`${official.id} lacks ${kind}`);
  }
  expect(missing.slice(0, 5), `${where}: ${missing.length} gaps`).toEqual([]);
  // A past is dated before the person took office.
  for (const official of officials.slice(0, 50))
    for (const fact of official.pastFacts ?? [])
      if (fact.kind.startsWith("school:") || fact.kind.startsWith("era:"))
        expect(fact.date <= core.startedAt, `${official.id} ${fact.kind}`).toBe(
          true,
        );
}, 900_000);
