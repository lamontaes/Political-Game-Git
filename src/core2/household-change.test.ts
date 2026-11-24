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
const DRAWS = 8;

/** The town's full households that pay a lease and carry a living plan. */
function world(placeKey: string) {
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  const lease = (householdId: string) => {
    const row = core.finance.contracts.get(`lease:${householdId}`);
    return row && !row.endedAt ? row : undefined;
  };
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
  const planOf = (id: string) => core.finance.livingPlans.get(id)!.monthlyMinor;
  // Every lease payer is a member of the household that pays it.
  const payersAreMembers = (when: string, ids: readonly string[]) => {
    for (const id of ids) {
      const row = lease(id);
      if (!row) continue;
      const members = core.households.get(id)?.memberIds ?? [];
      for (const payer of row.payerIds)
        expect(members, `${when}: ${row.id} payer ${payer}`).toContain(payer);
    }
  };
  const runForty = () =>
    advanceCore(
      core,
      new Date(Date.parse(`${core.date}T00:00:00Z`) + 40 * 86_400_000)
        .toISOString()
        .slice(0, 10),
    );
  return {
    core,
    api,
    lease,
    homes,
    adultsOf,
    planOf,
    payersAreMembers,
    runForty,
    shared: homes.filter((h) => adultsOf(h).length >= 2),
    alone: homes.filter((h) => h.memberIds.length === 1),
  };
}

/** Draw places until one has the households the case needs; fail if none does. */
function drawWorld<T>(
  label: string,
  needs: (w: ReturnType<typeof world>) => T | undefined,
): { w: ReturnType<typeof world>; found: T } {
  for (let attempt = 0; attempt < DRAWS; attempt += 1) {
    const place = drawPlace(`${seed}:${label}:${attempt}`, "household-change");
    const w = world(place.key);
    const found = needs(w);
    if (found !== undefined) return { w, found };
  }
  throw new Error(
    `${label}: no drawn place had the households this case needs in ${DRAWS} draws (seed ${seed})`,
  );
}

// People change household in town, and what the household shares follows them.
// Each case is required: a world without the households it needs is a failure,
// not a pass, and each runs forty more days with the payer rule checked after.
it(`a member joins another household that has a lease (seed ${seed})`, () => {
  const { w, found } = drawWorld("join", (x) =>
    x.shared.length >= 2 ? x.shared.slice(0, 2) : undefined,
  );
  const [first, second] = found as [
    (typeof w.shared)[number],
    (typeof w.shared)[number],
  ];
  const mover = w.adultsOf(first)[0]!;
  const before = { first: w.planOf(first.id), second: w.planOf(second.id) };
  const cash = w.core.people.get(mover)!.liquidMinor;
  w.api.changeHouseholdV1({
    personIds: [mover],
    householdId: second.id,
    source: source(w.core),
  });
  expect(w.core.people.get(mover)!.householdId).toBe(second.id);
  expect(w.core.households.get(second.id)!.memberIds).toContain(mover);
  expect(w.core.households.get(first.id)!.memberIds).not.toContain(mover);
  expect(w.lease(first.id)!.payerIds).not.toContain(mover);
  expect(w.lease(second.id)!.payerIds).toContain(mover);
  // Their share of the everyday spending moved with them; nothing was lost.
  const lost = before.first - w.planOf(first.id);
  const gained = w.planOf(second.id) - before.second;
  expect(lost).toBeGreaterThan(0);
  expect(gained).toBe(lost);
  expect(w.core.people.get(mover)!.liquidMinor).toBe(cash);
  w.payersAreMembers("right after the move", [first.id, second.id]);
  w.runForty();
  w.payersAreMembers("forty days later", [first.id, second.id]);
}, 1_800_000);

it(`a member leaves for a household of their own, which has no lease yet (seed ${seed})`, () => {
  const { w, found } = drawWorld("split", (x) => x.shared[0]);
  const home = found;
  const leaver = w.adultsOf(home)[0]!;
  const newId = `household:new:${leaver}`;
  w.api.changeHouseholdV1({
    personIds: [leaver],
    householdId: newId,
    source: source(w.core),
  });
  expect(w.core.households.get(newId)!.memberIds).toEqual([leaver]);
  expect(w.core.people.get(leaver)!.householdId).toBe(newId);
  expect(w.core.finance.livingPlans.has(newId)).toBe(true);
  expect(w.lease(home.id)!.payerIds).not.toContain(leaver);
  w.payersAreMembers("right after the split", [home.id, newId]);
  w.runForty();
  w.payersAreMembers("forty days later", [home.id, newId]);
}, 1_800_000);

it(`a person living alone joins a household: their lease ends and their plan goes (seed ${seed})`, () => {
  const { w, found } = drawWorld("alone", (x) => {
    const lone = x.alone[0];
    const host = x.shared.find((h) => h.id !== lone?.id);
    return lone && host ? { lone, host } : undefined;
  });
  const { lone, host } = found;
  w.api.changeHouseholdV1({
    personIds: [...lone.memberIds],
    householdId: host.id,
    source: source(w.core),
  });
  expect(w.lease(lone.id)).toBeUndefined();
  expect(w.core.finance.livingPlans.has(lone.id)).toBe(false);
  expect(w.core.households.get(lone.id)!.memberIds).toEqual([]);
  for (const id of lone.memberIds)
    expect(w.core.people.get(id)!.householdId).toBe(host.id);
  w.payersAreMembers("right after the join", [host.id]);
  w.runForty();
  w.payersAreMembers("forty days later", [host.id]);
}, 1_800_000);
