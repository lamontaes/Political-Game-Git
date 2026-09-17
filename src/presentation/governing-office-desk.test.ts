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
  declareProgramCapacity,
  recordProgramAppropriation,
} from "../simulation/governing/public-program";
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
  });

  it("gives a citizen no desk at all, so no decision control can be offered", () => {
    const { world, playerPersonId } = lifeIn("CO", "office-desk-citizen");
    expect(projectGoverningOfficeDesk(world, playerPersonId)).toBeNull();
  });

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
  });

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
  });
});
