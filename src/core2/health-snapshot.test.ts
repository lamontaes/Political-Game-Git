import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import { createHealthModule, healthReport } from "./modules/health";
import { restoreWorld, snapshotWorld, uncoveredModules } from "./snapshot";
import { generatedOpening } from "./tooling/generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "health-snapshot");

describe(`health restore in ${place.name}, seed ${seed}`, () => {
  it("restores the existing records before the next day and continues identically", () => {
    setBookkeeping(false);
    const input = generatedOpening(place, {
      twoLevel: true,
      settings: { population: 1500 },
    });
    const build = () =>
      createLifeCore(input, { modules: [createHealthModule()] });
    const original = build();
    advanceCore(original, addDays(makeIsoDate(original.date), 31));
    const before = healthReport(original);
    expect(before.conditionsByPerson.size).toBeGreaterThan(0);
    expect(before.resilienceLines.size).toBeGreaterThan(0);
    const saved = JSON.parse(JSON.stringify(snapshotWorld(original)));
    const loaded = build();
    restoreWorld(loaded, saved);
    // Do not let a first-day reinitialization conceal missing saved records.
    expect(healthReport(loaded)).toEqual(before);
    expect(uncoveredModules(loaded)).not.toContain(createHealthModule().id);
    const until = addDays(makeIsoDate(original.date), 62);
    advanceCore(original, until);
    advanceCore(loaded, until);
    expect(healthReport(loaded)).toEqual(healthReport(original));
    const deaths = (core: typeof original) =>
      [...core.durableLog.values()].filter(
        (event) => event.kind === "life.death",
      );
    expect(deaths(loaded)).toEqual(deaths(original));
  }, 600_000);
});
