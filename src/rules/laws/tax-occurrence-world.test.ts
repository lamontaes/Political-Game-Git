import { addDays, simulationMomentOnLocalDate } from "../../simulation/dates";
import {
  resourcePositionAt,
  resourceFlowTermsAt,
} from "../../simulation/resource-queries";
import { withholdTo } from "./withholding-plan";
import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  createOrganization,
  createWorkRelationship,
} from "../../simulation/life";
import { organizationProfileAt } from "../../simulation/life-queries";
import {
  createResourcePosition,
  createWorkCompensation,
  money,
  recordResourceTransferOutcome,
} from "../../simulation/resources";
import { assessPaychecksTaxes } from "../../simulation/statutory-tax";
import { recordPaycheckTaxBases } from "../../simulation/paycheck-tax-bases";
import * as native from "../../simulation/tax-policy";
import { stateJurisdictionForKey } from "../../simulation/life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../../simulation/national-election-geography";
import {
  FIRST_VERIFIED_TAX_YEAR,
  FEDERAL_EMPLOYMENT_RULES,
  isTerritory,
} from "../../simulation/statutory-tax-rules";
import type { World, EntityId, HistoricalCutoff } from "../../simulation/types";
import {
  taxBaseOccurrenceSource,
  recordedPaycheckTaxInput,
  taxBaseMatchesOccurrenceSource,
  taxEntityAvailableAt,
  accountReceiptKey,
  type TaxOccurrenceFacts,
} from "./tax-occurrence";
import {
  federalCoverageGap,
  wagesPaidEarlierThisYear,
  type PayrollFacts,
} from "./payroll-records";
import { taxableWages, taxAt } from "./statutory-payroll";
function paidFixture(place: string, actualMinor = 18999000) {
  const f = smallWorld({
    place,
    seed: `a33-bases:${place}`,
    date: "2026-01-05",
  });
  let world = f.world;
  const provenance = {
    kind: "authored" as const,
    note: "Controlled partial-pay fixture, not a natural wage or employer.",
  };
  world = createOrganization(world, {
    stableKey: "a33-bases:employer",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Controlled employer",
      classification: "enterprise:retail",
      locationJurisdictionId: f.jurisdictionId,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: "a33-bases:work",
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
      title: "Controlled worker",
      occupationClassification: null,
      locationJurisdictionId: f.jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 20, maximumHours: 20 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: f.jurisdictionId,
      },
    },
  });
  world = createWorkCompensation(world, {
    stableKey: "a33-bases:pay",
    workRelationshipId: world.history.workRelationships.at(-1)!.id,
    startsAt: world.currentDate,
    amount: money(19000000, "USD"),
    cadenceKind: "schedule:weekly",
    restrictionKind: null,
    jurisdictionId: f.jurisdictionId,
    provenance,
  });
  const resourceFlowId = world.history.resourceFlows.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: "a33-bases:worker-cash",
    owner: { kind: "person", personId: f.personId },
    openedAt: world.currentDate,
    openingBalance: money(0, "USD"),
    provenance,
  });
  world = recordResourceTransferOutcome(world, {
    stableKey: "a33-bases:actual-pay",
    resourceFlowId,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: actualMinor > 0 ? "partial" : "missed",
    attemptedAmount: money(19000000, "USD"),
    transferredAmount: money(actualMinor, "USD"),
    reasonKind: "custom:controlled-partial-pay",
    note: "Only actually transferred wages form the base.",
    provenance,
  });
  const outcomeId = world.history.resourceTransferOutcomes.at(-1)!.id;
  return { world: assessPaychecksTaxes(world, [outcomeId]), outcomeId, f };
}
function occurrenceFacts(
  world: World,
  cutoffs: readonly HistoricalCutoff[],
): TaxOccurrenceFacts {
  const accounts = new Map<string, { organizationId: EntityId } | null>();
  for (const id of world.jurisdictionOrder)
    for (const cutoff of cutoffs)
      accounts.set(
        accountReceiptKey(id, cutoff),
        native.publicTaxAccountForJurisdiction(world, id, cutoff),
      );
  return {
    onDate: world.currentDate,
    nextSequence: world.history.nextSequence,
    federalId: NATIONAL_ELECTION_JURISDICTION.id,
    people: world.people,
    jurisdictions: world.jurisdictions,
    events: world.history.events,
    resourceTransferOutcomes: world.history.resourceTransferOutcomes,
    resourceFlows: world.history.resourceFlows,
    workRelationships: world.history.workRelationships,
    statutoryTaxLiabilities: world.history.statutoryTaxLiabilities ?? [],
    statutoryTaxPayments: world.history.statutoryTaxPayments ?? [],
    taxProposals: world.history.taxProposals ?? [],
    taxPolicies: world.history.taxPolicies ?? [],
    taxBases: world.history.taxBases ?? [],
    taxAssessments: world.history.taxAssessments ?? [],
    taxCollections: world.history.taxCollections ?? [],
    stateJurisdictions: new Map(
      Object.keys(STATES).map((key) => [
        "US-" + key,
        stateJurisdictionForKey("US-" + key)!,
      ]),
    ),
    accounts,
  };
}
describe("laws: native paid-occurrence caller and payroll guards", () => {
  it.each(Object.keys(STATES))(
    "matches real recorders and saved chronology in %s",
    (usps) => {
      const first = paidFixture("US-" + usps);
      const original = first.world.history.resourceTransferOutcomes.find(
        (r) => r.id === first.outcomeId,
      )!;
      if (
        first.world.history.resourceFlows.find(
          (r) => r.id === original.resourceFlowId,
        )!.basisReference.kind !== "work"
      )
        throw Error("Missing native work basis.");
      const laterDate = addDays(first.world.currentDate, 7);
      const withSecondFlow = {
        ...first.world,
        currentDate: laterDate,
        currentMoment: simulationMomentOnLocalDate(
          first.world.currentMoment,
          laterDate,
        ),
      };
      const second = recordResourceTransferOutcome(withSecondFlow, {
        stableKey: "rules2:second-pay",
        resourceFlowId: original.resourceFlowId,
        periodStartsAt: withSecondFlow.currentDate,
        periodEndsAt: withSecondFlow.currentDate,
        occurredAt: withSecondFlow.currentDate,
        status: "partial",
        attemptedAmount: money(19000000, "USD"),
        transferredAmount: money(3600, "USD"),
        reasonKind: "custom:authored-partial-payment",
        note: "Second saved payment tests cumulative payroll.",
        provenance: {
          kind: "authored",
          note: "Controlled native paid-occurrence proof.",
        },
      });
      const outcomeId = second.history.resourceTransferOutcomes.at(-1)!.id;
      const f = {
        ...first,
        world: assessPaychecksTaxes(second, [outcomeId]),
        outcomeId,
      };
      const world = recordPaycheckTaxBases(f.world, [f.outcomeId]);
      const now = {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      };
      const cutoffs = [
        now,
        ...(world.history.taxBases ?? []).map((row) => ({
          asOfDate: row.recordedAt,
          historySequenceExclusive: row.sequence,
        })),
      ];
      const facts = occurrenceFacts(world, cutoffs);
      expect(recordedPaycheckTaxInput(facts, f.outcomeId)).toEqual(
        native.recordedPaycheckTaxInput(world, f.outcomeId),
      );
      for (const id of [
        f.outcomeId,
        ...world.history.events.map((r) => r.id),
        ...(world.history.statutoryTaxLiabilities ?? []).map((r) => r.id),
        ...(world.history.statutoryTaxPayments ?? []).map(
          (r) => r.resourceOutcomeId,
        ),
      ])
        for (const cutoff of cutoffs)
          expect(taxBaseOccurrenceSource(facts, id, cutoff)).toEqual(
            native.taxBaseOccurrenceSource(world, id, cutoff),
          );
      for (const row of world.history.taxBases ?? []) {
        const cutoff = {
          asOfDate: row.recordedAt,
          historySequenceExclusive: row.sequence,
        };
        const source = taxBaseOccurrenceSource(
          facts,
          row.sourceEventId,
          cutoff,
        )!;
        expect(taxBaseMatchesOccurrenceSource(row, source)).toBe(true);
        expect(
          taxBaseMatchesOccurrenceSource(
            { ...row, sequence: source.sequence },
            source,
          ),
        ).toBe(false);
      }
      for (const rows of [
        world.history.taxBases ?? [],
        world.history.statutoryTaxLiabilities ?? [],
        world.history.statutoryTaxPayments ?? [],
      ])
        for (const row of rows)
          for (const seq of [
            row.sequence,
            row.sequence + 1,
            world.history.nextSequence,
          ])
            expect(
              taxEntityAvailableAt(facts, row.id, world.currentDate, seq),
            ).toEqual(
              native.taxEntityAvailableAt(
                world,
                row.id,
                world.currentDate,
                seq,
              ),
            );
      const flow = world.history.resourceFlows.find(
        (r) =>
          r.id ===
          world.history.resourceTransferOutcomes.find(
            (r) => r.id === f.outcomeId,
          )!.resourceFlowId,
      )!;
      const outcome = world.history.resourceTransferOutcomes.find(
        (r) => r.id === f.outcomeId,
      )!;
      const payroll: PayrollFacts = {
        firstVerifiedTaxYear: FIRST_VERIFIED_TAX_YEAR,
        territoryKeys: new Set(
          Object.keys(STATES)
            .map((k) => "US-" + k)
            .filter(isTerritory),
        ),
        profiles: new Map(
          world.history.organizations.map((o) => [
            o.id,
            organizationProfileAt(world, o.id),
          ]),
        ),
        flows: world.history.resourceFlows,
        transfers: world.history.resourceTransferOutcomes,
      };
      for (const heldFlow of world.history.resourceFlows.filter(
        (r) => r.basisKind === "custom:tax-withholding",
      )) {
        if (
          heldFlow.source.kind !== "person" ||
          heldFlow.recipient.kind !== "organization"
        )
          throw Error("Native withholding endpoints missing.");
        const paymentOutcome = world.history.resourceTransferOutcomes.find(
          (r) => r.resourceFlowId === heldFlow.id,
        )!;
        const allocated = world.history.statutoryTaxPayments!.filter(
          (r) => r.resourceOutcomeId === paymentOutcome.id,
        );
        // The group/order comes from the public assessment's liability record sequence, not from own computed allocation.
        const authority =
          heldFlow.jurisdictionId === NATIONAL_ELECTION_JURISDICTION.id
            ? "US"
            : "US-" + usps;
        const sourcePay = heldFlow.stableKey.includes(f.outcomeId)
          ? outcome
          : world.history.resourceTransferOutcomes.find(
              (r) => r.id === first.outcomeId,
            )!;
        const withheld = world.history.statutoryTaxLiabilities!.filter(
          (r) =>
            r.sourceOutcomeId === sourcePay.id &&
            r.authorityKey === authority &&
            r.collection === "withheld-from-pay" &&
            r.liability !== null &&
            r.liability.minorUnits > 0,
        );
        const available =
          resourcePositionAt(
            world,
            heldFlow.source,
            paymentOutcome.transferredAmount.currency,
            {
              asOfDate: world.currentDate,
              historySequenceExclusive: heldFlow.sequence,
            },
          )?.liquidBalance.minorUnits ?? 0;
        const plan = withholdTo(
          {
            onDate: heldFlow.startsAt,
            federalId: NATIONAL_ELECTION_JURISDICTION.id,
            accountOrganizationId: heldFlow.recipient.organizationId,
            availableMinor: available,
          },
          heldFlow.source.personId,
          sourcePay,
          withheld,
          authority === "US" ? null : heldFlow.jurisdictionId,
          heldFlow.stableKey,
        )!;
        const heldTerms = resourceFlowTermsAt(world, heldFlow.id)!;
        expect({
          ...heldFlow,
          amount: heldTerms.amount,
          cadenceKind: heldTerms.cadenceKind,
        }).toMatchObject(plan.flow);
        expect(paymentOutcome).toMatchObject(plan.transfer);
        expect(
          allocated.map(({ stableKey, liabilityId, method, amount }) => ({
            stableKey,
            liabilityId,
            method,
            amount,
          })),
        ).toEqual(plan.payments);
      }
      const gap = federalCoverageGap(payroll, flow.source, "US-" + usps, 2026);
      const prior = gap
        ? 0
        : wagesPaidEarlierThisYear(payroll, flow, outcome, 2026);
      for (const rule of FEDERAL_EMPLOYMENT_RULES) {
        const row = world.history.statutoryTaxLiabilities!.find(
          (r) => r.sourceOutcomeId === f.outcomeId && r.taxKey === rule.taxKey,
        )!;
        if (gap) expect(row.researchQuestionId).toBe(gap);
        else {
          const taxable = taxableWages(
            rule,
            prior,
            outcome.transferredAmount.minorUnits,
          );
          expect(row.taxableAmount).toEqual(money(taxable, "USD"));
          expect(row.liability).toEqual(
            money(taxAt(taxable, rule.rateBasisPoints), "USD"),
          );
        }
      }
    },
  );
});
