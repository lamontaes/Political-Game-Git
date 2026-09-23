import { renderToStaticMarkup } from "react-dom/server";
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
  programAppropriations,
  recordProgramAppropriation,
} from "../simulation/governing/public-program";
import { createOrganization } from "../simulation/life";
import { spendPublicFundsOutsidePurpose } from "../simulation/press";
import { createResourcePosition } from "../simulation/resources";
import { pay } from "../../tests/fixtures/public-program-fixture";
import {
  ensureTaxPublicAccount,
  publicTaxAccountForJurisdiction,
} from "../simulation/tax-policy";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { GoverningOfficeDesk } from "./GoverningOfficeDesk";

/** Authored test input. Not a real budget and not a production default. */
const FIXTURE = {
  kind: "authored-fixture" as const,
  note: "Office-desk render-test fixture; not a real budget.",
};

function coloradoLife(seed: string) {
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
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    playerPersonId: game.playerPersonId,
  };
}

function withTransitProgram(world: World, jurisdictionId: EntityId) {
  let next = ensureTaxPublicAccount(world, jurisdictionId);
  const account = publicTaxAccountForJurisdiction(next, jurisdictionId)!;
  next = declareProgramCapacity(next, {
    edition: "desk-render",
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
  return recordProgramAppropriation(next, {
    edition: "desk-render-fy",
    programKey: "transit:state-bus",
    jurisdictionId,
    accountOrganizationId: account.organizationId,
    amount: money(2_000_000_00, "USD"),
    availableFrom: next.currentDate,
    availableThrough: addDays(next.currentDate, 364),
    basis: FIXTURE,
  }).world;
}

/** An appropriation with no capacity record: the service has no name. */
function withUnnamedProgram(world: World, jurisdictionId: EntityId) {
  const next = ensureTaxPublicAccount(world, jurisdictionId);
  const account = publicTaxAccountForJurisdiction(next, jurisdictionId)!;
  return recordProgramAppropriation(next, {
    edition: "desk-render-unnamed",
    programKey: "transit:state-bus",
    jurisdictionId,
    accountOrganizationId: account.organizationId,
    amount: money(2_000_000_00, "USD"),
    availableFrom: next.currentDate,
    availableThrough: addDays(next.currentDate, 364),
    basis: FIXTURE,
  }).world;
}

const render = (world: World, personId: EntityId) =>
  renderToStaticMarkup(
    <GoverningOfficeDesk
      world={world}
      personId={personId}
      onWorldChange={() => {
        throw new Error("Rendering the desk must not change the World.");
      }}
    />,
  );

describe("GoverningOfficeDesk", () => {
  it("renders every honest unavailable state when the office has no records", () => {
    const { world } = coloradoLife("desk-render-empty");
    const office = currentGoverningOffices(world)[0]!;
    const html = render(world, office.holderPersonId);

    expect(html).toContain('data-testid="office-programs-none"');
    expect(html).toContain('data-testid="office-staff-none"');
    expect(html).toContain('data-testid="office-measures-none"');
    expect(html).toContain('data-testid="office-casework-none"');
    // No zeroed amount stands in for a record that does not exist.
    expect(html).not.toContain("$0");
  }, 120_000);

  it("renders nothing at all for a citizen, so no decision control exists", () => {
    const { world, playerPersonId } = coloradoLife("desk-render-citizen");
    expect(render(world, playerPersonId)).toBe("");
  }, 120_000);

  it("renders objective, what was put to the office, and that nothing is committed", () => {
    const { world } = coloradoLife("desk-render-program");
    const office = currentGoverningOffices(world)[0]!;
    const html = render(
      withTransitProgram(world, office.jurisdictionId),
      office.holderPersonId,
    );

    expect(html).toContain('data-testid="office-program"');
    expect(html).toContain("8 of 10 buses are in service.");
    expect(html).toContain('data-testid="office-program-appropriation"');
    expect(html).toContain('data-authority="available"');
    expect(html).toContain("$2,000,000 appropriated.");
    // The authority is the domain's sentence, not a UI guess at the office.
    expect(html).toContain("executes appropriations the office receives");
    // An appropriation is plainly not a decision the office has taken.
    expect(html).toContain('data-testid="office-program-uncommitted"');
    expect(html).toContain('data-testid="office-program-no-options"');
    expect(html).not.toContain('data-testid="office-program-commitment"');
  }, 120_000);

  it("offers paying yourself from a funded appropriation, and lists what was taken", () => {
    const { world } = coloradoLife("desk-render-outside-purpose");
    const office = currentGoverningOffices(world)[0]!;
    let seeded = withTransitProgram(world, office.jurisdictionId);
    // With no cash in the account there is nothing to take, so no control.
    expect(render(seeded, office.holderPersonId)).not.toContain(
      'data-testid="office-program-outside-purpose-form"',
    );
    const account = publicTaxAccountForJurisdiction(
      seeded,
      office.jurisdictionId,
    )!;
    seeded = createOrganization(seeded, {
      stableKey: "desk-render:payer",
      formedAt: seeded.currentDate,
      provenance: { kind: "authored", note: FIXTURE.note },
      initialProfile: {
        name: "Fixture receipts payer",
        classification: "sector:private",
        locationJurisdictionId: office.jurisdictionId,
      },
    });
    const payer = seeded.history.organizations.at(-1)!.id;
    seeded = createResourcePosition(seeded, {
      stableKey: "desk-render:payer:USD",
      owner: { kind: "organization", organizationId: payer },
      openedAt: seeded.currentDate,
      openingBalance: money(100_000_00, "USD"),
      provenance: { kind: "authored", note: FIXTURE.note },
    });
    seeded = pay(
      seeded,
      "desk-render:receipts",
      payer,
      account.organizationId,
      100_000_00,
    );
    const offered = render(seeded, office.holderPersonId);
    expect(offered).toContain(
      'data-testid="office-program-outside-purpose-form"',
    );
    expect(offered).toContain("Use this money for something else");
    expect(offered).toContain("is spending public money outside its purpose.");
    expect(offered).toContain("The public account holds $100,000.00.");
    expect(offered).not.toContain(
      'data-testid="office-program-outside-purpose"',
    );

    const taken = spendPublicFundsOutsidePurpose(seeded, {
      stableKey: "desk-render:taken",
      personId: office.holderPersonId,
      appropriationId: programAppropriations(seeded, "transit:state-bus")[0]!
        .id,
      amountMinorUnits: 2_500_00,
      purpose: "a family vacation",
    }).world;
    const html = render(taken, office.holderPersonId);
    expect(html).toContain('data-testid="office-program-outside-purpose"');
    expect(html).toContain(
      "$2,500 was paid out for a family vacation, which this appropriation does not cover.",
    );
  }, 120_000);

  it("never titles a program with its record key when nothing names the service", () => {
    const { world } = coloradoLife("desk-render-unnamed");
    const office = currentGoverningOffices(world)[0]!;
    const html = render(
      withUnnamedProgram(world, office.jurisdictionId),
      office.holderPersonId,
    );

    expect(html).toContain('data-testid="office-program-unnamed"');
    expect(html).toContain("<h5>A program with no recorded name</h5>");
    expect(html).not.toContain("<h5>transit:state-bus</h5>");
    expect(html).toContain(
      "No capacity record establishes what this service has to work with.",
    );
  }, 120_000);
});
