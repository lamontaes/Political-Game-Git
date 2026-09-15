import { beforeAll, describe, expect, it } from "vitest";
import {
  endSuppliedSeat,
  suppliedLegislativeSeat,
} from "../../tests/fixtures/supplied-legislative-seat";
import { TEST_TAX_TERMS } from "../../tests/fixtures/tax-policy-fixture";
import { CAREER_PROVIDERS } from "./career-path7-provider";
import {
  applyLegislativeCommand,
  recordedInstitutionalStepRequiresWait,
  resolveLegislativeAssignmentForMeasure,
} from "./legislation-world";
import {
  ALASKA_RECORDED_SITTING,
  ALASKA_REVENUE_RECORDED_SITTING,
  prepareRecordedLegislativeSitting,
} from "./legislative-authored-sitting";
import { passOrdinaryDays } from "./ordinary-life";
import { publishLegislativeTransition } from "./publish-legislative-transition";
import {
  declarePersonalTaxOccurrence,
  fileTaxProposalFromOffice,
} from "./tax-work";
import {
  cancelTransitImplementation,
  fileTransitAppropriation,
  projectTransitWork,
  publishTransitReport,
  requestTransitFromOffice,
  transitOffice,
} from "./transit-work";
import {
  performCareerWork,
  respondCareerOffer,
  seekCareerOffer,
  startCareerWork,
} from "../simulation/career-path7";
import { daysBetween, makeIsoDate } from "../simulation/dates";
import {
  availableMeasureSteps,
  measurePosition,
} from "../simulation/legislation";
import { resourcePositionAt } from "../simulation/resource-queries";
import { money } from "../simulation/resources";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import {
  createTaxTransitionHandlerRegistry,
  publicTaxAccountForJurisdiction,
} from "../simulation/tax-policy";
import { advanceWorld, assertWorldIntegrity } from "../simulation/world";
import type { EntityId, World } from "../simulation/types";

// One supplied Alaska House seat, labeled as a supplied office scenario: it
// exercises governing, not ordinary candidacy. Everything after the seat uses
// ordinary player actions and the ordinary clock: earned pay, both recorded
// sittings, enactment, the tax's own effective date, a declared occurrence,
// collection, request, due settlement and publication. No cash is seeded.

const USD = money(0, "USD").currency;
const LONG = 300_000;

function enactThroughSitting(
  world: World,
  measureId: EntityId,
  personId: EntityId,
): World {
  const input = { measureId, playerPersonId: personId };
  let next = prepareRecordedLegislativeSitting(world, {
    ...input,
    playerBallot: "yea",
  });
  for (
    let guard = 0;
    guard < 40 && measurePosition(next, measureId).phase !== "enacted";
    guard++
  ) {
    const step = availableMeasureSteps(next, measureId).find(
      (key) => key !== "offer-amendment",
    );
    if (!step)
      throw new Error(
        `No supported step at ${measurePosition(next, measureId).phase}.`,
      );
    const entry = resolveLegislativeAssignmentForMeasure(next, input);
    if (entry.kind !== "available") throw new Error(entry.reason);
    const kind = recordedInstitutionalStepRequiresWait(
      next,
      entry.assignment,
      step,
    )
      ? "await-institutional-record"
      : "take-step";
    next = publishLegislativeTransition(
      next,
      applyLegislativeCommand(next, entry.assignment, { kind, step }).world,
    );
  }
  expect(measurePosition(next, measureId).outcome).toBe("enacted");
  return next;
}

function cash(
  world: World,
  owner:
    | { readonly kind: "person"; readonly personId: EntityId }
    | { readonly kind: "organization"; readonly organizationId: EntityId },
) {
  return (
    resourcePositionAt(world, owner, USD)?.liquidBalance.minorUnits ?? null
  );
}
const payments = (world: World) =>
  world.history.resourceFlows.filter(
    (flow) => flow.basisReference.kind === "public-funding",
  );

interface Funded {
  readonly world: World;
  readonly personId: EntityId;
  readonly transitMeasureId: EntityId;
  readonly publicOrganizationId: EntityId;
}

/** Builds one life up to "both laws operative" and declares `occurrences`
 * collected taxes, each $101.00 of public receipts. */
function fundedLife(occurrences: 1 | 2): Funded {
  const seat = suppliedLegislativeSeat("US-AK", "house");
  const personId = seat.personId;
  // The acquired Alaska tax-power baseline is dated 2026-09-06; filing waits
  // for the next regular session rather than backdating the power.
  let world = advanceWorld(
    seat.world,
    daysBetween(seat.world.currentDate, makeIsoDate("2027-02-01")),
    createTaxTransitionHandlerRegistry(),
  );
  // The member has no recorded money; ordinary shop work is the only source.
  expect(cash(world, { kind: "person", personId })).toBeNull();
  const provider = CAREER_PROVIDERS.find(
    (entry) => entry.pathId === "shop-assistant",
  )!;
  let step = seekCareerOffer(world, provider);
  expect(step.ok).toBe(true);
  world = step.world;
  const work = world.history.workRelationships.at(-1)!;
  world = respondCareerOffer(world, work.id, provider, true).world;
  world = passOrdinaryDays(world, 1);
  step = startCareerWork(world, work.id, provider);
  expect(step.ok).toBe(true);
  world = step.world;
  for (
    let guard = 0;
    guard < 20 && (cash(world, { kind: "person", personId }) ?? 0) < 20_200;
    guard++
  ) {
    step = performCareerWork(world, work.id, provider);
    if (step.ok) world = step.world;
    world = passOrdinaryDays(world, 1);
  }

  const transit = fileTransitAppropriation(world, {
    personId,
    amountMinorUnits: 20_000,
    serviceWindow: "weekday",
  });
  world = enactThroughSitting(transit.world, transit.bill.measureId, personId);
  const tax = fileTaxProposalFromOffice(world, {
    personId,
    stableKey: "civic:tax",
    terms: TEST_TAX_TERMS,
  });
  world = enactThroughSitting(tax.world, tax.measureId, personId);
  const policy = world.history.taxPolicies!.at(-1)!;
  for (
    let guard = 0;
    guard < 30 && world.currentDate < policy.effectiveAt;
    guard++
  )
    world = passOrdinaryDays(
      world,
      world.currentDate < policy.effectiveAt ? 7 : 1,
    );
  const proposal = world.history.taxProposals!.at(-1)!;
  for (let n = 1; n <= occurrences; n++)
    world = declarePersonalTaxOccurrence(world, {
      personId,
      stableKey: `civic:occurrence-${n}`,
      proposalId: proposal.id,
      baseKey: proposal.terms.baseKey,
      amountMinorUnits: 202_100,
      assumptionNote:
        "Explicit fictional taxable occurrence for the civic route.",
    });
  for (let day = 0; day < 3; day++) world = passOrdinaryDays(world, 1);
  const account = publicTaxAccountForJurisdiction(
    world,
    proposal.jurisdictionId,
  )!;
  return {
    world,
    personId,
    transitMeasureId: transit.bill.measureId,
    publicOrganizationId: account.organizationId,
  };
}

describe("funded civic service: decision -> collected public cash -> payment -> delivered service", () => {
  let fullyFunded: Funded;
  let partlyFunded: Funded;
  beforeAll(() => {
    fullyFunded = fundedLife(2);
    partlyFunded = fundedLife(1);
  }, LONG);

  it(
    "pays and delivers both requested periods once from collected public cash, then continues after save/reopen",
    () => {
      const { personId, transitMeasureId, publicOrganizationId } = fullyFunded;
      const account = {
        kind: "organization" as const,
        organizationId: publicOrganizationId,
      };
      // Both laws came through their own recorded sittings, never each other's.
      const choices = fullyFunded.world.history.events
        .filter(
          (e) => e.type === "legislation.recorded-fictional-sitting-admitted",
        )
        .map((e) => e.context.choice);
      expect(choices).toEqual([
        ALASKA_RECORDED_SITTING,
        ALASKA_REVENUE_RECORDED_SITTING,
      ]);
      expect(
        (fullyFunded.world.history.taxCollections ?? []).map(
          (row) => row.status,
        ),
      ).toEqual(["collected", "collected"]);
      expect(cash(fullyFunded.world, account)).toBe(20_200);
      expect(payments(fullyFunded.world)).toHaveLength(0);

      // Save and reopen between funding and the decision to spend.
      let world = deserializeWorld(serializeWorld(fullyFunded.world));
      world = requestTransitFromOffice(world, {
        personId,
        measureId: transitMeasureId,
      });
      for (let day = 0; day < 30; day++) world = passOrdinaryDays(world, 1);

      const bill = projectTransitWork(world, personId).bills[0]!;
      expect(bill.periods.map((p) => p.state.status)).toEqual([
        "resolved",
        "resolved",
      ]);
      expect(payments(world)).toHaveLength(2);
      expect(bill.paidMinorUnits).toBe(20_000);
      expect(cash(world, account)).toBe(200);
      expect(bill.publicCashMinorUnits).toBe(200);
      expect(world.history.policyRealizations).toHaveLength(2);

      const settlement = world.history.events.find(
        (e) => e.type === "transit.service-period-settled",
      )!;
      expect(settlement.summary).toContain(
        "Delivered 1 vehicle-service hour of added contract service",
      );
      expect(settlement.summary).toContain(
        "paid with $100.00 from the public account",
      );
      world = publishTransitReport(world, { personId, eventId: settlement.id });
      expect(world.history.publications!.at(-1)!.body).toContain(
        "not observed ridership, travel time or access",
      );

      // More time after delivery repeats no payment or service.
      const reopened = deserializeWorld(serializeWorld(world));
      const later = passOrdinaryDays(reopened, 7);
      expect(payments(later)).toHaveLength(2);
      expect(later.history.policyRealizations).toHaveLength(2);
      assertWorldIntegrity(later);
    },
    LONG,
  );

  it(
    "refuses the unfunded second period without any payment, service or cash change",
    () => {
      const { personId, transitMeasureId, publicOrganizationId } = partlyFunded;
      const account = {
        kind: "organization" as const,
        organizationId: publicOrganizationId,
      };
      expect(cash(partlyFunded.world, account)).toBe(10_100);
      let world = requestTransitFromOffice(partlyFunded.world, {
        personId,
        measureId: transitMeasureId,
      });
      for (let day = 0; day < 30; day++) world = passOrdinaryDays(world, 1);
      const bill = projectTransitWork(world, personId).bills[0]!;
      expect(bill.periods.map((p) => p.state.status)).toEqual([
        "resolved",
        "blocked",
      ]);
      expect(bill.periods[1]!.state.context).toMatch(
        /public cash is absent or insufficient/,
      );
      expect(payments(world)).toHaveLength(1);
      expect(bill.paidMinorUnits).toBe(10_000);
      expect(cash(world, account)).toBe(100);
      expect(world.history.policyRealizations).toHaveLength(2);
      expect(
        world.history.policyRealizations.filter(
          (r) => r.consequences.length > 0,
        ),
      ).toHaveLength(1);
      assertWorldIntegrity(deserializeWorld(serializeWorld(world)));
    },
    LONG,
  );

  it(
    "refuses a duplicate request and a wrong office without mutation, and cancels undelivered service once",
    () => {
      const { personId, transitMeasureId, publicOrganizationId } = fullyFunded;
      const account = {
        kind: "organization" as const,
        organizationId: publicOrganizationId,
      };
      const requested = requestTransitFromOffice(fullyFunded.world, {
        personId,
        measureId: transitMeasureId,
      });
      const bytes = serializeWorld(requested);
      expect(() =>
        requestTransitFromOffice(requested, {
          personId,
          measureId: transitMeasureId,
        }),
      ).toThrow(/already has an implementation request/);
      expect(serializeWorld(requested)).toBe(bytes);

      const ended = endSuppliedSeat(fullyFunded.world);
      expect(transitOffice(ended, personId).kind).toBe("unavailable");
      expect(() =>
        requestTransitFromOffice(ended, {
          personId,
          measureId: transitMeasureId,
        }),
      ).toThrow();
      expect(() =>
        fileTaxProposalFromOffice(ended, {
          personId,
          stableKey: "civic:ended-seat-tax",
          terms: TEST_TAX_TERMS,
        }),
      ).toThrow();
      const kentucky = suppliedLegislativeSeat("US-KY", "house");
      const office = transitOffice(kentucky.world, kentucky.personId);
      expect(office.kind).toBe("unavailable");

      let cancelled = cancelTransitImplementation(requested, {
        personId,
        measureId: transitMeasureId,
      });
      expect(() =>
        cancelTransitImplementation(cancelled, {
          personId,
          measureId: transitMeasureId,
        }),
      ).toThrow(/No undelivered service period remains/);
      for (let day = 0; day < 30; day++)
        cancelled = passOrdinaryDays(cancelled, 1);
      const bill = projectTransitWork(cancelled, personId).bills[0]!;
      expect(bill.periods.map((p) => p.state.status)).toEqual([
        "cancelled",
        "cancelled",
      ]);
      expect(payments(cancelled)).toHaveLength(0);
      expect(cash(cancelled, account)).toBe(20_200);
      assertWorldIntegrity(deserializeWorld(serializeWorld(cancelled)));
    },
    LONG,
  );
});
