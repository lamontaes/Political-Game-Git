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
      "household:moment",
    ])
      if (!kinds.has(kind)) missing.push(`${official.id} lacks ${kind}`);
  }
  expect(missing.slice(0, 5), `${where}: ${missing.length} gaps`).toEqual([]);
  // Each has a stored look, written once when filled in (opening root cause 6).
  const faceless = officials.filter((p) => !p.looks?.appearanceSeed);
  expect(
    faceless.map((p) => p.id).slice(0, 5),
    `${where}: officials with no look`,
  ).toEqual([]);
  // A national official lives and went to school in their home state, not the
  // player's (opening root cause 10).
  const president = officials.find((p) =>
    p.pastFacts?.some(
      (f) =>
        f.kind === "identity:seat" && f.facts?.seatKey === "seat:US:president",
    ),
  )!;
  const home = president.pastFacts!.find(
    (f) => f.kind === "identity:home-state",
  )!.facts!.stateKey;
  expect(president.placeId, `${where}: the President's home`).toBe(home);
  const schools = president.pastFacts!.filter((f) =>
    f.kind.startsWith("school:"),
  );
  expect(schools.length, `${where}: the President's schools`).toBeGreaterThan(
    0,
  );
  for (const school of schools)
    expect(school.facts?.placeId, `${where}: ${school.id}`).toBe(home);
  // A past is dated before the person took office.
  for (const official of officials.slice(0, 50))
    for (const fact of official.pastFacts ?? [])
      if (fact.kind.startsWith("school:"))
        expect(fact.date <= core.startedAt, `${official.id} ${fact.kind}`).toBe(
          true,
        );
}, 900_000);
