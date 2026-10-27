/**
 * A homeless household's status row remembers who was homeless together. If
 * the living members have since left the household (the one who stayed is
 * dead), rehousing finds nobody to sign or pay a lease: it stops the year with
 * "Finance terms require distinct recorded payers" instead of closing the
 * row. Played world: the place and seed that stopped, then a place drawn at
 * random from all 56 (named in every failure message; set GOLDEN_PATH_SEED to
 * repeat it).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

function playYear(key: string, worldSeed: string, days: number): string {
  const where = `${key}, seed ${worldSeed}`;
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(worldSeed, gameStartDate(), {
      twoLevel: true,
      placeKey: key,
    });
    const end = addDays(makeIsoDate(core.date), days);
    for (let day = 0; day < days; day += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    // The year ran to its last day.
    expect(core.date, where).toBe(end);
    // Every open lease is paid by someone alive.
    let leases = 0;
    for (const contract of core.finance.contracts.values()) {
      if (!contract.id.startsWith("lease:") || contract.endedAt) continue;
      leases += 1;
      const living = contract.payerIds.filter(
        (id) => core.people.get(id)?.alive,
      );
      expect(
        living.length,
        `${where}: ${contract.id} payers ${contract.payerIds.join(", ")}`,
      ).toBeGreaterThan(0);
    }
    expect(leases, where).toBeGreaterThan(0);
    process.stdout.write(
      `LEASES ${where}: ${leases} open leases on ${core.date}, each with a living payer\n`,
    );
    return where;
  } finally {
    setBookkeeping(true);
  }
}

it("a year in the place where the only living homeless member had left the household runs through", () => {
  playYear(
    "3050950",
    "29941afd74252064b28e6da921f60f70782ac39e6d1ba12eeb8b484d3a2b3d9e",
    400,
  );
}, 1_800_000);

it("a year in a place drawn from all 56 signs only leases with living payers", () => {
  const draw = drawPlace(seed, "housing-rehouse-left-household");
  playYear(draw.key, draw.seed, 400);
}, 1_800_000);
