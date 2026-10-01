import { afterEach, describe, expect, it, vi } from "vitest";
import * as effects from "./enacted-law-effects";
import {
  enactedTaxFixture,
  TEST_TAX_TERMS,
} from "../../tests/fixtures/tax-policy-fixture";
import { advanceWorld } from "./world";
import { daysBetween } from "./dates";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import { declarePersonalTaxOccurrence } from "../presentation/tax-work";
import { assessTaxBase } from "./tax-policy";
import { assessPaychecksTaxes } from "./statutory-tax";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { observerPlace } from "../presentation/observer-world";
import { enterLifePath } from "./life-paths2";
import {
  createResourceFlow,
  createResourcePosition,
  recordResourceTransferOutcome,
  money,
} from "./resources";
import { resourcePositionAt } from "./resource-queries";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { World } from "./types";
import type { LawConsequenceContext } from "./law-consequence-types";

afterEach(() => vi.restoreAllMocks());

describe("saved tax activities enter K1 through canonical identities", () => {
  it("dispatches only committed assessment/payment rows and never recollects after Save/Continue", () => {
    const observed: { world: World; context: LawConsequenceContext }[] = [];
    vi.spyOn(effects, "applyLawConsequences").mockImplementation(
      (world, context) => {
        observed.push({ world, context });
        return world;
      },
    );
    const fixture = enactedTaxFixture();
    let world = advanceWorld(
      fixture.world,
      daysBetween(
        fixture.world.currentDate,
        fixture.world.history.taxPolicies![0]!.effectiveAt,
      ),
      createCampaignElectionTransitionRegistry(),
    );
    observed.length = 0;
    world = declarePersonalTaxOccurrence(world, {
      personId: fixture.personId,
      stableKey: "k1-tax:occurrence",
      proposalId: fixture.proposalId,
      baseKey: TEST_TAX_TERMS.baseKey,
      amountMinorUnits: 2100,
      assumptionNote:
        "Explicit fictional test occurrence, no additional income inferred.",
    });
    const assessment = world.history.taxAssessments!.at(-1)!;
    expect(observed).toHaveLength(1);
    expect(observed[0]!.context).toEqual({
      onDate: assessment.recordedAt,
      activity: "assessment",
      activityId: assessment.id,
      subjectIds: [fixture.personId],
      governingLawId: world.history.taxProposals![0]!.measureId,
    });
    expect(observed[0]!.world.history.taxAssessments).toContain(assessment);
    expect(
      observed[0]!.world.history.futureDueItems.some((row) =>
        row.entityIds.includes(assessment.id),
      ),
    ).toBe(true);
    expect(
      assessTaxBase(world, assessment.baseId, TEST_TAX_TERMS.seriesKey),
    ).toBe(world);
    expect(observed).toHaveLength(1);
    world = advanceWorld(
      deserializeWorld(serializeWorld(world)),
      TEST_TAX_TERMS.collectionLagDays,
      createCampaignElectionTransitionRegistry(),
    );
    const collection = world.history.taxCollections!.at(-1)!;
    const payment = observed.filter(
      (row) => row.context.activity === "payment",
    );
    expect(payment).toHaveLength(1);
    expect(payment[0]!.context.activityId).toBe(collection.resourceOutcomeId);
    expect(payment[0]!.context.subjectIds).toEqual([
      fixture.personId,
      world.history.taxProposals![0]!.publicOrganizationId,
    ]);
    expect(payment[0]!.world.history.taxCollections).toContainEqual(collection);
    expect(
      payment[0]!.world.history.resourceTransferOutcomes.some(
        (row) =>
          row.id === collection.resourceOutcomeId &&
          row.transferredAmount.minorUnits === 100,
      ),
    ).toBe(true);
    observed.length = 0;
    world = advanceWorld(
      deserializeWorld(serializeWorld(world)),
      1,
      createCampaignElectionTransitionRegistry(),
    );
    expect(world.history.taxCollections).toHaveLength(1);
    expect(
      observed.filter(
        (row) =>
          row.context.activity === "assessment" ||
          row.context.activity === "payment",
      ),
    ).toHaveLength(0);
  });
  it("bulk and single payroll retain committed activity order, named subjects and repeat safety", () => {
    const seed = "k1-tax-payroll-activity";
    const place = observerPlace(seed);
    let world = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 30,
      startingLife: "ordinary-life",
      household: "lives-alone",
      questionnaire: "skipped",
    }).world;
    const entered = enterLifePath(world, "shop-assistant");
    expect(
      entered.ok,
      `${place.displayName} (${seed}): ${entered.message}`,
    ).toBe(true);
    world = entered.world;
    const work = world.history.workRelationships.at(-1)!;
    const owner = { kind: "person" as const, personId: work.personId };
    if (!resourcePositionAt(world, owner, money(0, "USD").currency))
      world = createResourcePosition(world, {
        stableKey: "k1-payroll:cash",
        owner,
        openedAt: world.currentDate,
        openingBalance: money(0, "USD"),
        provenance: {
          kind: "authored",
          note: "Explicit zero fixture opening; pay transfers provide cash.",
        },
      });
    const payIds = [];
    for (let at = 0; at < 2; at += 1) {
      world = createResourceFlow(world, {
        stableKey: `k1-payroll:flow:${at}`,
        source: { kind: "organization", organizationId: work.organizationId! },
        recipient: owner,
        startsAt: world.currentDate,
        amount: money(5000, "USD"),
        cadenceKind: "schedule:one-time",
        basisKind: "compensation:work",
        basisReference: { kind: "work", workRelationshipId: work.id },
        restrictionKind: null,
        jurisdictionId: null,
        provenance: {
          kind: "authored",
          note: "Explicit paycheck fixture for the saved work relationship.",
        },
      });
      world = recordResourceTransferOutcome(world, {
        stableKey: `k1-payroll:paid:${at}`,
        resourceFlowId: world.history.resourceFlows.at(-1)!.id,
        periodStartsAt: world.currentDate,
        periodEndsAt: world.currentDate,
        occurredAt: world.currentDate,
        attemptedAmount: money(5000, "USD"),
        transferredAmount: money(5000, "USD"),
        status: "completed",
        reasonKind: null,
        note: "Explicit saved fixture paycheck.",
        provenance: { kind: "authored", note: "Explicit fixture payment." },
      });
      payIds.push(world.history.resourceTransferOutcomes.at(-1)!.id);
    }
    const calls: LawConsequenceContext[] = [];
    vi.spyOn(effects, "applyLawConsequences").mockImplementation(
      (saved, context) => {
        if (context.activity === "assessment") {
          const row = saved.history.statutoryTaxLiabilities!.find(
            (row) => row.id === context.activityId,
          );
          expect(row).toBeDefined();
          expect(context.subjectIds).toEqual([
            row!.payer.kind === "person"
              ? row!.payer.personId
              : row!.payer.kind === "household"
                ? row!.payer.householdId
                : row!.payer.organizationId,
          ]);
        } else if (context.activity === "payment") {
          expect(
            saved.history.statutoryTaxPayments!.some(
              (row) => row.resourceOutcomeId === context.activityId,
            ),
          ).toBe(true);
          expect(context.subjectIds[0]).toBe(work.personId);
        }
        calls.push(context);
        return saved;
      },
    );
    const single = payIds.reduce(
      (next, id) => assessPaychecksTaxes(next, [id]),
      world,
    );
    const singleCalls = [...calls];
    calls.length = 0;
    const bulk = assessPaychecksTaxes(world, payIds);
    expect(serializeWorld(bulk)).toBe(serializeWorld(single));
    expect(calls).toEqual(singleCalls);
    expect(calls.some((row) => row.activity === "payment")).toBe(true);
    calls.length = 0;
    const saved = deserializeWorld(serializeWorld(bulk));
    expect(assessPaychecksTaxes(saved, payIds)).toBe(saved);
    expect(calls).toHaveLength(0);
  });
});
