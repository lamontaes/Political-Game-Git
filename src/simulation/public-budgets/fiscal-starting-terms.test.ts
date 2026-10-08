import { describe, expect, it } from "vitest";
import { stdout } from "node:process";
import startingLaw from "../../../data/research/laws/starting-law-2026/index";
import incomeTables from "../../../data/research/money/state-income-tax-2026.json" with { type: "json" };
import { smallWorld } from "../../../tests/fixtures/small-world";
import { stableHash } from "../ids";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../life-places";
import { placeReferencePopulation } from "../nationwide-world/place-population";
import { playerTown } from "../living-world/town-residents";
import {
  advanceObservedWorld,
  observerSetup,
  openObserverWorld,
} from "../../presentation/observer-world";
import { lawInForce } from "../governing/law-in-force";
import { readFinalEnactedLawTerm } from "../governing/final-law-term-query";
import { createOrganization, createWorkRelationship } from "../life";
import {
  createResourcePosition,
  createWorkCompensation,
  money,
  recordResourceTransferOutcome,
} from "../resources";
import { assessPaychecksTaxes } from "../statutory-tax";
import {
  stateIncomeTaxUnderLaw,
  ADOPT_STATE_INCOME_TAX_QUESTION,
  GRADUATED_STATE_INCOME_TAX_QUESTION,
} from "../state-income-tax-law";
import {
  filingStatusAt,
  payPeriodsPerYear,
  withholdingForPaycheck,
} from "../income-tax-withholding";
import { serializeWorld, deserializeWorld } from "../serialization";
import { budgetCandidates, openGovernmentBudget } from "./opening";
import { openingPaidShare } from "./opening";
import { budgetObligationPayment as pensionPayment } from "./fiscal";
import { BUDGET_LAW_KEYS, BUDGET_PROGRAMS } from "./store";

const PENSION = BUDGET_LAW_KEYS.pensions;
const SEED = "fiscal-starting-terms-new-game";

describe("fiscal numeric starting laws reach the existing writers", () => {
  it("uses the cited full-actuarial term in an actual random opening budget", () => {
    const answers = startingLaw.questions[PENSION].answers as Readonly<
      Record<string, { answer: string }>
    >;
    const eligible = lifePlaceStateIdentities().filter(
      (place) =>
        answers[place.jurisdictionKey]?.answer === "yes" &&
        openingPaidShare(place.jurisdictionKey, "state", place.name).share < 1,
    );
    expect(eligible.length).toBeGreaterThan(1);
    const selected =
      eligible[
        Number.parseInt(stableHash(`${SEED}:pension`).slice(0, 8), 16) %
          eligible.length
      ]!;
    const f = smallWorld({
      place: selected.jurisdictionKey,
      seed: `${SEED}:pension`,
      date: "2026-01-05",
      laws: [PENSION],
    });
    const candidate = budgetCandidates(f.world).candidates.find(
      (row) => row.key === selected.jurisdictionKey,
    )!;
    expect(candidate).toBeDefined();
    const budget = openGovernmentBudget(
      f.world,
      candidate,
      f.world.currentDate,
    );
    if (typeof budget === "string") throw new Error(budget);
    const year = budget.years[0]!;
    const law = lawInForce(
      f.world,
      f.stateJurisdictionId,
      f.propositionIds[PENSION]!,
      f.world.currentDate,
    )!;
    expect(law.origin).toBe("in-force-at-start");
    expect(
      readFinalEnactedLawTerm(f.world, law, {
        questionKey: PENSION,
        termKey: "contribution",
        unit: "ratio",
      })?.value,
    ).toBe(1);
    expect(year.laws.pensions.requiredContributionShare).toBe(1);
    expect(year.laws.pensions.measureId).toBe(law.measureId);
    const required = pensionPayment(
      year.pensionRequired,
      year.pensionShare,
      year.laws.pensions,
    );
    const withoutRequirement = pensionPayment(
      year.pensionRequired,
      year.pensionShare,
      { answer: "no", measureId: null, level: null },
    );
    expect(required).toBeGreaterThan(withoutRequirement);
    const { requiredContributionShare, ...legacyFullRule } = year.laws.pensions;
    expect(required).toBe(
      pensionPayment(year.pensionRequired, year.pensionShare, legacyFullRule),
    );
    expect(
      year.appropriations[BUDGET_PROGRAMS.indexOf("pensionContribution")],
    ).toBe(required);
    stdout.write(
      JSON.stringify({
        seed: `${SEED}:pension`,
        place: selected.jurisdictionKey,
        law: law.measureId,
        pensionRequired: year.pensionRequired,
        requiredContributionShare,
        recordedAppropriation: required,
        withoutRequirement,
        deltaAgainstMainImplicitFullRule: 0,
        proof: "adopted budget, not a completed cash payment",
      }) + "\n",
    );
  });

  it("assesses and collects a controlled recorded paycheck under a random real starting flat rate once", () => {
    const eligible = lifePlaceStateIdentities().filter(
      (place) =>
        (
          incomeTables.places as Readonly<
            Record<string, { wageIncomeTax: string }>
          >
        )[place.jurisdictionKey]?.wageIncomeTax === "flat",
    );
    const selected =
      eligible[
        Number.parseInt(stableHash(`${SEED}:paycheck`).slice(0, 8), 16) %
          eligible.length
      ]!;
    const f = smallWorld({
      place: selected.jurisdictionKey,
      seed: `${SEED}:paycheck`,
      date: "2026-01-05",
      laws: [ADOPT_STATE_INCOME_TAX_QUESTION],
    });
    let world = f.world;
    const law = lawInForce(
      world,
      f.stateJurisdictionId,
      f.propositionIds[ADOPT_STATE_INCOME_TAX_QUESTION]!,
      world.currentDate,
    )!;
    const read = stateIncomeTaxUnderLaw(
      world,
      selected.jurisdictionKey,
      "single",
      world.currentDate,
    );
    expect(law.origin).toBe("in-force-at-start");
    if (read.kind !== "enacted")
      throw new Error(
        "Starting numeric terms did not reach the existing schedule consumer",
      );
    expect(read.lawMeasureIds).toContain(law.measureId);
    const provenance = {
      kind: "authored" as const,
      note: "Controlled recorded paycheck fixture in an actual new game; the law and rate are unmodified researched starting data.",
    };
    world = createOrganization(world, {
      stableKey: `${SEED}:employer`,
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: "Recorded paycheck fixture employer",
        classification: "enterprise:retail",
        locationJurisdictionId: f.stateJurisdictionId,
      },
    });
    const organizationId = world.history.organizations.at(-1)!.id;
    world = createWorkRelationship(world, {
      stableKey: `${SEED}:work`,
      personId: f.personId,
      organizationId,
      startedAt: world.currentDate,
      kind: "employment:employee",
      compensation: "paid",
      authority: "directed",
      dependency: "dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Recorded fixture worker",
        occupationClassification: null,
        locationJurisdictionId: f.stateJurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 40, maximumHours: 40 },
          attention: "moderate",
          concurrency: "mostly-exclusive",
          scheduleRigidity: "rigid",
          interruptibility: "limited",
          locationJurisdictionId: f.stateJurisdictionId,
        },
      },
    });
    world = createWorkCompensation(world, {
      stableKey: `${SEED}:compensation`,
      workRelationshipId: world.history.workRelationships.at(-1)!.id,
      startsAt: world.currentDate,
      amount: money(100_000, "USD"),
      cadenceKind: "schedule:weekly",
      restrictionKind: null,
      jurisdictionId: f.stateJurisdictionId,
      provenance,
    });
    const resourceFlowId = world.history.resourceFlows.at(-1)!.id;
    world = createResourcePosition(world, {
      stableKey: `${SEED}:fixture-cash`,
      owner: { kind: "person", personId: f.personId },
      openedAt: world.currentDate,
      openingBalance: money(0, "USD"),
      provenance,
    });
    world = recordResourceTransferOutcome(world, {
      stableKey: `${SEED}:fixture-paycheck`,
      resourceFlowId,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      occurredAt: world.currentDate,
      status: "completed",
      attemptedAmount: money(100_000, "USD"),
      transferredAmount: money(100_000, "USD"),
      reasonKind: null,
      note: "Controlled actual recorded fixture pay",
      provenance,
    });
    const outcomeId = world.history.resourceTransferOutcomes.at(-1)!.id;
    world = assessPaychecksTaxes(world, [outcomeId]);
    const liability = world.history.statutoryTaxLiabilities!.find(
      (row) =>
        row.sourceOutcomeId === outcomeId &&
        row.authorityKey === selected.jurisdictionKey &&
        row.taxKey.endsWith(":wage-income-tax"),
    )!;
    expect(liability).toBeDefined();
    expect(liability.lawMeasureIds).toContain(law.measureId);
    expect(liability.payer).toEqual({ kind: "person", personId: f.personId });
    expect(liability.liability!.minorUnits).toBe(
      withholdingForPaycheck(100_000, 260, read.schedule).withheldMinor,
    );
    expect(liability.liability!.minorUnits).toBeGreaterThan(0);
    const payments = world.history.statutoryTaxPayments!.filter(
      (row) => row.liabilityId === liability.id,
    );
    expect(payments).toHaveLength(1);
    expect(payments[0]!.amount).toEqual(liability.liability);
    const transfer = world.history.resourceTransferOutcomes.find(
      (row) => row.id === payments[0]!.resourceOutcomeId,
    )!;
    expect(transfer.status).toBe("completed");
    expect(transfer.transferredAmount.minorUnits).toBeGreaterThanOrEqual(
      payments[0]!.amount.minorUnits,
    );
    expect(assessPaychecksTaxes(world, [outcomeId])).toBe(world);
    const restored = deserializeWorld(serializeWorld(world));
    expect(assessPaychecksTaxes(restored, [outcomeId])).toBe(restored);
    expect(restored.history.statutoryTaxLiabilities).toEqual(
      world.history.statutoryTaxLiabilities,
    );
    expect(restored.history.statutoryTaxPayments).toEqual(
      world.history.statutoryTaxPayments,
    );
    stdout.write(
      JSON.stringify({
        seed: `${SEED}:paycheck`,
        place: selected.jurisdictionKey,
        person: f.personId,
        law: law.measureId,
        liabilityId: liability.id,
        paymentId: payments[0]!.id,
        transferId: transfer.id,
        amountMinor: payments[0]!.amount.minorUnits,
      }) + "\n",
    );
  });

  it.each(["flat", "graduated"] as const)(
    "withholds a starting %s tax from native pay in a supported random Begin locality",
    (shape) => {
      const seed = `${SEED}:natural-pay${shape === "flat" ? "" : ":graduated"}`;
      const states = lifePlaceStateIdentities().filter(
        (place) =>
          (
            incomeTables.places as Readonly<
              Record<
                string,
                {
                  wageIncomeTax: string;
                  standardDeductionSingle: number | null;
                }
              >
            >
          )[place.jurisdictionKey]?.wageIncomeTax === shape &&
          (shape === "flat" ||
            (incomeTables.places[
              place.jurisdictionKey as keyof typeof incomeTables.places
            ]?.standardDeductionSingle != null &&
              incomeTables.places[
                place.jurisdictionKey as keyof typeof incomeTables.places
              ]?.brackets[0]?.overSingle === 0)),
      );
      const state =
        states[
          Number.parseInt(stableHash(seed).slice(0, 8), 16) % states.length
        ]!;
      // Bound the physical town size for this changed-file proof, without
      // selecting residents by income, work, age or tax outcome.
      const places = searchLifePlaces("", 5000, {
        stateJurisdictionKey: state.jurisdictionKey,
        scope: "locality",
      }).filter((place) => {
        const population = place.sourceGeoid
          ? placeReferencePopulation(place.sourceGeoid)?.value
          : null;
        return (
          place.context.jurisdiction.kind === "census-place" &&
          population != null &&
          population > 0 &&
          population <= 1000
        );
      });
      expect(places.length).toBeGreaterThan(0);
      const place =
        places[
          Number.parseInt(stableHash(`${seed}:town`).slice(0, 8), 16) %
            places.length
        ]!;
      const setup = observerSetup(seed, place.key);
      const opened = openObserverWorld(setup);
      const homeId =
        opened.world.people[opened.anchorPersonId]!.homeJurisdictionId!;
      const due = opened.world.history.futureDueItems.filter(
        (row) => row.transitionKey === "living-world:payday",
      );
      stdout.write(
        JSON.stringify({
          proof: "native Begin opening",
          seed,
          place: place.key,
          state: state.jurisdictionKey,
          person: opened.anchorPersonId,
          homeId,
          homeKind: opened.world.jurisdictions[homeId]?.kind,
          control: opened.world.control.kind,
          openedAt: opened.world.currentDate,
          paidWorkIds: opened.world.history.workRelationships
            .filter((row) => row.compensation === "paid")
            .slice(0, 10)
            .map((row) => row.id),
          recordedPaidWorkCount: opened.world.history.workRelationships.filter(
            (row) => row.compensation === "paid",
          ).length,
          compensationFlowIds: opened.world.history.resourceFlows
            .filter((row) => row.stableKey.startsWith("town-pay-v2:job-pay:"))
            .map((row) => row.id),
          paydayIds: due.map((row) => row.id),
        }) + "\n",
      );
      expect(opened.world.jurisdictions[homeId]?.kind).toBe("census-place");
      expect(playerTown(opened.world, opened.anchorPersonId)).toBe(homeId);
      expect(due.length).toBeGreaterThan(0);
      const world = advanceObservedWorld(opened.world, 14);
      const nativeFlows = new Set(
        world.history.resourceFlows
          .filter((row) => row.stableKey.startsWith("town-pay-v2:job-pay:"))
          .map((row) => row.id),
      );
      const paychecks = world.history.resourceTransferOutcomes.filter(
        (row) =>
          nativeFlows.has(row.resourceFlowId) &&
          row.status === "completed" &&
          row.transferredAmount.minorUnits > 0,
      );
      const paycheckIds = new Set(paychecks.map((row) => row.id));
      const liabilities = (world.history.statutoryTaxLiabilities ?? []).filter(
        (row) =>
          paycheckIds.has(row.sourceOutcomeId) &&
          row.authorityKey === state.jurisdictionKey &&
          row.taxKey.endsWith(":wage-income-tax") &&
          (row.liability?.minorUnits ?? 0) > 0,
      );
      const liabilityIds = new Set(liabilities.map((row) => row.id));
      const payments = (world.history.statutoryTaxPayments ?? []).filter(
        (row) => liabilityIds.has(row.liabilityId) && row.amount.minorUnits > 0,
      );
      stdout.write(
        JSON.stringify({
          proof: "native ordinary payday",
          seed,
          place: place.key,
          state: state.jurisdictionKey,
          through: world.currentDate,
          paycheckIds: paychecks.map((row) => row.id),
          liabilities: liabilities.map((row) => ({
            id: row.id,
            payer: row.payer,
            sourceOutcomeId: row.sourceOutcomeId,
            amount: row.liability,
            lawMeasureIds: row.lawMeasureIds,
          })),
          payments: payments.map((row) => ({
            id: row.id,
            liabilityId: row.liabilityId,
            transferId: row.resourceOutcomeId,
            amount: row.amount,
          })),
        }) + "\n",
      );
      expect(paychecks.length).toBeGreaterThan(0);
      expect(payments.length).toBeGreaterThan(0);
      const proposition = Object.values(world.policyCatalog.propositions).find(
        (row) => row.stableKey === ADOPT_STATE_INCOME_TAX_QUESTION,
      )!;
      const law = lawInForce(
        world,
        stateJurisdictionForKey(state.jurisdictionKey)!.id,
        proposition.id,
        world.currentDate,
      )!;
      expect(law.origin).toBe("in-force-at-start");
      const read = stateIncomeTaxUnderLaw(
        world,
        state.jurisdictionKey,
        "single",
        world.currentDate,
      );
      if (read.kind !== "enacted")
        throw new Error(
          "Production starting terms did not reach the native payroll consumer",
        );
      expect(read.shape).toBe(shape);
      if (shape === "graduated") {
        const source =
          incomeTables.places[
            state.jurisdictionKey as keyof typeof incomeTables.places
          ];
        expect(read.schedule.standardDeductionMinor).toBe(
          source.standardDeductionSingle! * 100,
        );
        expect(read.schedule.brackets).toEqual(
          source.brackets.map((bracket) => ({
            overMinor: bracket.overSingle * 100,
            rateBasisPoints: Math.round(bracket.ratePercent * 100),
          })),
        );
      }
      for (const liability of liabilities) {
        expect(liability.lawMeasureIds).toContain(law.measureId);
        if (shape === "graduated") {
          expect(liability.lawMeasureIds).toContain(
            `starting-law:${state.jurisdictionKey}:${GRADUATED_STATE_INCOME_TAX_QUESTION}`,
          );
          if (liability.payer.kind !== "person")
            throw new Error("Native wage payer is not a person");
          const paycheck = paychecks.find(
            (row) => row.id === liability.sourceOutcomeId,
          )!;
          const payerRead = stateIncomeTaxUnderLaw(
            world,
            state.jurisdictionKey,
            filingStatusAt(world, liability.payer.personId),
            liability.occurredAt,
          );
          if (payerRead.kind !== "enacted")
            throw new Error(
              "Recorded starting schedule missing for native payer",
            );
          expect(liability.liability!.minorUnits).toBe(
            withholdingForPaycheck(
              liability.wages.minorUnits,
              payPeriodsPerYear(paycheck),
              payerRead.schedule,
            ).withheldMinor,
          );
        }
      }
      for (const payment of payments) {
        const transfer = world.history.resourceTransferOutcomes.find(
          (row) => row.id === payment.resourceOutcomeId,
        )!;
        expect(transfer.status).toBe("completed");
        expect(transfer.transferredAmount.minorUnits).toBeGreaterThanOrEqual(
          payment.amount.minorUnits,
        );
      }
      expect(
        assessPaychecksTaxes(
          world,
          paychecks.map((row) => row.id),
        ),
      ).toBe(world);
      const restored = deserializeWorld(serializeWorld(world));
      expect(restored.history.statutoryTaxLiabilities).toEqual(
        world.history.statutoryTaxLiabilities,
      );
      expect(restored.history.statutoryTaxPayments).toEqual(
        world.history.statutoryTaxPayments,
      );
      expect(
        assessPaychecksTaxes(
          restored,
          paychecks.map((row) => row.id),
        ),
      ).toBe(restored);
    },
  );
});
