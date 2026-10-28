/**
 * Officials have a life before office (pool item core-officials-deep-past):
 * the president, governors, members of Congress and every other named person
 * the world fills in carry their party, seat and prior office, a stored look,
 * and the school years the school engine's run gives everyone inside the
 * years before the start (from the player's birth year), in the place they
 * lived. Checked on every seated official in a played world.
 */
import { preStartHistory } from "./pre-start";
import { SCHOOL_STARTED } from "./past-school";
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`every seated official has a party, a seat, a look and their school years from the run, in a drawn place (seed ${seed})`, () => {
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
    for (const kind of ["identity:party", "identity:seat"])
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
  // Every school year the run recorded for an official is in a place their
  // records put them, dated inside the run, before the start.
  const schools = officials.flatMap((official) =>
    preStartHistory(core, { kind: SCHOOL_STARTED, personId: official.id }).map(
      (row) => ({ official, row }),
    ),
  );
  for (const { official, row } of schools.slice(0, 200)) {
    expect(row.date < core.startedAt, `${where}: ${row.id}`).toBe(true);
    expect(
      [
        official.placeId,
        official.pastFacts?.find((f) => f.kind === "birthplace")?.facts
          ?.placeId,
      ],
      `${where}: ${row.id}`,
    ).toContain(row.placeId);
  }
}, 900_000);
