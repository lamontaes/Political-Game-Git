import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { createLifeCore } from "./life";
import { isDemoted } from "./counted-groups";
import { demoteHousehold } from "./modules/counted-demotion";
import {
  addCountedPerson,
  residentPerson,
  residentsRuntime,
} from "./modules/residents";
import { coreAPI, fillInPerson } from "./state";
import { generatedOpening } from "./tooling/generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "fill-in-returning-newborn");

describe(`a household returned to the counts gains a baby, ${place.name} (seed ${seed})`, () => {
  it("fills in the whole household on the next meeting, the baby included", () => {
    const core = createLifeCore(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
    );
    const api = coreAPI(core);
    const rt = residentsRuntime(core)!;
    const player = core.playerId ? core.people.get(core.playerId) : undefined;
    const circle = new Set([
      ...(player?.familyIds ?? []),
      ...(player?.knownIds ?? []),
    ]);
    const record = [...rt.households.values()].find(
      (row) =>
        row.people.length >= 2 && row.people.every((p) => !circle.has(p.id)),
    )!;
    expect(record, `${place.name}; seed ${seed}`).toBeDefined();
    const ids = record.people.map((p) => p.id);
    const householdId = record.household.id;
    fillInPerson(core, ids[0]!);
    demoteHousehold(api, householdId, core.date);
    expect(isDemoted(core.people.get(ids[0]!)!)).toBe(true);
    // A baby is born into the household while it is in the counts.
    const parent = residentPerson(core, ids[0]!)!;
    const baby = {
      ...parent,
      id: `person:newborn:${householdId}`,
      givenName: "Newborn",
      birthDate: core.date,
      jobId: undefined,
      familyIds: [ids[0]!],
      knownIds: [],
      liquidMinor: 0,
    };
    addCountedPerson(core, householdId, baby as never);
    expect(residentPerson(core, baby.id)).toBeDefined();
    // The next meeting brings back the household and the baby with it.
    const back = fillInPerson(core, ids[0]!);
    expect(isDemoted(back)).toBe(false);
    expect(core.people.get(baby.id), `${householdId}`).toBeDefined();
    expect(core.households.get(householdId)!.memberIds).toContain(baby.id);
    expect(residentPerson(core, baby.id)).toBeUndefined();
  }, 600_000);
});
