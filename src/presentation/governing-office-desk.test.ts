import { describe, expect, it } from "vitest";

import {
  currentGoverningOffices,
  ensureStateJurisdiction,
  money,
  searchLifePlaces,
  stateJurisdictionForKey,
  type EntityId,
  type World,
} from "../simulation";
import { addDays } from "../simulation/dates";
import {
  commitPublicProgram,
  declareProgramCapacity,
  programAppropriations,
  programCommitments,
  recordProgramAppropriation,
  settleProgramInstallment,
  type PublicProgramAlternative,
} from "../simulation/governing/public-program";
import { createOrganization } from "../simulation/life";
import { createResourcePosition } from "../simulation/resources";
import { pay } from "../../tests/fixtures/public-program-fixture";
import {
  ensureTaxPublicAccount,
  publicTaxAccountForJurisdiction,
} from "../simulation/tax-policy";
import { projectGoverningOfficeDesk } from "./governing-office-desk";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";

/** Authored test input. Not a real budget and not a production default. */
const FIXTURE = {
  kind: "authored-fixture" as const,
  note: "Office-desk unit-test fixture; not a real budget.",
};

function lifeIn(usps: string, seed: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${usps}`,
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
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    playerPersonId: game.playerPersonId,
  };
}

/** A capacity declaration and one appropriation for the governor's state. */
function withTransitProgram(world: World, jurisdictionId: EntityId) {
  const programKey = "transit:state-bus";
  let next = ensureTaxPublicAccount(world, jurisdictionId);
  const account = publicTaxAccountForJurisdiction(next, jurisdictionId)!;
  next = declareProgramCapacity(next, {
    edition: "desk-test",
    programKey,
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
  return recordProgramAppropriation(next, {
    edition: "desk-test-fy",
    programKey,
    jurisdictionId,
    accountOrganizationId: account.organizationId,
    amount: money(2_000_000_00, "USD"),
    availableFrom: next.currentDate,
    availableThrough: addDays(next.currentDate, 364),
    basis: FIXTURE,
  }).world;
}

describe("the officeholder's desk", () => {
  it("reads nothing into an office whose government has no program, staff, measure or workflow record", () => {
    const { world } = lifeIn("CO", "office-desk-empty");
    const office = currentGoverningOffices(world)[0]!;
    const desk = projectGoverningOfficeDesk(world, office.holderPersonId)!;

    expect(desk.officeTitle).toBe("Governor of Colorado");
    // American dates, from the office's own term record.
    expect(desk.termLine).toBe("Your term runs until January 4, 2027.");
    expect(desk.programs).toEqual([]);
    expect(desk.programsNote).toContain("No program of this government");
    expect(desk.staff).toEqual([]);
    expect(desk.staffNote).toContain("Nobody is recorded");
    expect(desk.measures).toEqual([]);
    expect(desk.measuresNote).toContain("No measure in this world");
    // A missing record stays missing: no vacancy, no zero, no invented name.
    expect(desk.casework).toBeNull();
    expect(desk.caseworkNote).toContain("cannot be recorded against it yet");
  }, 120_000);

  it("gives a citizen no desk at all, so no decision control can be offered", () => {
    const { world, playerPersonId } = lifeIn("CO", "office-desk-citizen");
    expect(projectGoverningOfficeDesk(world, playerPersonId)).toBeNull();
  }, 120_000);

  it("reads the objective, then what was put to the office, then that nothing is committed", () => {
    const { world } = lifeIn("CO", "office-desk-program");
    const office = currentGoverningOffices(world)[0]!;
    const seeded = withTransitProgram(world, office.jurisdictionId);
    const desk = projectGoverningOfficeDesk(seeded, office.holderPersonId)!;

    expect(desk.programsNote).toBeNull();
    const program = desk.programs[0]!;
    expect(program.serviceLabel).toBe("State bus service");
    expect(program.objectiveLines).toEqual([
      "8 of 10 buses are in service.",
      "Running it costs $200,000 a month.",
      "Nobody has established what returning one to service would cost.",
      FIXTURE.note,
    ]);
    // Nothing paid is not nought months of cover; it is simply not a line.
    expect(program.objectiveLines.join(" ")).not.toContain("0.0 months");

    const appropriation = program.appropriations[0]!;
    expect(appropriation.amountLine).toBe("$2,000,000 appropriated.");
    expect(appropriation.uncommittedLine).toBe(
      "$2,000,000 of it is still uncommitted.",
    );
    expect(appropriation.windowLine).toBe(
      "Available January 5, 2026 through January 4, 2027.",
    );
    expect(appropriation.authority.status).toBe("available");
    // The sitting executive has the standing, and still nothing to decide
    // between until alternatives are put to the office.
    expect(appropriation.alternativesNote).toContain(
      "No alternatives have been put to this office",
    );
    expect(program.commitments).toEqual([]);
  }, 120_000);

  it("leaves another government's program off this office's desk", () => {
    const { world } = lifeIn("CO", "office-desk-other-jurisdiction");
    const office = currentGoverningOffices(world)[0]!;
    const nevada = stateJurisdictionForKey("US-NV")!.id;
    expect(nevada).not.toBe(office.jurisdictionId);
    const seeded = withTransitProgram(
      ensureStateJurisdiction(world, "NV"),
      nevada,
    );
    const desk = projectGoverningOfficeDesk(seeded, office.holderPersonId)!;

    expect(desk.programs).toEqual([]);
    expect(desk.programsNote).toContain("No program of this government");
  }, 120_000);
});

/** Authored test input: one maintenance payment, settled at once. */
const MAINTENANCE: PublicProgramAlternative = {
  key: "desk-test-maintenance",
  title: "Bus maintenance",
  installments: [
    { afterDays: 0, amount: money(300_000_00, "USD"), purpose: "maintenance" },
  ],
  deliveryLeadDays: null,
};

/**
 * The same program, with the restoration cost declared, cash actually in the
 * account and an organization able to receive the payment. Every figure is
 * authored test input.
 */
function fundedTransitProgram(world: World, jurisdictionId: EntityId) {
  const programKey = "transit:state-bus";
  let next = ensureTaxPublicAccount(world, jurisdictionId);
  const account = publicTaxAccountForJurisdiction(next, jurisdictionId)!;
  next = declareProgramCapacity(next, {
    edition: "desk-test-funded",
    programKey,
    jurisdictionId,
    serviceLabel: "State bus service",
    unitLabel: "buses",
    unitsTotal: 10,
    unitsOperational: 8,
    monthlyOperatingNeed: money(200_000_00, "USD"),
    completedPermille: null,
    restorationCostPerUnit: money(150_000_00, "USD"),
    basis: FIXTURE,
  }).world;
  next = recordProgramAppropriation(next, {
    edition: "desk-test-funded-fy",
    programKey,
    jurisdictionId,
    accountOrganizationId: account.organizationId,
    amount: money(2_000_000_00, "USD"),
    availableFrom: next.currentDate,
    availableThrough: addDays(next.currentDate, 364),
    basis: FIXTURE,
  }).world;
  const org = (stableKey: string, name: string, opening: number) => {
    next = createOrganization(next, {
      stableKey,
      formedAt: next.currentDate,
      provenance: { kind: "authored", note: FIXTURE.note },
      initialProfile: {
        name,
        classification: "sector:private",
        locationJurisdictionId: jurisdictionId,
      },
    });
    const id = next.history.organizations.at(-1)!.id;
    next = createResourcePosition(next, {
      stableKey: `${stableKey}:USD`,
      owner: { kind: "organization", organizationId: id },
      openedAt: next.currentDate,
      openingBalance: money(opening, "USD"),
      provenance: { kind: "authored", note: FIXTURE.note },
    });
    return id;
  };
  const payer = org("desk-test:payer", "Fixture receipts payer", 1_000_000_00);
  const operator = org("desk-test:operator", "Fixture bus operator", 0);
  next = pay(
    next,
    "desk-test:receipts",
    payer,
    account.organizationId,
    500_000_00,
  );
  return {
    world: next,
    operator,
    appropriationId: programAppropriations(next, programKey)[0]!.id,
  };
}

describe("the desk once the office has decided and the work is done", () => {
  it("counts what is in service now, so the objective cannot contradict the outturn", () => {
    const { world } = lifeIn("CO", "office-desk-outturn");
    const office = currentGoverningOffices(world)[0]!;
    const funded = fundedTransitProgram(world, office.jurisdictionId);
    const committed = commitPublicProgram(funded.world, {
      appropriationId: funded.appropriationId,
      alternative: MAINTENANCE,
      personId: office.holderPersonId,
      office: { kind: "state-executive" },
      recipientOrganizationId: funded.operator,
    });
    expect(committed.ok).toBe(true);
    const commitment = programCommitments(
      committed.world,
      "transit:state-bus",
    )[0]!;
    const settled = settleProgramInstallment(
      committed.world,
      commitment.id,
      0,
    ).world;

    const desk = projectGoverningOfficeDesk(settled, office.holderPersonId)!;
    const program = desk.programs[0]!;
    // The declared record still says 8; two buses have since come back.
    expect(program.objectiveLines[0]).toBe("10 of 10 buses are in service.");
    expect(program.outturnLines).toHaveLength(1);
    expect(program.outturnLines[0]).toContain(
      "2 returned to service, leaving 10 running",
    );
    // The commitment is the decision, and it names who took it.
    const decision = program.commitments[0]!;
    expect(decision.alternativeTitle).toBe("Bus maintenance");
    expect(decision.totalLine).toBe("$300,000 committed across 1 payment.");
    expect(decision.installmentLines[0]).toContain("— paid");
    expect(decision.postedCount).toBe(1);
    expect(decision.failedCount).toBe(0);
    expect(program.appropriations[0]!.uncommittedLine).toBe(
      "$1,700,000 of it is still uncommitted.",
    );
  }, 120_000);
});
