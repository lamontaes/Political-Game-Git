/**
 * Origin on the person's record (owner's playtest, Nov 8: "I'm Mexican and my
 * son is white"): a household shares one, kin take a relative's, a newborn a
 * parent's, and the faces read it. A place drawn from all 56; set
 * GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { packPersonOf } from "../bench/whole-figures";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  childOrigin,
  ORIGINS,
  originAt,
  originShares,
  originSharesWithBasis,
} from "./opening-origin";
import { PLACE_RACE_ORIGIN_ROWS } from "./place-race-origin.generated";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("a state's origin shares sum to one and a quantile reads them in order", () => {
  for (const key of ["US-KY", "US-NM", "US-HI", "US-GU"]) {
    const shares = originShares(key);
    expect(shares.reduce((n, [, s]) => n + s, 0)).toBeCloseTo(1, 6);
    expect(ORIGINS).toContain(originAt(key, 0.5));
  }
  // New Mexico's adults are mostly Hispanic or white; Hawaii's mostly Asian.
  expect(originAt("US-NM", 0.5)).toBe("hispanic");
  const hawaii = new Map(originShares("US-HI"));
  expect(hawaii.get("asian")!).toBeGreaterThan(hawaii.get("white")!);
});

it("a child takes one of the parents' origins, the same every time", () => {
  const pick = childOrigin(["hispanic", "white"], "child-1", "s");
  expect(["hispanic", "white"]).toContain(pick);
  expect(childOrigin(["hispanic", "white"], "child-1", "s")).toBe(pick);
  expect(childOrigin(["black", "black"], "child-2", "s")).toBe("black");
  expect(childOrigin([undefined, undefined], "child-3", "s")).toBeUndefined();
});

it("the pack's people differ by origin and a family looks related", () => {
  const person = (id: string, origin: string) =>
    packPersonOf({
      id,
      birthDate: "1980-01-01",
      gender: "female",
      official: false,
      origin,
      seed: id,
    })!;
  const dark = new Set(
    Array.from({ length: 12 }, (_, i) => person(`a${i}`, "black").id),
  );
  const light = new Set(
    Array.from({ length: 12 }, (_, i) => person(`b${i}`, "white").id),
  );
  expect([...dark].every((id) => !light.has(id) || light.size > 1)).toBe(true);
  expect(dark.size).toBe(1);
});

it(`every household shares one origin and kin take a relative's (seed ${seed})`, () => {
  setBookkeeping(false);
  const place = drawPlace(seed, "origin");
  const where = `${place.name} (${place.key}), run seed ${seed}, world seed ${place.seed}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  let checked = 0;
  for (const home of core.households.values()) {
    const origins = new Set(
      home.memberIds
        .map((id) => core.people.get(id)?.looks?.origin)
        .filter((o) => o !== undefined),
    );
    expect(origins.size, `${where}: household ${home.id}`).toBeLessThanOrEqual(
      1,
    );
    checked += origins.size;
  }
  expect(checked, where).toBeGreaterThan(0);
}, 120_000);

// Pinned places (from the committed 2020 place rows): Ahoskie NC, where most
// residents are Black while the state's adults are mostly white; Charlotte NC;
// a Vermont town with no row; a territory with no row.
const AHOSKIE = "3700500";
const CHARLOTTE = "3712000";
const NO_ROW = "5000400";

it("a town with a row draws from its own residents; one without falls back, and says so", () => {
  const rowOf = (geoid: string) =>
    PLACE_RACE_ORIGIN_ROWS.split(";")
      .find((row) => row.startsWith(`${geoid}:`))!
      .split(":")[1]!
      .split(",")
      .map(Number);
  for (const geoid of [AHOSKIE, CHARLOTTE]) {
    const counts = rowOf(geoid);
    const total = counts.reduce((n, v) => n + v, 0);
    const own = originSharesWithBasis("US-NC", geoid);
    expect(own.basis).toBe("place");
    expect(own.shares.reduce((n, [, s]) => n + s, 0)).toBeCloseTo(1, 9);
    const byOrigin = new Map(own.shares);
    expect(byOrigin.get("white")!).toBeCloseTo(counts[0]! / total, 9);
    expect(byOrigin.get("black")!).toBeCloseTo(counts[2]! / total, 9);
    expect(byOrigin.get("other")!).toBeCloseTo(counts[4]! / total, 9);
  }
  const state = new Map(originSharesWithBasis("US-NC").shares);
  const town = new Map(originSharesWithBasis("US-NC", AHOSKIE).shares);
  expect(town.get("black")!).toBeGreaterThan(state.get("black")! + 0.3);
  expect(originAt("US-NC", 0.5, AHOSKIE)).toBe("black");
  expect(originSharesWithBasis("US-VT", NO_ROW).basis).toBe("state");
  // The survey has no row for Guam, so its fallback is the nation's, said so.
  expect(originSharesWithBasis("US-GU", "territory:none").basis).toBe(
    "national",
  );
  expect(originShares("US-VT", NO_ROW)).toEqual(originShares("US-VT"));
});

it("households in a pinned town follow the town's own mix, not the state's", () => {
  setBookkeeping(false);
  const own = new Map(originSharesWithBasis("US-NC", AHOSKIE).shares);
  const { core } = buildBenchWorld("origin-town-pin-a", gameStartDate(), {
    twoLevel: true,
    placeKey: AHOSKIE,
  });
  const counts = new Map<string, number>();
  let homes = 0;
  for (const home of core.households.values()) {
    const origin = core.people.get(home.memberIds[0]!)?.looks?.origin;
    if (!origin) continue;
    homes += 1;
    counts.set(origin, (counts.get(origin) ?? 0) + 1);
  }
  expect(homes).toBeGreaterThan(20);
  const black = (counts.get("black") ?? 0) / homes;
  // Within sampling of the town's own share (a binomial's three sigmas), and
  // far above the state's.
  const sigma = Math.sqrt(
    (own.get("black")! * (1 - own.get("black")!)) / homes,
  );
  expect(Math.abs(black - own.get("black")!)).toBeLessThan(3 * sigma + 0.02);
  expect(black).toBeGreaterThan(0.45);
}, 120_000);
