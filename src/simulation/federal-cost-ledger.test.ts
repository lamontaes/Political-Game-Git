import { advanceWorld } from "./world";
import { observerPlace } from "../presentation/observer-world";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import {
  introduceMeasure,
  recordEnactment,
  measurePosition,
  availableMeasureSteps,
} from "./legislation";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "./congress-rule-pack";
import { seatedCongressChamber } from "./governing/congress-chambers";
import { chamberByKey } from "./legislature-rules";
import {
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "./legislation-scenarios";
import { applyLegislativeStep } from "../presentation/legislation-session";
import { federalProgramCostsForMonth } from "./federal-cost-ledger";
import { EXPAND_PASSENGER_RAIL_QUESTION } from "./federal-passenger-rail";
import { isLawEffectStamp } from "./law-effect-stamp";
import { makeIsoDate } from "./dates";
import {
  FEDERAL_OUTLAYS,
  openFederalTreasury,
  settleFederalTreasuryMonth,
} from "./public-budgets/federal-treasury";
import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { addDays } from "./dates";
import { currentPresidentOf } from "./crisis/offices";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import { createOrganization } from "./life";
import { resourcePositionAt } from "./resource-queries";
import { createResourcePosition, money, makeCurrencyCode } from "./resources";
import {
  ensurePublicGovernmentAccount,
  publicOrganizationKey,
  publicTaxAccountForJurisdiction,
} from "./tax-policy";
import type { World } from "./types";
import {
  commitPublicProgram,
  declareProgramCapacity,
  programAppropriations,
  programInstallments,
  recordProgramAppropriation,
  settleProgramInstallment,
} from "./governing/public-program";
import { programOperatorOrganization } from "./governing/program-governing";
import { FIXTURE, cash } from "./../../tests/fixtures/public-program-fixture";

const PROGRAM_KEY = "passenger-rail:us";
const PAYMENT = money(100_000_00, "USD");

const seenStates = new Set<string>();
const places: { seed: string; place: ReturnType<typeof observerPlace> }[] = [];
for (let n = 0; places.length < 5 && n < 100; n += 1) {
  const seed = `team1-rail-paid-cost-${n}`;
  const place = observerPlace(seed);
  if (!place.stateJurisdictionKey || seenStates.has(place.stateJurisdictionKey))
    continue;
  seenStates.add(place.stateJurisdictionKey);
  places.push({ seed, place });
}

describe("actual federal program costs on the Treasury", () => {
  it.each(places)(
    "$seed: pays and stamps rail authority observed from $place.displayName",
    ({ seed, place }) => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey: place.key,
          startAge: 34,
          depth: "summarize-earlier-life",
        }),
      ).game;
      if (!game) throw new Error("Expected an ordinary opening life.");

      let world = ensureNationalElectionJurisdiction(game.world);
      const proposition = Object.values(world.policyCatalog.propositions).find(
        (p) => p.stableKey === EXPAND_PASSENGER_RAIL_QUESTION,
      )!;
      // Controlled legal passage, with explicitly authored test ballots.
      // This does not prove ordinary sponsor selection or voting behavior.
      world = introduceMeasure(world, {
        stableKey: "test:rail-cost:measure",
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        rulePackId: US_CONGRESS_PACK_ID,
        designation: "H.R. TEST",
        shortTitle: "Controlled rail payment authority",
        summary: "Fixture appropriation authority, not natural passage.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: "house",
        sponsorPersonId: null,
        propositionIds: [proposition.id],
        propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
      });
      const measure = world.history.legislativeMeasures!.at(-1)!;
      const bodies = US_CONGRESS_RULE_PACK.chamberOrder.map((key) => {
        const seated = seatedCongressChamber(world, key);
        if (!seated) throw new Error("Expected the actual seated Congress.");
        return seated.body;
      });
      const votePlan: Record<string, { yea: number }> = {};
      for (const key of US_CONGRESS_RULE_PACK.chamberOrder) {
        const chamber = chamberByKey(US_CONGRESS_RULE_PACK, key);
        for (const committee of chamber.committees)
          votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
            yea: committee.appointedMembers ?? 1,
          };
        for (const stage of chamber.floorStages)
          votePlan[votePlanKeyForFloor(key, stage.stageKey)] = {
            yea: bodies.find((b) => b.chamberKey === key)!.members.length,
          };
      }
      const procedure = {
        pack: US_CONGRESS_RULE_PACK,
        measureId: measure.id,
        bodies,
        committeeMemberCount: null,
        votePlan,
        governorAction: "signed" as const,
        governorRationale: "Explicit controlled payment-authority fixture.",
      };
      for (
        let stepNumber = 0;
        stepNumber < 45 &&
        measurePosition(world, measure.id).phase !== "awaiting-enactment";
        stepNumber++
      ) {
        const step = availableMeasureSteps(world, measure.id).find(
          (s) => s !== "offer-amendment",
        );
        if (!step)
          throw new Error("No legal controlled enactment step remains.");
        world = applyLegislativeStep(procedure, world, step).world;
      }
      world = recordEnactment(world, {
        stableKey: "test:rail-cost:enactment",
        measureId: measure.id,
        effectiveAt: world.currentDate,
      });
      const president = currentPresidentOf(world);
      if (!president) throw new Error("Expected a sitting President.");
      const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
      const publicOrganizationId = publicOrganizationKey(jurisdictionId);
      if (
        !world.history.organizations.some(
          (record) => record.stableKey === publicOrganizationId,
        )
      )
        world = createOrganization(world, {
          stableKey: publicOrganizationId,
          formedAt: world.currentDate,
          provenance: { kind: "authored", note: FIXTURE.note },
          initialProfile: {
            name: "Federal public government",
            classification: "sector:government",
            locationJurisdictionId: jurisdictionId,
          },
        });
      const publicGovernment = world.history.organizations.find(
        (record) => record.stableKey === publicOrganizationId,
      )!;
      if (
        !resourcePositionAt(
          world,
          { kind: "organization", organizationId: publicGovernment.id },
          makeCurrencyCode("USD"),
        )
      )
        world = createResourcePosition(world, {
          stableKey: `${publicOrganizationId}:modeled-receipts:USD`,
          owner: { kind: "organization", organizationId: publicGovernment.id },
          openedAt: world.currentDate,
          openingBalance: money(150_000_00, "USD"),
          provenance: { kind: "authored", note: FIXTURE.note },
        });
      world = ensurePublicGovernmentAccount(world, {
        kind: "jurisdiction",
        jurisdictionId,
      });
      const startingGovernmentCash = cash(world, publicGovernment.id);
      const account = publicTaxAccountForJurisdiction(world, jurisdictionId);
      expect(account?.organizationId).toBe(publicGovernment.id);
      if (!account) throw new Error("Expected the federal public account.");

      world = declareProgramCapacity(world, {
        edition: "federal-outlay-metric",
        programKey: PROGRAM_KEY,
        jurisdictionId,
        serviceLabel: "Passenger rail service",
        unitLabel: "service units",
        unitsTotal: 1,
        unitsOperational: 0,
        monthlyOperatingNeed: money(1, "USD"),
        completedPermille: null,
        restorationCostPerUnit: PAYMENT,
        basis: FIXTURE,
      }).world;
      const written = recordProgramAppropriation(world, {
        edition: "federal-outlay-metric",
        programKey: PROGRAM_KEY,
        jurisdictionId,
        accountOrganizationId: account.organizationId,
        amount: money(150_000_00, "USD"),
        sourceMeasureId: measure.id,
        availableFrom: world.currentDate,
        availableThrough: addDays(world.currentDate, 30),
        basis: FIXTURE,
      });
      world = written.world;
      const appropriation = programAppropriations(world, PROGRAM_KEY).find(
        (record) => record.id === written.id,
      );
      if (!appropriation)
        throw new Error("The federal appropriation is missing.");

      const operator = programOperatorOrganization(
        world,
        PROGRAM_KEY,
        jurisdictionId,
      );
      world = operator.world;
      const dueAt = addDays(world.currentDate, 1);
      const committed = commitPublicProgram(world, {
        appropriationId: appropriation.id,
        alternative: {
          key: "federal-one-day-outlay-proof",
          title: "One federal service payment",
          installments: [
            { afterDays: 1, amount: PAYMENT, purpose: "maintenance" },
          ],
          deliveryLeadDays: 1,
        },
        personId: president.personId,
        office: { kind: "federal-executive" },
        recipientOrganizationId: operator.organizationId,
      });
      expect(committed.ok).toBe(true);
      if (!committed.ok) throw new Error(committed.reason);

      const beforePayment = committed.world;
      const month = makeIsoDate(`${dueAt.slice(0, 7)}-01`);
      const opened = openFederalTreasury(month);
      const unpaid = settleFederalTreasuryMonth(
        beforePayment,
        opened,
        month,
      ).months.at(-1)!;
      expect(federalProgramCostsForMonth(beforePayment, month)).toEqual([]);
      world = advanceWorld(
        beforePayment,
        1,
        createCampaignElectionTransitionRegistry(),
      );
      const installment = programInstallments(world, PROGRAM_KEY).find(
        (record) => record.commitmentId === committed.recordId,
      );
      expect(installment).toMatchObject({
        status: "posted",
        recordedAt: dueAt,
      });
      if (!installment) throw new Error("The federal payment did not post.");
      const metricId = Object.values(world.metricCatalog.definitions).find(
        (definition) => definition.stableKey === "government.outlays",
      )?.id;
      expect(metricId).toBeDefined();
      const metric = world.history.metricStates.find(
        (record) => record.metricId === metricId,
      );
      expect(metric).toMatchObject({
        scope: { jurisdictionId, segmentKey: null },
        referencePeriod: { kind: "interval", startsAt: dueAt, endsAt: dueAt },
        value: { kind: "money", money: PAYMENT },
        provenance: {
          kind: "simulated",
          sourceEntityIds: [installment.eventId],
        },
      });
      expect(cash(world, account.organizationId)).toBe(
        startingGovernmentCash - PAYMENT.minorUnits,
      );
      expect(cash(world, operator.organizationId)).toBe(PAYMENT.minorUnits);

      const paid = settleFederalTreasuryMonth(world, opened, month).months.at(
        -1,
      )!;
      const costs = federalProgramCostsForMonth(world, month);
      expect(costs).toHaveLength(1);
      expect(costs[0]).toMatchObject({
        sourceMeasureId: measure.id,
        programKey: PROGRAM_KEY,
        paidAt: dueAt,
        amountMinorUnits: PAYMENT.minorUnits,
        questionKey: EXPAND_PASSENGER_RAIL_QUESTION,
      });
      expect(costs[0]!.lawEffectStamps).toHaveLength(1);
      expect(isLawEffectStamp(costs[0]!.lawEffectStamps[0])).toBe(true);
      expect(costs[0]!.sourceRecordIds).toContain(installment.id);
      const transportation = FEDERAL_OUTLAYS.indexOf("transportation");
      expect(
        paid.outlays[transportation]! - unpaid.outlays[transportation]!,
      ).toBe(PAYMENT.minorUnits / 100);
      expect(paid.deficit - unpaid.deficit).toBe(PAYMENT.minorUnits / 100);
      expect(paid.debtHeldByPublic - unpaid.debtHeldByPublic).toBe(
        PAYMENT.minorUnits / 100,
      );
      expect(paid.programCosts).toEqual(costs);
      const reloaded = JSON.parse(JSON.stringify(world)) as World;
      expect(federalProgramCostsForMonth(reloaded, month)).toEqual(costs);
      expect(
        federalProgramCostsForMonth(world, makeIsoDate("2030-01-01")),
      ).toEqual([]);
      expect(
        settleProgramInstallment(world, committed.recordId, 0).world.history
          .resourceTransferOutcomes,
      ).toEqual(world.history.resourceTransferOutcomes);
    },
  );
});
