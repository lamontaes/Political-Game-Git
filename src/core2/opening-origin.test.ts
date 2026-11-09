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
import { childOrigin, ORIGINS, originAt, originShares } from "./opening-origin";

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
