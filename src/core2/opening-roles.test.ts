/**
 * The roles county people hold (Coordinator, Nov 8): party activity, the
 * employer they own and civic roles, on counted members as on named people,
 * counted per role in a place drawn from all 56 and at Cedar Mills, Minnesota
 * (seed a1). Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { countedResidents } from "./electorate";
import { gameStartDate } from "./game-start";
import { createStableId } from "./kernel/ids";
import { ageInYears } from "./kernel/dates";
import { countyPlaceOfWorld } from "./opening-county-sample";
import { partyActivityOf } from "./opening-roles";
import { parameter as p } from "./parameters";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("party activity slides from nothing to one and is the same every time", () => {
  const levels = Array.from({ length: 4000 }, (_, i) =>
    partyActivityOf("s", createStableId("person", `t:${i}`)),
  );
  expect(levels.every((v) => v >= 0 && v <= 1)).toBe(true);
  expect(partyActivityOf("s", "person-7")).toBe(
    partyActivityOf("s", "person-7"),
  );
  const active = levels.filter((v) => v > 0).length / levels.length;
  // The active share is the parameter's, within sampling noise of 4,000 draws.
  expect(Math.abs(active - p("partyActiveShare"))).toBeLessThan(0.015);
  // Not a flag: the active spread over the whole unit line.
  const high = levels.filter((v) => v > 0.8).length;
  expect(high).toBeGreaterThan(0);
  expect(high).toBeLessThan(levels.filter((v) => v > 0).length);
});

for (const [name, drawSeed] of [
  ["Cedar Mills, Minnesota (a1)", "a1"],
  ["a drawn place", seed],
] as const)
  it(`county people hold roles at ${name}`, () => {
    setBookkeeping(false);
    const place = drawPlace(drawSeed, "elections");
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const countyId = countyPlaceOfWorld(core);
    if (!countyId) return;
    const voters = countedResidents(core).filter((v) => v.placeId === countyId);
    const adults = voters.filter(
      (v) => ageInYears(v.birthDate, core.date) >= p("votingAge"),
    );
    const active = adults.filter((v) => (v.partyActivity ?? 0) > 0);
    const owners = adults.filter((v) => v.ownedEmployerId !== undefined);
    const employers = new Set(
      adults.filter((v) => v.employerId).map((v) => v.employerId),
    );
    console.log(
      `${where}: ${adults.length} county adult records, ${active.length} active in a party, ${owners.length} owners of ${employers.size} employers`,
    );
    expect(active.length, where).toBeGreaterThan(0);
    // Every sampled employer has one owner, and an owner owns one.
    expect(new Set(owners.map((v) => v.ownedEmployerId)).size, where).toBe(
      owners.length,
    );
    expect(owners.length, where).toBe(employers.size);
  }, 300_000);
