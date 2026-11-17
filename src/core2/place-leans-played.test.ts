/**
 * The kept leans in a played world (calibration audit, family 6): after the world's first
 * general election, places outside the town hold leans their own results moved, each
 * toward or away from the party that held the seat by its state's jobs against the
 * nation's, and the next count reads those leans, not the published 2024 map. On main
 * every count read the 2024 map again. A place is drawn from all 56; set
 * LEANS_PLAYED_SEED to replay a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { partySide } from "./appointments";
import { setBookkeeping } from "./bookkeeping";
import { statePlaces } from "./electorate-places";
import { electorateParameter } from "./electorate-inputs";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  electoralCollege,
  ownConditionsOf,
  placesOf,
  racesOf,
  VOTING_MODULE_ID,
} from "./modules/voting";
import type { LeanRow } from "./place-leans";
import { coreAPI } from "./state";

const seed = process.env.LEANS_PLAYED_SEED ?? randomBytes(8).toString("hex");

it("carries each counted place's own move into its lean, and the next count reads it", () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "place-leans-played");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  // A week past the world's first general election (November 3, 2026).
  advanceCore(core, makeIsoDate("2026-11-10"));
  const leans = api
    .moduleState(VOTING_MODULE_ID)
    .table("leans")
    .rows() as unknown as LeanRow[];
  const moved = leans.filter((row) => row.rightShare !== row.opening);
  process.stderr.write(
    `${where}: ${String(leans.length)} places hold a kept lean on ${core.date}, ${String(moved.length)} of them moved\n`,
  );
  expect(moved.length, `${where}: no place's lean moved`).toBeGreaterThan(0);
  const strength = electorateParameter("leanCarryShare");
  const races = new Map(racesOf(api).map((race) => [race.id, race]));
  let signed = 0;
  for (const row of moved) {
    const said = `${where}, ${row.placeId}: opened ${String(row.opening)}, now ${String(row.rightShare)}`;
    // The lean is the day's opening lean moved by the strength times its own move that day.
    expect(row.day, said).toBeDefined();
    expect(row.rightShare, said).toBeCloseTo(
      Math.max(
        0,
        Math.min(
          1,
          row.day!.base + (strength * row.day!.sum) / row.day!.contests,
        ),
      ),
      12,
    );
    // One contest counted it: it moved toward the side that held the seat where its state's
    // jobs did better than the nation's over the year, and away where they did worse.
    const usps = /^county:([A-Z]{2})\|/.exec(row.placeId)?.[1];
    const race = row.last ? races.get(row.last.contestId) : undefined;
    const side = partySide(race?.incumbentParty ?? null);
    if (!usps || !race || !side || row.day!.contests !== 1) continue;
    const own = ownConditionsOf(api, usps);
    if (!own.appeal) continue;
    signed += 1;
    expect(
      Math.sign(row.last!.ownMove),
      `${said}; ${race.id} held by ${String(race.incumbentParty)}; ${usps} unemployment moved ${own.stateChange.toFixed(2)} points against the nation's ${own.nationChange.toFixed(2)}`,
    ).toBe(Math.sign(side * own.appeal));
  }
  process.stderr.write(
    `${where}: ${String(signed)} counties checked against their state's jobs\n`,
  );
  // The next count: the electors' states, counted by the game's own call. Each place is
  // counted on the lean the world kept for it.
  const before = new Map(leans.map((row) => [row.placeId, row.rightShare]));
  const elsewhere = moved
    .map((row) => ({
      row,
      usps: /^county:([A-Z]{2})\|/.exec(row.placeId)?.[1],
    }))
    .filter(({ usps }) => usps && `US-${usps}` !== place.state)
    .sort(
      (a, b) =>
        Math.abs(b.row.rightShare - b.row.opening) -
          Math.abs(a.row.rightShare - a.row.opening) ||
        a.row.placeId.localeCompare(b.row.placeId),
    )[0];
  expect(
    elsewhere,
    `${where}: no county outside the town's state moved`,
  ).toBeDefined();
  const usps = elsewhere!.usps!;
  electoralCollege(api, 2028);
  const counted = placesOf(api, `presidential:2028:US-${usps}`);
  expect(counted.length, `${where}: ${usps} was not counted`).toBeGreaterThan(
    0,
  );
  const published = new Map(
    statePlaces(usps, core.seed).map((row) => [row.id, row.rightShare]),
  );
  let off = 0;
  for (const row of counted) {
    const kept = before.get(row.placeId);
    const said = `${where}, ${row.placeId}: counted on ${String(row.rightShare)}, kept ${String(kept)}, published ${String(published.get(row.placeId))}`;
    expect(row.rightShare, said).toBe(kept ?? published.get(row.placeId));
    if (row.rightShare !== published.get(row.placeId)) off += 1;
  }
  process.stderr.write(
    `${where}: ${usps} counted for the electors on ${String(counted.length)} counties, ${String(off)} of them off the published map\n`,
  );
  expect(
    off,
    `${where}: every county of ${usps} was counted on the published map`,
  ).toBeGreaterThan(0);
}, 2_400_000);
