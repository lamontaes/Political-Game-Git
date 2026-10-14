import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "../simulation/dates";
import { createRenewalCore } from "./births-setup";
import { advanceCore } from "./life";
import { createHealthModule, healthReport } from "./modules/health";
import { residentsRuntime } from "./modules/residents";
import { fillInPerson } from "./state";
import { generatedOpening } from "./tooling/generated-world";

// One random place from all 56, named with its seed in the test title.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "health-fill-in");

function world() {
  const core = createRenewalCore(generatedOpening(place, { twoLevel: true }), {
    modules: [createHealthModule()],
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  return core;
}

describe(`health record for a filled-in resident in ${place.name} (seed ${seed})`, () => {
  it("gives the new full person a stable record, with exposure from the fill-in day", () => {
    const runs = [world(), world()].map((core) => {
      const rt = residentsRuntime(core)!;
      const id = [...rt.householdOfPerson.keys()].sort()[0]!;
      expect(healthReport(core).conditionsByPerson.has(id)).toBe(false);
      const filled = fillInPerson(core, id);
      const fillDate = core.date;
      advanceCore(core, addDays(makeIsoDate(core.date), 3));
      const report = healthReport(core);
      expect(report.conditionsByPerson.has(filled.id)).toBe(true);
      expect(report.resilienceLines.has(filled.id)).toBe(true);
      const found = report.cases.find((row) => row.personId === filled.id);
      if (found) expect(found.onsetDate > fillDate).toBe(true);
      return {
        id,
        conditions: report.conditionsByPerson.get(id),
        line: report.resilienceLines.get(id),
        onset: found?.onsetDate,
      };
    });
    expect(runs[1]).toEqual(runs[0]);
  }, 600_000);
});
