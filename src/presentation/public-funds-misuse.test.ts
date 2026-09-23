import { describe, expect, it } from "vitest";

import {
  currentGoverningOffices,
  money,
  searchLifePlaces,
  type EntityId,
  type World,
} from "../simulation";
import { addDays } from "../simulation/dates";
import {
  declareProgramCapacity,
  recordProgramAppropriation,
} from "../simulation/governing/public-program";
import { createOrganization, createWorkRelationship } from "../simulation/life";
import {
  outsideMandatePayments,
  pressRecordsOfKind,
  proceedingSteps,
  publicFundsMisuseAvailability,
  PUBLIC_LEDGER_REVIEW_TRANSITION_KEY,
  spendPublicFundsOutsidePurpose,
  storyLeads,
} from "../simulation/press";
import { resourcePositionAt } from "../simulation/resource-queries";
import {
  createResourcePosition,
  makeCurrencyCode,
} from "../simulation/resources";
import {
  ensureTaxPublicAccount,
  publicTaxAccountForJurisdiction,
} from "../simulation/tax-policy";
import { assertWorldIntegrity } from "../simulation/world";
import { pay } from "../../tests/fixtures/public-program-fixture";
import { projectGoverningOfficeDesk } from "./governing-office-desk";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/** Authored test input. Not a real budget and not a production default. */
const FIXTURE = {
  kind: "authored-fixture" as const,
  note: "Public-funds misuse test fixture; not a real budget.",
};

function governorWithProgram(seed: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-CO",
    scope: "locality",
  })[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  let world = openOrdinaryLife(game.world, game.playerPersonId);
  const office = currentGoverningOffices(world)[0]!;
  const jurisdictionId = office.jurisdictionId;
  world = ensureTaxPublicAccount(world, jurisdictionId);
  const account = publicTaxAccountForJurisdiction(world, jurisdictionId)!;
  world = declareProgramCapacity(world, {
    edition: "misuse-test",
    programKey: "transit:state-bus",
    jurisdictionId,
    serviceLabel: "State bus service",
    unitLabel: "buses",
    unitsTotal: 10,
    unitsOperational: 8,
    monthlyOperatingNeed: money(200_000_00, "USD"),
    completedPermille: null,
    restorationCostPerUnit: null,
    basis: FIXTURE,
  }).world;
  const written = recordProgramAppropriation(world, {
    edition: "misuse-test-fy",
    programKey: "transit:state-bus",
    jurisdictionId,
    accountOrganizationId: account.organizationId,
    amount: money(2_000_000_00, "USD"),
    availableFrom: world.currentDate,
    availableThrough: addDays(world.currentDate, 364),
    basis: FIXTURE,
  });
  world = written.world;
  // Receipts the account really holds, supplied as a test input.
  world = createOrganization(world, {
    stableKey: "misuse-test:payer",
    formedAt: world.currentDate,
    provenance: { kind: "authored", note: FIXTURE.note },
    initialProfile: {
      name: "Fixture receipts payer",
      classification: "sector:private",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const payer = world.history.organizations.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: "misuse-test:payer:USD",
    owner: { kind: "organization", organizationId: payer },
    openedAt: world.currentDate,
    openingBalance: money(500_000_00, "USD"),
    provenance: { kind: "authored", note: FIXTURE.note },
  });
  world = pay(
    world,
    "misuse-test:receipts",
    payer,
    account.organizationId,
    500_000_00,
  );
  return {
    world,
    office,
    governor: office.holderPersonId,
    appropriationId: written.id,
    accountId: account.organizationId,
  };
}

function hireAide(world: World, organizationId: EntityId, personId: EntityId) {
  return createWorkRelationship(world, {
    stableKey: `misuse-test:aide:${personId}`,
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:executive-staff",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "authored", note: FIXTURE.note },
    initialRole: {
      title: "Budget aide",
      occupationClassification: null,
      locationJurisdictionId: null,
      timeDemand: {
        expectedWeekly: { minimumHours: 30, maximumHours: 45 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: null,
      },
    },
  });
}

const cash = (world: World, owner: EntityId, kind: "person" | "organization") =>
  resourcePositionAt(
    world,
    kind === "person"
      ? { kind: "person", personId: owner }
      : { kind: "organization", organizationId: owner },
    makeCurrencyCode("USD"),
  )?.liquidBalance.minorUnits ?? 0;

/**
 * Lets the month pass in ordinary play, so the review the payment scheduled
 * runs through the game's own transition registry, and reports how it ended.
 */
function review(world: World, occurrenceId: EntityId) {
  const due = world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === PUBLIC_LEDGER_REVIEW_TRANSITION_KEY &&
      item.stableKey.endsWith(occurrenceId),
  )!;
  expect(due).toBeDefined();
  let next = world;
  for (let step = 0; step < 3 && next.currentDate <= due.dueAt; step += 1)
    next = passOrdinaryDays(next, 15);
  const state = next.history.futureDueItemStates
    .filter((row) => row.dueItemId === due.id)
    .at(-1);
  return {
    world: next,
    reasonKey: state?.reasonKey ?? null,
    status: state?.status,
  };
}

describe("spending public money outside its purpose", () => {
  it("is offered on the governor's desk and pays the governor from the public account", () => {
    const s = governorWithProgram("public-funds-misuse-desk");
    const before = projectGoverningOfficeDesk(s.world, s.governor)!;
    const offered = before.programs[0]!.appropriations[0]!;
    expect(offered.outsidePurpose?.label).toContain(
      "spending public money outside its purpose",
    );
    expect(offered.outsidePurpose?.balanceMinorUnits).toBe(500_000_00);
    expect(offered.outsidePurposeLines).toEqual([]);

    const taken = spendPublicFundsOutsidePurpose(s.world, {
      stableKey: "misuse-test:first",
      personId: s.governor,
      appropriationId: s.appropriationId,
      amountMinorUnits: 40_000_00,
      purpose: "a lake house deposit",
    });
    assertWorldIntegrity(taken.world);
    expect(cash(taken.world, s.accountId, "organization")).toBe(460_000_00);
    expect(
      cash(taken.world, s.governor, "person") -
        cash(s.world, s.governor, "person"),
    ).toBe(40_000_00);
    expect(taken.occurrence.family).toBe("M7");
    expect(outsideMandatePayments(taken.world, s.appropriationId)).toHaveLength(
      1,
    );
    const after = projectGoverningOfficeDesk(taken.world, s.governor)!;
    expect(after.programs[0]!.appropriations[0]!.outsidePurposeLines).toEqual([
      "January 5, 2026: $40,000 was paid out for a lake house deposit, which this appropriation does not cover.",
    ]);

    // Somebody with no job in this government is offered nothing.
    const citizen = s.world.personOrder.find(
      (id) =>
        id !== s.governor &&
        !publicFundsMisuseAvailability(s.world, id, s.appropriationId)
          .available,
    )!;
    expect(() =>
      spendPublicFundsOutsidePurpose(s.world, {
        stableKey: "misuse-test:citizen",
        personId: citizen,
        appropriationId: s.appropriationId,
        amountMinorUnits: 1_00,
        purpose: "anything",
      }),
    ).toThrow(/no position/);
  }, 120_000);

  it("stays unknown when nobody works beside the governor", () => {
    const s = governorWithProgram("public-funds-misuse-alone");
    const taken = spendPublicFundsOutsidePurpose(s.world, {
      stableKey: "misuse-test:alone",
      personId: s.governor,
      appropriationId: s.appropriationId,
      amountMinorUnits: 10_000_00,
      purpose: "a new truck",
    });
    const reviewed = review(taken.world, taken.occurrence.id);
    expect(reviewed.status).toBe("cancelled");
    expect(reviewed.reasonKey).toBe("press:no-one-reviewed-the-account");
  }, 120_000);

  it("is found by an aide, who may ask, and after asking may file a complaint that ends in a public report", () => {
    const s = governorWithProgram("public-funds-misuse-aide");
    const aide = s.world.personOrder.find(
      (id) => id !== s.governor && id !== s.world.personOrder[0],
    )!;
    let world = hireAide(s.world, s.office.organizationId, aide);
    const outcomes: string[] = [];
    let complaintMatter: EntityId | null = null;
    for (let round = 0; round < 12 && !complaintMatter; round += 1) {
      const taken = spendPublicFundsOutsidePurpose(world, {
        stableKey: `misuse-test:round-${round}`,
        personId: s.governor,
        appropriationId: s.appropriationId,
        amountMinorUnits: 5_000_00,
        purpose: `personal bills, round ${round}`,
      });
      const reviewed = review(taken.world, taken.occurrence.id);
      world = reviewed.world;
      outcomes.push(reviewed.reasonKey ?? "none");
      assertWorldIntegrity(world);
      // The aide read the ledger entry, whatever they then chose.
      expect(
        world.history.evidenceDiscoveries.some(
          (row) =>
            row.personId === aide &&
            taken.occurrence.recordEvidenceArtifactIds.includes(
              row.evidenceArtifactId,
            ),
        ),
      ).toBe(true);
      if (reviewed.reasonKey === "press:reviewer-reported-outside")
        complaintMatter =
          pressRecordsOfKind(world, "matter").find(
            (row) => row.occurrenceId === taken.occurrence.id,
          )?.id ?? null;
    }
    expect(outcomes, outcomes.join(", ")).toContain(
      "press:reviewer-raised-concern",
    );
    // Only somebody who already asked goes outside the office.
    expect(outcomes.indexOf("press:reviewer-raised-concern")).toBeLessThan(
      outcomes.indexOf("press:reviewer-reported-outside"),
    );
    expect(complaintMatter, outcomes.join(", ")).not.toBeNull();
    const proceeding = pressRecordsOfKind(world, "matter-proceeding").find(
      (row) => row.matterId === complaintMatter,
    )!;
    // Nobody has researched who hears this about a governor, so the review
    // is the simulated one, which says it cannot sanction.
    expect(proceeding.procedureKey).toBe("simulated-inquiry");
    expect(proceeding.complainantPersonId).toBe(aide);
    // The simulated review reports thirty days after it opens.
    const advanced = passOrdinaryDays(world, 31);
    const report = proceedingSteps(advanced, proceeding.id).at(-1)!;
    expect(report.step).toBe("report-issued");
    expect(report.publicStep).toBe(true);
    expect(report.outcome).toBe("report-issued");
    assertWorldIntegrity(advanced);
    // The report is public, so a newsroom can take it up at its next review.
    const later = passOrdinaryDays(advanced, 14);
    expect(
      storyLeads(later).some((lead) => lead.matterId === complaintMatter),
    ).toBe(true);
  }, 600_000);
});
