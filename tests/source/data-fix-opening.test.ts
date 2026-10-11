import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../../src/simulation/life-places";
import { SeededRng, pickDistinct } from "../../src/simulation/rng";
import { initializeAllOfficeSalaryFlows } from "../../src/simulation/office-salary";
import {
  officePayInForce,
  paidOfficeOf,
} from "../../src/simulation/office-pay";
import { resourceFlowTermsHistory } from "../../src/simulation/resource-queries";

it("initializes ordinary generated officeholders from the swapped data in a place drawn from all 56", () => {
  const seed = "data-fix-official-salary-opening";
  const rng = new SeededRng(seed);
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  const state = pickDistinct(rng, places, 1)[0]!;
  const place = pickDistinct(
    rng,
    searchLifePlaces("", Number.MAX_SAFE_INTEGER, {
      scope: "locality",
      stateJurisdictionKey: state.jurisdictionKey,
    }),
    1,
  )[0]!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      questionnaire: "skipped",
    }),
  ).game;
  expect(game).not.toBeNull();
  expect(game!.world.control).toEqual({
    kind: "person",
    personId: game!.playerPersonId,
  });
  const world = initializeAllOfficeSalaryFlows(game!.world);
  const held = world.history.workRelationships.filter(
    (work) =>
      work.organizationId &&
      (work.compensation === "paid" || work.compensation === "mixed") &&
      paidOfficeOf(world, work),
  );
  const flows = new Map(
    world.history.resourceFlows.flatMap((flow) =>
      flow.basisReference.kind === "work"
        ? [[flow.basisReference.workRelationshipId, flow] as const]
        : [],
    ),
  );
  expect(held.length).toBeGreaterThan(0);
  const rows = held.map((work) => {
    const office = paidOfficeOf(world, work)!;
    const pay = officePayInForce(world, work, world.currentDate)!;
    const flow = flows.get(work.id)!;
    expect(flow, work.id).toBeDefined();
    expect(pay, work.id).not.toBeNull();
    const terms = resourceFlowTermsHistory(world, flow.id).at(-1)!;
    expect(terms.amount.minorUnits, work.id).toBe(
      Math.round((pay.annualDollars * 100) / 52),
    );
    expect(terms.amount.minorUnits, work.id).toBeGreaterThan(0);
    return {
      personId: work.personId,
      workId: work.id,
      flowId: flow.id,
      office: office.office,
      state: office.state,
      annualDollars: pay.annualDollars,
      weeklySalaryMinor: terms.amount.minorUnits,
    };
  });
  expect(initializeAllOfficeSalaryFlows(world)).toBe(world);
  writeFileSync(
    "/tmp/data-fix-opening.json",
    JSON.stringify(
      {
        schema: "data-fix-generated-opening/v1",
        seed,
        state: state.jurisdictionKey,
        place: place.context.jurisdiction.name,
        placeKey: place.key,
        date: world.currentDate,
        playerPersonId: game!.playerPersonId,
        generatedPaidOffices: rows.length,
        rows,
      },
      null,
      2,
    ) + "\n",
  );
}, 60_000);
