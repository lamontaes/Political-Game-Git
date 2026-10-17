import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { gameStartDate } from "./game-start";
import { lawChain } from "./modules/laws";
import { drawPlace } from "../../tests/golden-path/place";
import type { CoreState } from "./types";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  `household-change:${Date.now()}:${Math.random().toString(16).slice(2)}`;
const source = (core: CoreState) => ({
  tag: "ESTIMATED" as const,
  asOf: core.date,
  citation: "A test moves people between households.",
});

// People change household in town, and what the household shares follows them.
it(`moves people between households (seed ${seed})`, () => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "household-change");
    if (moveInPlace(place)) return;
  }
  throw new Error(
    `no drawn place had two households of two adults (seed ${seed})`,
  );
}, 1_800_000);

function moveInPlace(place: ReturnType<typeof drawPlace>): boolean {
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  const lease = (householdId: string) => {
    const row = core.finance.contracts.get(`lease:${householdId}`);
    return row && !row.endedAt ? row : undefined;
  };
  // Full households of the town that pay a lease, with their living plan.
  const homes = [...core.households.values()]
    .filter(
      (h) =>
        h.placeId === town &&
        h.memberIds.every((id) => core.people.get(id)?.alive) &&
        lease(h.id) &&
        core.finance.livingPlans.has(h.id),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const adultsOf = (h: { memberIds: readonly string[] }) =>
    h.memberIds.filter((id) => {
      const born = core.people.get(id)!.birthDate;
      return Number(core.date.slice(0, 4)) - Number(born.slice(0, 4)) >= 20;
    });
  const shared = homes.filter((h) => adultsOf(h).length >= 2);
  const alone = homes.filter((h) => h.memberIds.length === 1);
  if (shared.length < 2) return false;
  const [first, second, third] = shared;
  const mover = adultsOf(first!)[0]!;

  // 1. One member joins another household that has a lease.
  const planBefore = (id: string) =>
    core.finance.livingPlans.get(id)!.monthlyMinor;
  const total = planBefore(first!.id) + planBefore(second!.id);
  const cash = core.people.get(mover)!.liquidMinor;
  api.changeHouseholdV1({
    personIds: [mover],
    householdId: second!.id,
    source: source(core),
  });
  expect(core.people.get(mover)!.householdId).toBe(second!.id);
  expect(core.households.get(second!.id)!.memberIds).toContain(mover);
  expect(core.households.get(first!.id)!.memberIds).not.toContain(mover);
  expect(lease(first!.id)!.payerIds).not.toContain(mover);
  expect(lease(second!.id)!.payerIds).toContain(mover);
  // Their share of the everyday spending moved with them; nothing was lost.
  expect(planBefore(first!.id) + planBefore(second!.id)).toBe(total);
  expect(planBefore(second!.id)).toBeGreaterThan(total / 2 - 1);
  expect(core.people.get(mover)!.liquidMinor).toBe(cash);

  // 2. A member leaves for a household of their own, which has no lease yet.
  if (third) {
    const leaver = adultsOf(third)[0]!;
    api.changeHouseholdV1({
      personIds: [leaver],
      householdId: `household:new:${leaver}`,
      source: source(core),
    });
    expect(core.households.get(`household:new:${leaver}`)!.memberIds).toEqual([
      leaver,
    ]);
    expect(core.people.get(leaver)!.householdId).toBe(
      `household:new:${leaver}`,
    );
    expect(core.finance.livingPlans.has(`household:new:${leaver}`)).toBe(true);
  }

  // 3. A person living alone joins a household: their lease ends, their plan goes.
  const lone = alone.find((h) => h.id !== first!.id && h.id !== second!.id);
  if (lone) {
    api.changeHouseholdV1({
      personIds: [...lone.memberIds],
      householdId: second!.id,
      source: source(core),
    });
    expect(lease(lone.id)).toBeUndefined();
    expect(core.finance.livingPlans.has(lone.id)).toBe(false);
    expect(core.households.get(lone.id)!.memberIds).toEqual([]);
  }

  // Forty more days run: the leases and living plans settle without a fault.
  const invariant = (when: string) => {
    for (const id of [first!.id, second!.id, ...(third ? [third.id] : [])]) {
      const row = lease(id);
      if (!row) continue;
      const members = core.households.get(id)!.memberIds;
      for (const payer of row.payerIds)
        expect(members, `${when}: ${row.id} payer ${payer}`).toContain(payer);
    }
  };
  invariant("right after the moves");
  advanceCore(
    core,
    new Date(Date.parse(`${core.date}T00:00:00Z`) + 40 * 86_400_000)
      .toISOString()
      .slice(0, 10),
  );
  return true;
}
