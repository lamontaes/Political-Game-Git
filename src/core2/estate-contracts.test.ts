/**
 * A mortgage or lease a dead person paid no longer draws their account: the
 * other payers keep it, a living adult at home takes it over, and with no one
 * left it ends after the estate pays what was owed. A drawn place and seed,
 * the two-level town. The deaths are made by the test (a year of play rarely
 * kills a payer of a housing contract in a small town), through the same
 * writers the health engine uses: the person is marked dead and the estate is
 * settled.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { settleEstate } from "./estates";
import { gameStartDate } from "./game-start";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const SHAPE_DRAWS = 25;
let place = drawPlace(seed, "estate-contracts");
let core: CoreState;
let api: ReturnType<typeof coreAPI>;
let where = "";
const skipped: string[] = [];
const ADULT = 18;

const adultsAt = (householdId: string) =>
  (core.households.get(householdId)?.memberIds ?? [])
    .map((id) => core.people.get(id)!)
    .filter(
      (p) =>
        p.alive &&
        ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(core.date)) >= ADULT,
    )
    .sort(
      (a, b) =>
        a.birthDate.localeCompare(b.birthDate) || a.id.localeCompare(b.id),
    );

/** Open housing contracts whose payers are all living people of one household. */
const housing = () =>
  [...core.finance.contracts.values()].filter(
    (c) =>
      !c.endedAt &&
      c.householdId &&
      /^(lease|mortgage):/.test(c.id) &&
      c.payerIds.every((id) => core.people.get(id)?.alive),
  );

/** The town has a lease two adults pay and a household of one adult with a contract. */
function hasShapes(): boolean {
  return (
    housing().some(
      (c) => c.payerIds.length > 1 && adultsAt(c.householdId!).length > 1,
    ) && housing().some((c) => adultsAt(c.householdId!).length === 1)
  );
}

// The drawn town may lack a household shape a case needs (a small island
// town with no two-payer lease): draw on, naming every town passed over, and
// fail only when none of the draws has them all.
for (let draw = 0; draw < SHAPE_DRAWS; draw += 1) {
  place = drawPlace(draw ? `${seed}:${draw}` : seed, "estate-contracts");
  const built = buildBenchWorld(place.seed, gameStartDate(), {
    placeKey: place.key,
    twoLevel: true,
  });
  core = built.core;
  api = coreAPI(core);
  where = `${place.name} (${place.key}), seed ${seed}${draw ? `, draw ${draw}` : ""}`;
  if (hasShapes()) break;
  skipped.push(`${place.name} (${place.key})`);
  if (draw === SHAPE_DRAWS - 1)
    throw new Error(
      `no drawn town has a two-payer lease and a one-adult household (seed ${seed}): ${skipped.join("; ")}`,
    );
}
function die(personId: string) {
  api.updatePerson(personId, { alive: false });
  settleEstate(api, personId, `event:test-death:${personId}`);
}

describe(`a dead payer's housing contracts in ${place.name}`, () => {
  it("the other payers keep it, with a dated record, and the dead person is no longer a payer", () => {
    const contract = housing().find(
      (c) => c.payerIds.length > 1 && adultsAt(c.householdId!).length > 1,
    );
    if (!contract)
      throw new Error(`${where}: no housing contract with two living payers`);
    const [dead, ...others] = contract.payerIds;
    die(dead!);
    expect(contract.payerIds, where).toEqual(others);
    expect(contract.payerHandovers?.at(-1), where).toMatchObject({
      from: dead,
      outcome: "kept-by-co-payers",
      to: others,
    });
    expect(contract.endedAt).toBeUndefined();
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    expect(contract.payerIds, `${where}: still only the living`).toEqual(
      others,
    );
    // Forty days of a large town is more than the default 30 seconds.
  }, 300_000);

  it("a living adult at home takes over a contract the dead person paid alone", () => {
    const contract =
      housing().find(
        (c) => c.payerIds.length === 1 && adultsAt(c.householdId!).length > 1,
      ) ??
      // A household where every adult paid: let only the oldest pay, so the
      // hand-over rule has an adult left at home to give it to.
      (() => {
        const found = housing().find(
          (c) => c.payerIds.length > 1 && adultsAt(c.householdId!).length > 1,
        );
        if (!found)
          throw new Error(`${where}: no household with two living adults`);
        found.payerIds = [adultsAt(found.householdId!)[0]!.id];
        return found;
      })();
    const dead = contract.payerIds[0]!;
    const heir = adultsAt(contract.householdId!).find((p) => p.id !== dead)!;
    die(dead);
    expect(contract.payerIds, where).toEqual([heir.id]);
    expect(contract.payerHandovers?.at(-1), where).toMatchObject({
      from: dead,
      outcome: "taken-over",
      to: [heir.id],
    });
    expect(contract.endedAt).toBeUndefined();
  });

  it("ends with the estate paying what was owed first when no one is left at home", () => {
    const contract = housing().find(
      (c) => adultsAt(c.householdId!).length === 1,
    );
    if (!contract)
      throw new Error(`${where}: no housing contract of a one-adult household`);
    const dead = adultsAt(contract.householdId!)[0]!.id;
    contract.payerIds = [dead];
    contract.arrearsMinor = 12_345;
    const payee =
      core.organizations.get(contract.payeeId) ??
      core.people.get(contract.payeeId);
    const payeeBefore = payee!.liquidMinor;
    const estate = core.people.get(dead)!.liquidMinor;
    die(dead);
    expect(contract.endedAt, where).toBe(core.date);
    expect(contract.payerHandovers?.at(-1), where).toMatchObject({
      from: dead,
      outcome: "ended",
    });
    const paid = Math.min(12_345, estate);
    expect(12_345 - contract.arrearsMinor, `${where}: arrears paid`).toBe(paid);
    expect(payee!.liquidMinor - payeeBefore, `${where}: payee received`).toBe(
      paid,
    );
  });
});
