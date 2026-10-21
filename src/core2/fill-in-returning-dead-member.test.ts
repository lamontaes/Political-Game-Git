import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { createLifeCore } from "./life";
import { isDemoted } from "./counted-groups";
import { demoteHousehold } from "./modules/counted-demotion";
import { removeCountedPerson, residentsRuntime } from "./modules/residents";
import { coreAPI, fillInPerson } from "./state";
import { generatedOpening } from "./tooling/generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "fill-in-returning-dead-member");

describe(`a household returned to the counts, where a member then died, ${place.name} (seed ${seed})`, () => {
  it("comes back with the living members, the dead one left in the record", () => {
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
    // A counted household of two or more, none of them in the player's circle.
    const store = rt.store;
    const record = [...store.liveHouseholds()]
      .map((h) => ({
        householdId: h.id,
        ids: store.countedMembers(h).map((m) => store.ids[m]!),
      }))
      .find(
        (row) => row.ids.length >= 2 && row.ids.every((id) => !circle.has(id)),
      );
    expect(record, `${place.name}; seed ${seed}`).toBeDefined();
    const [first, second] = record!.ids;
    const householdId = record!.householdId;
    fillInPerson(core, first!);
    // The household returns to the counts, and a member dies there: the
    // counted record drops them while their full record is still on file.
    demoteHousehold(api, householdId, core.date);
    removeCountedPerson(core, second!);
    expect(isDemoted(core.people.get(first!)!), `${householdId}`).toBe(true);
    const back = fillInPerson(core, first!);
    expect(isDemoted(back), `${place.name}; seed ${seed}`).toBe(false);
    expect(core.households.get(householdId)!.memberIds).toContain(first);
    // Whoever the record still held comes back to town with the household.
    for (const id of core.households.get(householdId)!.memberIds)
      if (core.people.get(id)?.alive)
        expect(isDemoted(core.people.get(id)!), id).toBe(false);
  }, 600_000);
});
