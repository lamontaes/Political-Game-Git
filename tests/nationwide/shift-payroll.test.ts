import { createHash } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import {
  enterLifePath,
  scheduleLifePathSession,
  performLifePathSession,
  lifePaths2Handlers,
} from "../../src/simulation/life-paths2";
import {
  resourceFlowTermsAt,
  resourcePositionAt,
} from "../../src/simulation/resource-queries";
import { money, recordResourceFlowTerms } from "../../src/simulation/resources";
import {
  serializeWorld,
  deserializeWorld,
} from "../../src/simulation/serialization";
import { SeededRng } from "../../src/simulation/rng";
import { advanceWorld } from "../../src/simulation/world";
import { personName } from "../../src/simulation/people";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import { settleTownCompensations } from "../../src/simulation/living-world/town-pay";

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
expect(places.size).toBe(56);
const candidates = [...places.values()].map(([key]) => key);
const rng = new SeededRng("shift-payroll-five-places");
const sampled: string[] = [];
while (sampled.length < 5)
  sampled.push(candidates.splice(rng.integer(0, candidates.length - 1), 1)[0]!);

describe.each(sampled)("completed shift payroll in %s", (placeKey) => {
  it("pays the saved completed work with the same employee/employer books and exact saved world after reopening", () => {
    const seed = `shift-payroll:${placeKey}`;
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
    const work = entered.world.history.workRelationships.at(-1)!;
    const scheduled = scheduleLifePathSession(entered.world, work.id);
    expect(scheduled.ok, scheduled.message).toBe(true);
    const worked = performLifePathSession(
      scheduled.world,
      scheduled.world.history.scheduledActivities.at(-1)!.id,
    );
    expect(worked.ok, worked.message).toBe(true);
    const flow = worked.world.history.resourceFlows.find(
      (row) =>
        row.basisReference.kind === "work" &&
        row.basisReference.workRelationshipId === work.id,
    )!;
    const earned = resourceFlowTermsAt(worked.world, flow.id)!;
    const base = worked.world;
    const owner = { kind: "person" as const, personId };
    const cash = resourcePositionAt(base, owner, earned.amount.currency)!
      .liquidBalance.minorUnits;
    const paid = advanceWorld(base, 1, lifePaths2Handlers());
    const repriced = recordResourceFlowTerms(paid, {
      stableKey: `later-shift-terms:${flow.id}`,
      resourceFlowId: flow.id,
      effectiveAt: paid.currentDate,
      status: "active",
      amount: money(earned.amount.minorUnits * 2, earned.amount.currency),
      cadenceKind: earned.cadenceKind,
      reason:
        "Explicit later contract: completed work keeps its earlier earned terms.",
      provenance: {
        kind: "authored",
        note: "Repricing parity control, not a population wage estimate.",
      },
      supersedesTermsId: earned.id,
    });
    expect(repriced.history.resourceTransferOutcomes).toEqual(
      paid.history.resourceTransferOutcomes,
    );
    const outcome = paid.history.resourceTransferOutcomes.find(
      (row) => row.resourceFlowId === flow.id,
    )!;
    expect(outcome.attemptedAmount).toEqual(earned.amount);
    expect(outcome.transferredAmount).toEqual(earned.amount);
    expect(outcome.status).toBe("completed");
    const due = base.history.futureDueItems.find(
      (row) =>
        row.transitionKey === "life-paths2:pay" &&
        row.entityIds.includes(flow.id),
    )!;
    const completion = base.history.events.find(
      (row) =>
        due.entityIds.includes(row.id) &&
        row.type === "life-paths2.work-session",
    )!;
    expect(outcome.provenance).toEqual({
      kind: "simulated-event",
      eventId: completion.id,
    });
    const payday = addDays(base.currentDate, 1);
    // Explicit payday context tests a later-day recorded contract before settling
    // the actual saved due item. The ordinary clock route is tested above.
    const paydayContext = {
      ...base,
      currentDate: payday,
      currentMoment: simulationMomentOnLocalDate(base.currentMoment, payday),
    };
    const laterContract = recordResourceFlowTerms(paydayContext, {
      stableKey: `next-day-terms:${flow.id}`,
      resourceFlowId: flow.id,
      effectiveAt: payday,
      status: "active",
      amount: money(earned.amount.minorUnits * 2, earned.amount.currency),
      cadenceKind: earned.cadenceKind,
      supersedesTermsId: earned.id,
      reason: "Later-day terms cannot reprice an already completed shift.",
      provenance: {
        kind: "authored",
        note: "Explicit recorded-contract control.",
      },
    });
    const settle = lifePaths2Handlers().get("life-paths2:pay")!;
    const laterPaid = settle(laterContract, due).world;
    const npcPaid = settle(
      { ...laterContract, control: { kind: "observer" } },
      due,
    ).world;
    expect(npcPaid.history).toEqual(laterPaid.history);
    const laterOutcome = laterPaid.history.resourceTransferOutcomes.find(
      (row) => row.resourceFlowId === flow.id,
    )!;
    expect(laterOutcome.attemptedAmount).toEqual(earned.amount);
    expect(laterOutcome.transferredAmount).toEqual(earned.amount);
    expect(laterOutcome.provenance).toEqual(outcome.provenance);
    expect(serializeWorld(deserializeWorld(serializeWorld(laterPaid)))).toBe(
      serializeWorld(laterPaid),
    );
    const period = {
      payFlowId: flow.id,
      activityId: work.id,
      stableKey: outcome.stableKey,
      periodStartsAt: completion.occurredAt,
      periodEndsAt: completion.occurredAt,
      onDate: payday,
      completedShift: {
        eventId: completion.id,
        termsId: earned.id,
        amount: earned.amount,
      },
    };
    expect(settleTownCompensations(laterPaid, [period])).toBe(laterPaid);
    const liabilities = paid.history.statutoryTaxLiabilities!.filter(
      (row) => row.sourceOutcomeId === outcome.id,
    );
    expect(liabilities.some((row) => row.payer.kind === "organization")).toBe(
      true,
    );
    const liabilityIds = new Set(
      liabilities
        .filter((row) => row.payer.kind === "person")
        .map((row) => row.id),
    );
    const withheld = paid.history
      .statutoryTaxPayments!.filter((row) => liabilityIds.has(row.liabilityId))
      .reduce((sum, row) => sum + row.amount.minorUnits, 0);
    expect(
      resourcePositionAt(paid, owner, earned.amount.currency)!.liquidBalance
        .minorUnits - cash,
    ).toBe(earned.amount.minorUnits - withheld);
    const reopened = advanceWorld(
      deserializeWorld(serializeWorld(base)),
      1,
      lifePaths2Handlers(),
    );
    expect(serializeWorld(reopened)).toBe(serializeWorld(paid));
    const repeated = advanceWorld(paid, 1, lifePaths2Handlers());
    expect(
      repeated.history.resourceTransferOutcomes.filter(
        (row) => row.resourceFlowId === flow.id,
      ),
    ).toHaveLength(1);
    const hash = createHash("sha256")
      .update(serializeWorld(paid))
      .digest("hex");
    const receipt = {
      placeKey,
      seed,
      name: personName(paid.people[personId]!),
      hash,
    };
    expect(receipt.name).not.toContain("undefined");
    console.info(JSON.stringify(receipt));
    if (process.env.TEAM3_SHIFT_RECORD)
      appendFileSync(
        process.env.TEAM3_SHIFT_RECORD,
        JSON.stringify(receipt) + "\n",
      );
    if (process.env.TEAM3_SHIFT_COMPARE) {
      const baseline = readFileSync(process.env.TEAM3_SHIFT_COMPARE, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as typeof receipt)
        .find((row) => row.placeKey === placeKey)!;
      expect(baseline, "executed pre-deletion receipt").toBeDefined();
      expect({ placeKey, seed, hash }).toEqual({
        placeKey: baseline.placeKey,
        seed: baseline.seed,
        hash: baseline.hash,
      });
    }
  }, 120_000);
});

it.each(sampled)(
  "rejects a completed-shift claim without saved completed work in %s",
  (placeKey) => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startAge: 30,
      placeKey,
      startingLife: "ordinary-life",
      household: "lives-alone",
      questionnaire: "skipped",
      priors: [],
      seed: `shift-evidence:${placeKey}`,
    });
    const entered = enterLifePath(game.world, "shop-assistant");
    expect(entered.ok, entered.message).toBe(true);
    const work = entered.world.history.workRelationships.at(-1)!;
    const flow = entered.world.history.resourceFlows.find(
      (row) =>
        row.basisReference.kind === "work" &&
        row.basisReference.workRelationshipId === work.id,
    )!;
    const terms = resourceFlowTermsAt(entered.world, flow.id)!;
    expect(() =>
      settleTownCompensations(entered.world, [
        {
          payFlowId: flow.id,
          activityId: work.id,
          stableKey: `invalid-completion:${work.id}`,
          periodStartsAt: entered.world.currentDate,
          periodEndsAt: entered.world.currentDate,
          onDate: entered.world.currentDate,
          completedShift: {
            eventId: work.id,
            termsId: terms.id,
            amount: terms.amount,
          },
        },
      ]),
    ).toThrow("saved work and earned terms");
  },
);
