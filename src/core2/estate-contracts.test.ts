/**
 * A mortgage or lease a dead person paid no longer draws their account: the
 * other payers keep it, a living adult at home takes it over, and with no one
 * left it ends after the estate pays what was owed. A drawn place and seed,
 * the two-level town; a town whose sample lacks the household shape a case
 * needs is skipped for another draw, and the case fails naming every town
 * skipped when none of the draws has it. The deaths are made by the test (a year of play rarely
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
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ADULT = 18;
const DRAWS = 25;

/** Open housing contracts whose payers are all living people of one household. */
const housing = (core: CoreState) =>
  [...core.finance.contracts.values()].filter(
    (c) =>
      !c.endedAt &&
      c.householdId &&
      /^(lease|mortgage):/.test(c.id) &&
      c.payerIds.every((id) => core.people.get(id)?.alive),
  );

const adultsAt = (core: CoreState, householdId: string) =>
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

/** Draws towns until one has the household shape the case needs; every town skipped is named. */
function townWith<T>(
  shape: string,
  find: (core: CoreState) => T | undefined,
): { core: CoreState; api: CoreAPI; found: T; where: string } {
  const skipped: string[] = [];
  for (let draw = 0; draw < DRAWS; draw++) {
    const place = drawPlace(`${seed}:${draw}`, "estate-contracts");
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const found = find(core);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    if (found !== undefined) return { core, api: coreAPI(core), found, where };
    skipped.push(where);
  }
  throw new Error(
    `no drawn town has ${shape} in ${DRAWS} draws: ${skipped.join("; ")}`,
  );
}

function die(api: CoreAPI, personId: string) {
  api.updatePerson(personId, { alive: false });
  settleEstate(api, personId, `event:test-death:${personId}`);
}

describe("a dead payer's housing contracts", () => {
  it("the other payers keep it, with a dated record, and the dead person is no longer a payer", () => {
    const {
      core,
      api,
      found: contract,
      where,
    } = townWith("a housing contract with two living payers", (c) =>
      housing(c).find(
        (h) => h.payerIds.length > 1 && adultsAt(c, h.householdId!).length > 1,
      ),
    );
    const [dead, ...others] = contract.payerIds;
    die(api, dead!);
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
  }, 600_000);

  it("a living adult at home takes over a contract the dead person paid alone", () => {
    const { api, found, where } = townWith(
      "a household with two living adults and a housing contract",
      (c) => {
        const open = housing(c);
        // A household where every adult paid: let only the oldest pay, so the
        // hand-over rule has an adult left at home to give it to.
        return (
          open.find(
            (h) =>
              h.payerIds.length === 1 && adultsAt(c, h.householdId!).length > 1,
          ) ??
          open.find(
            (h) =>
              h.payerIds.length > 1 && adultsAt(c, h.householdId!).length > 1,
          )
        );
      },
    );
    const contract = found;
    const core = api.state as CoreState;
    if (contract.payerIds.length > 1)
      contract.payerIds = [adultsAt(core, contract.householdId!)[0]!.id];
    const dead = contract.payerIds[0]!;
    const heir = adultsAt(core, contract.householdId!).find(
      (p) => p.id !== dead,
    )!;
    die(api, dead);
    expect(contract.payerIds, where).toEqual([heir.id]);
    expect(contract.payerHandovers?.at(-1), where).toMatchObject({
      from: dead,
      outcome: "taken-over",
      to: [heir.id],
    });
    expect(contract.endedAt).toBeUndefined();
  }, 600_000);

  it("ends with the estate paying what was owed first when no one is left at home", () => {
    const {
      api,
      found: contract,
      where,
    } = townWith("a housing contract of a one-adult household", (c) =>
      housing(c).find((h) => adultsAt(c, h.householdId!).length === 1),
    );
    const core = api.state as CoreState;
    const dead = adultsAt(core, contract.householdId!)[0]!.id;
    contract.payerIds = [dead];
    contract.arrearsMinor = 12_345;
    const payee =
      core.organizations.get(contract.payeeId) ??
      core.people.get(contract.payeeId);
    const payeeBefore = payee!.liquidMinor;
    const estate = core.people.get(dead)!.liquidMinor;
    die(api, dead);
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
  }, 600_000);
});
