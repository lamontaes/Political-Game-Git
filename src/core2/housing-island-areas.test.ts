/**
 * An island area's homes start from its own 2020 Census figures, not the
 * nation's (SG-WORLD-housing-island-areas): the owned share of its homes
 * follows the island's tenure. Each of the four island areas is built in a
 * locality drawn from it; set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import housingData from "./data/housing/housing.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { placeLocalities } from "./places";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it.each(["AS", "GU", "MP", "VI"])(
  "%s: the share of homes owned matches the island's Census tenure",
  (usps) => {
    const localities = [...placeLocalities(`US-${usps}`)].sort((a, b) =>
      a.key.localeCompare(b.key),
    );
    expect(localities.length, usps).toBeGreaterThan(0);
    const pick =
      localities[Number(`0x${seed.slice(0, 4)}`) % localities.length]!;
    const where = `${pick.displayName} (${pick.key}), seed ${seed}`;
    const { core } = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: pick.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const rows = coreAPI(core)
      .moduleState("housing")
      .table("dwellings")
      .rows() as unknown as { tenure: string }[];
    expect(rows.length, where).toBeGreaterThan(0);
    const owned =
      rows.filter((row) => row.tenure === "own").length / rows.length;
    const [homes, owners] = (
      housingData.islandAreas.places as Record<string, { tenure: number[] }>
    )[usps]!.tenure as [number, number];
    expect(
      Math.abs(owned - owners / homes),
      `${where}: owned ${owned}`,
    ).toBeLessThan(0.05);
  },
  900_000,
);
