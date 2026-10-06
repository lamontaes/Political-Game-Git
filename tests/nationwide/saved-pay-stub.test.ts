import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import { describeRoutineOutcome } from "../../src/presentation/routine-outcome";
import {
  enterLifePath,
  performLifePathSession,
  scheduleLifePathSession,
  lifePaths2Handlers,
} from "../../src/simulation/life-paths2";
import { recordedPayStubs } from "../../src/simulation/resource-income";
import { resourcePositionAt } from "../../src/simulation/resource-queries";
import {
  money,
  recordResourceTransferOutcome,
} from "../../src/simulation/resources";
import { assessPaycheckTaxes } from "../../src/simulation/statutory-tax";
import {
  serializeWorld,
  deserializeWorld,
} from "../../src/simulation/serialization";
import { SeededRng } from "../../src/simulation/rng";
import { advanceWorld } from "../../src/simulation/world";
import { personName } from "../../src/simulation/people";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";

const places = new Map<string, [string, number]>();
for (const pair of PLACE_POPULATION_ROWS.split(";")) {
  const [key, count] = pair.split(":") as [string, string];
  const state = key.slice(0, 2);
  if ((places.get(state)?.[1] ?? -1) < Number(count))
    places.set(state, [key, Number(count)]);
}
places.set("15", ["1571550", 0]);
places.set("72", ["7276770", 0]);
for (const [key, , usps] of TERRITORY_PLACE_ROWS)
  if (!places.has(usps)) places.set(usps, [key, 0]);
const candidates = [...places.values()].map(([key]) => key);
const rng = new SeededRng("saved-pay-stub-five-places");
const sampled: string[] = [];
while (sampled.length < 5)
  sampled.push(candidates.splice(rng.integer(0, candidates.length - 1), 1)[0]!);

describe.each(sampled)("saved pay stub in %s", (placeKey) => {
  it("reconciles actual employee payments and the displayed starting taxes, preserves unknowns/partial pay, and never posts money", () => {
    const seed = `saved-pay-stub:${placeKey}`;
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startAge: 30,
      placeKey,
      startingLife: "ordinary-life",
      household: "lives-alone",
      questionnaire: "skipped",
      priors: [],
      seed,
    });
    const personId = game.playerPersonId;
    const entered = enterLifePath(game.world, "shop-assistant");
    expect(entered.ok, entered.message).toBe(true);
    const scheduled = scheduleLifePathSession(
      entered.world,
      entered.world.history.workRelationships.at(-1)!.id,
    );
    expect(scheduled.ok, scheduled.message).toBe(true);
    const worked = performLifePathSession(
      scheduled.world,
      scheduled.world.history.scheduledActivities.at(-1)!.id,
    );
    expect(worked.ok, worked.message).toBe(true);
    const before = worked.world;
    const paid = advanceWorld(before, 1, lifePaths2Handlers());
    const saved = serializeWorld(paid);
    const stubs = recordedPayStubs(paid, personId);
    expect(stubs).toHaveLength(1);
    const stub = stubs[0]!;
    expect(stub.taxes.length).toBeGreaterThan(0);
    const liabilityIds = new Set(stub.taxes.map((row) => row.liability.id));
    const actualPayments = paid.history.statutoryTaxPayments!.filter((row) =>
      liabilityIds.has(row.liabilityId),
    );
    expect(stub.withheld.minorUnits).toBe(
      actualPayments.reduce((sum, row) => sum + row.amount.minorUnits, 0),
    );
    expect(
      stub.taxes.every(
        (row) =>
          row.liability.payer.kind === "person" &&
          row.liability.payer.personId === personId,
      ),
    ).toBe(true);
    const owner = { kind: "person" as const, personId };
    const cashBefore = resourcePositionAt(
      before,
      owner,
      money(0, "USD").currency,
    )!.liquidBalance.minorUnits;
    const cashAfter = resourcePositionAt(paid, owner, money(0, "USD").currency)!
      .liquidBalance.minorUnits;
    expect(stub.netPaid.minorUnits).toBe(cashAfter - cashBefore);
    const notice = describeRoutineOutcome(before, paid, personId);
    expect(notice).toContain("Paycheck: gross ");
    const federal = stub.taxes.find(
      (row) => row.liability.taxKey === "us-federal:income-tax-withholding",
    )!;
    const state = stub.taxes.find((row) =>
      row.liability.taxKey.endsWith(":wage-income-tax"),
    )!;
    expect(federal).toBeDefined();
    expect(state).toBeDefined();
    expect(notice).toContain(
      federal.liability.liability === null
        ? "Federal income tax not priced"
        : "Federal income tax withheld",
    );
    expect(notice).toContain(
      state.liability.liability === null
        ? "State income tax not priced"
        : state.liability.status === "not-imposed"
          ? "State income tax not imposed"
          : "State income tax withheld",
    );
    for (const row of stub.taxes.filter(
      (tax) => tax.liability.liability === null,
    ))
      expect(row.liability.liability).toBeNull();
    expect(describeRoutineOutcome(paid, paid, personId)).not.toContain(
      "Paycheck:",
    );
    expect(serializeWorld(paid)).toBe(saved);
    const reopened = deserializeWorld(saved);
    expect(recordedPayStubs(reopened, personId)).toEqual(stubs);
    expect(describeRoutineOutcome(before, reopened, personId)).toBe(
      describeRoutineOutcome(before, paid, personId),
    );

    // Actual canonical transfer/payment controls, not advertised earnings or
    // assumed full tax collections: a partial paycheck and an unassessed one.
    const flow = before.history.resourceFlows.find(
      (row) => row.id === stub.paycheck.resourceFlowId,
    )!;
    const partial = recordResourceTransferOutcome(before, {
      stableKey: "fixture:partial-pay-stub",
      resourceFlowId: flow.id,
      periodStartsAt: before.currentDate,
      periodEndsAt: before.currentDate,
      occurredAt: before.currentDate,
      status: "partial",
      attemptedAmount: stub.promisedGross,
      transferredAmount: money(
        Math.floor(stub.promisedGross.minorUnits / 2),
        stub.promisedGross.currency,
      ),
      reasonKind: "custom:fixture-partial-pay",
      note: "Authored partial-payment projection control.",
      provenance: {
        kind: "authored",
        note: "Actual partial-transfer control.",
      },
    });
    const assessedPartial = assessPaycheckTaxes(
      partial,
      partial.history.resourceTransferOutcomes.at(-1)!.id,
    );
    const partialStub = recordedPayStubs(assessedPartial, personId)[0]!;
    expect(partialStub.paidGross.minorUnits).toBeLessThan(
      partialStub.promisedGross.minorUnits,
    );
    expect(partialStub.netPaid.minorUnits).toBe(
      partialStub.paidGross.minorUnits - partialStub.withheld.minorUnits,
    );
    expect(describeRoutineOutcome(before, assessedPartial, personId)).toContain(
      "gross received",
    );
    const unassessed = recordedPayStubs(partial, personId)[0]!;
    expect(unassessed.assessmentStatus).toBe("not-recorded");
    expect(describeRoutineOutcome(before, partial, personId)).toContain(
      "withholding assessment not recorded",
    );
    console.log(
      JSON.stringify({
        placeKey,
        seed,
        person: personName(paid.people[personId]!),
        personId,
        paycheckId: stub.paycheck.id,
        grossMinor: stub.paidGross.minorUnits,
        withheldMinor: stub.withheld.minorUnits,
        netMinor: stub.netPaid.minorUnits,
        notice,
      }),
    );
  }, 120000);
});
