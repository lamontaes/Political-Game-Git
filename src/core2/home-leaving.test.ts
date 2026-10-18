import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { advanceCore } from "./life";
import { coreAPI, registerModule } from "./state";
import { gameStartDate } from "./game-start";
import {
  leftHomeOf,
  PARTNERSHIPS_MODULE_ID,
  partnershipsModule,
} from "./modules/partnerships";
import { drawPlace } from "../../tests/golden-path/place";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  `home-leaving:${Date.now()}:${Math.random().toString(16).slice(2)}`;

// A young adult leaves a parent's home when their age, pay and cash allow it.
it(`a young adult leaves a parent's home for one of their own (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "home-leaving");
    tried.push(place.name);
    const { core } = buildBenchWorld(seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    // Installed here until the played world's people list carries it (pool
    // item words-install-partnerships-module); a no-op once it does.
    if (!core.modules.has(PARTNERSHIPS_MODULE_ID))
      registerModule(core, partnershipsModule);
    const api = coreAPI(core);
    // Live month by month until someone leaves, and look at them that day.
    let left = leftHomeOf(api)[0];
    const start = Date.parse(`${gameStartDate()}T00:00:00Z`);
    for (let month = 1; !left && month <= 12; month += 1) {
      advanceCore(
        core,
        new Date(start + month * 31 * 86_400_000).toISOString().slice(0, 10),
      );
      left = leftHomeOf(api)[0];
    }
    if (!left) continue;
    const person = core.people.get(left.personId)!;
    const home = core.households.get(left.householdId)!;
    // They live in a household of their own, in the home they leased.
    expect(person.householdId, left.id).toBe(left.householdId);
    expect(home.memberIds).toEqual([left.personId]);
    expect(core.households.get(left.fromHouseholdId)!.memberIds).not.toContain(
      left.personId,
    );
    const lease = core.finance.contracts.get(left.leaseId!);
    expect(lease?.amountMinor, `${left.id}: lease`).toBe(left.rentMinor);
    expect(lease?.householdId).toBe(left.householdId);
    expect(lease?.payerIds).toEqual([left.personId]);
    // Why: what pulled them out and what held them back, from their records.
    expect(Object.keys(left.reasons)).toEqual(
      expect.arrayContaining([
        "baseline",
        "age",
        "means",
        "hold:kin",
        "hold:rent",
      ]),
    );
    return;
  }
  throw new Error(
    `no one left a parent's home in ${tried.join(", ")} (seed ${seed})`,
  );
}, 1_800_000);
