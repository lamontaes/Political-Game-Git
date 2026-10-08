import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { beforeAll, describe, expect, it } from "vitest";

import { PersonalObligations } from "../player/PersonalObligations";
import { lawInForce } from "../simulation/governing/law-in-force";
import { openHouseholdLoan } from "../simulation/household-loans";
import { recordLawExposure } from "../simulation/law-exposure";
import { appendLawPermission } from "../simulation/law-consequences/permission-records";
import {
  collectTownRent,
  nextRentDay,
} from "../simulation/living-world/town-rent";
import { householdMembershipsAt } from "../simulation/life-queries";
import { moneyText } from "../simulation/money-text";
import { personName } from "../simulation/people";
import { resourceFlowTermsAt } from "../simulation/resource-queries";
import type { EntityId, ResourceFlow, World } from "../simulation/types";
import { drawRandomPlace } from "../../tests/support/random-place";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { projectMoneyLaws } from "./money-laws";
import { projectPersonalObligations } from "./personal-obligations";

/**
 * SEE-IT, Personal: the rent, pay, debts and legal permissions the simulation
 * records about a person now reach their Money and property page as record
 * values. The place is drawn from all 56 by the seed, and the test names it.
 */
const SEED = "see-it-personal-1";
const place = drawRandomPlace(SEED);

let world: World;
let playerId: EntityId;

beforeAll(() => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: SEED,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  world = game.world;
  playerId = game.playerPersonId;
}, 240_000);

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&#x27;")
    .replace(/"/g, "&quot;");

const isRent = (flow: ResourceFlow) =>
  flow.basisKind.startsWith("housing:") && flow.source.kind === "person";

describe(`rent and pay reach the Personal page (${place.displayName}, place ${place.key}, seed ${SEED})`, () => {
  it("lists the rent a tenant pays with the amount and cadence the lease records", () => {
    const flow = world.history.resourceFlows.find(
      (row) =>
        isRent(row) && resourceFlowTermsAt(world, row.id)?.status === "active",
    );
    expect(flow, "a resident pays rent in the opening world").toBeDefined();
    const payerId = (flow!.source as { personId: EntityId }).personId;
    const terms = resourceFlowTermsAt(world, flow!.id)!;
    const obligations = projectPersonalObligations(world, payerId)!;
    const bill = obligations.bills.find((line) => line.flowId === flow!.id);
    expect(bill, "the rent is a bill").toBeDefined();
    expect(bill!.amount).toEqual(terms.amount);
    expect(bill!.kind).toBe("rent");
    expect(bill!.cadence).toBe(terms.cadenceKind.split(":").at(-1));
    expect(bill!.last).toBeNull();
    expect(bill!.counterparty).not.toBeNull();
    // The page carries the record values and nothing else.
    const html = renderToStaticMarkup(
      createElement(PersonalObligations, { world, personId: payerId }),
    );
    expect(html).toContain('data-testid="personal-bills"');
    expect(html).toContain(
      `<strong>${escapeHtml(bill!.counterparty!)}</strong>`,
    );
    expect(html).toContain("<span>rent</span>");
    expect(html).toContain(`<span>${moneyText(bill!.amount)}</span>`);
    expect(html).toContain("<span>monthly</span>");
  });

  it("shows the same flow to the person it is paid to as income, not a bill", ({
    skip,
  }) => {
    const flow = world.history.resourceFlows.find(
      (row) =>
        isRent(row) &&
        row.recipient.kind === "person" &&
        resourceFlowTermsAt(world, row.id)?.status === "active",
    );
    // Landlords in some places are all businesses, which have no Personal page.
    if (!flow) return skip();
    const landlordId = (flow.recipient as { personId: EntityId }).personId;
    const obligations = projectPersonalObligations(world, landlordId)!;
    expect(obligations.income.some((line) => line.flowId === flow.id)).toBe(
      true,
    );
    expect(obligations.bills.some((line) => line.flowId === flow.id)).toBe(
      false,
    );
  });

  it("lists pay as income with the employer the record names", () => {
    const obligations = projectPersonalObligations(world, playerId)!;
    const pay = obligations.income.find((line) => line.kind === "work");
    expect(pay, "the player is paid for work").toBeDefined();
    expect(pay!.cadence).toBe("weekly");
    expect(pay!.counterparty).not.toBeNull();
  });

  it("shows a child with no money records nothing", ({ skip }) => {
    const child = Object.values(world.people).find(
      (person) =>
        person.birthDate > "2015-01-01" &&
        !world.history.resourceFlows.some(
          (flow) =>
            (flow.source.kind === "person" &&
              flow.source.personId === person.id) ||
            (flow.recipient.kind === "person" &&
              flow.recipient.personId === person.id),
        ) &&
        householdMembershipsAt(world, person.id).length === 0,
    );
    if (!child) return skip();
    expect(projectPersonalObligations(world, child.id)).toEqual({
      income: [],
      bills: [],
      debts: [],
      permissions: [],
    });
  });

  it("reads the payment a rent day records, with its status and date", () => {
    const flow = world.history.resourceFlows.find(
      (row) =>
        isRent(row) && resourceFlowTermsAt(world, row.id)?.status === "active",
    )!;
    const payerId = (flow.source as { personId: EntityId }).personId;
    const dueOn = nextRentDay(world.currentDate);
    // A controlled clock at the first rent day: nothing else is run, so the
    // only records written are the rent day's own.
    const onRentDay: World = {
      ...world,
      currentDate: dueOn,
      currentMoment: { ...world.currentMoment, date: dueOn },
    };
    const collected = collectTownRent(onRentDay, dueOn);
    const bill = projectPersonalObligations(collected, payerId)!.bills.find(
      (line) => line.flowId === flow.id,
    );
    expect(bill?.last, "the rent day wrote an outcome").not.toBeNull();
    expect(["completed", "partial", "missed", "blocked"]).toContain(
      bill!.last!.status,
    );
    expect(bill!.last!.on).toBe(dueOn);
    expect(bill!.last!.moved.minorUnits).toBeLessThanOrEqual(
      bill!.amount.minorUnits,
    );
  });
});

describe(`debts reach the Personal page (${place.displayName}, place ${place.key}, seed ${SEED})`, () => {
  it("lists a loan with its lender, balance, payment, rate and standing", () => {
    const person = world.people[playerId]!;
    const opened = openHouseholdLoan(world, {
      stableKey: "see-it-personal:auto-loan",
      borrower: { kind: "person", personId: playerId },
      lenderOrganizationId: null,
      lenderKind: "bank",
      kind: "auto",
      principal: { minorUnits: 1_800_000, currency: "USD" },
      marketAnnualRateBasisPoints: 650,
      rateCap: null,
      repayment: { kind: "installment", termMonths: 60 },
      lateFee: null,
      missedPaymentsToDefault: 3,
      missedPaymentsToCollections: 6,
      jurisdictionId: person.homeJurisdictionId,
      housingTenureId: null,
      provenance: { kind: "authored", note: "See-it test loan." },
    });
    const [debt] = projectPersonalObligations(opened, playerId)!.debts;
    expect(debt).toMatchObject({
      kind: "auto",
      lenderKind: "bank",
      annualRatePercent: 6.5,
      standing: "current",
    });
    expect(debt!.balance).toEqual({ minorUnits: 1_800_000, currency: "USD" });
    expect(debt!.monthlyPayment!.minorUnits).toBeGreaterThan(0);
    // A loan is a debt, not also a bill.
    expect(
      projectPersonalObligations(opened, playerId)!.bills.some(
        (line) => line.kind === "loan-payment",
      ),
    ).toBe(false);
    const html = renderToStaticMarkup(
      createElement(PersonalObligations, { world: opened, personId: playerId }),
    );
    expect(html).toContain('data-testid="personal-debts"');
    expect(html).toContain("auto");
    expect(html).toContain("6.5%");
    expect(html).toContain("$18,000");
  });
});

describe(`legal permissions reach the Personal page (${place.displayName}, place ${place.key}, seed ${SEED})`, () => {
  it("names a permission by the law's own question", () => {
    const person = world.people[playerId]!;
    const propositions = Object.values(world.policyCatalog.propositions);
    const found = propositions
      .map((proposition) => ({
        proposition,
        law: lawInForce(world, person.homeJurisdictionId, proposition.id),
      }))
      .find(
        ({ law }) =>
          law?.origin === "in-force-at-start" &&
          law.operativeAt <= world.currentDate,
      )!;
    expect(found).toBeDefined();
    const householdId = householdMembershipsAt(world, playerId)[0]!.household
      .id;
    const written = appendLawPermission(
      world,
      found.law,
      {
        effectKind: "right-permission",
        questionKey: found.proposition.stableKey,
        jurisdictionId: person.homeJurisdictionId,
        appliedAt: world.currentDate,
      },
      {
        subject: { kind: "person", id: playerId },
        permissionKey: found.proposition.stableKey,
        status: "permitted",
        effectiveAt: world.currentDate,
        sourceRecordIds: [householdId],
      },
    );
    const [line] = projectPersonalObligations(written, playerId)!.permissions;
    expect(line).toMatchObject({
      name: found.proposition.name,
      status: "permitted",
      since: world.currentDate,
    });
    // Nobody else holds it.
    const other = Object.keys(world.people).find((id) => id !== playerId)!;
    expect(projectPersonalObligations(written, other)!.permissions).toEqual([]);
  });
});

describe(`a law the place began with reaches Money laws (${place.displayName}, place ${place.key}, seed ${SEED})`, () => {
  it("names the law, opens nothing, and counts the town", () => {
    const person = world.people[playerId]!;
    const found = Object.values(world.policyCatalog.propositions)
      .map((proposition) => ({
        proposition,
        law: lawInForce(world, person.homeJurisdictionId, proposition.id),
      }))
      .find(({ law }) => law?.origin === "in-force-at-start")!;
    const written = recordLawExposure(world, {
      stableKey: "see-it-personal:starting-law",
      personId: playerId,
      measureId: found.law!.measureId as EntityId,
      sectionKey: found.proposition.stableKey,
      channel: "benefit",
      direction: "cost",
      amount: null,
      cadence: null,
      sourceRecordId: playerId,
      includeFamily: false,
    });
    const laws = projectMoneyLaws(written, playerId)!;
    const mine = laws.yours.find(
      (line) => line.measureId === found.law!.measureId,
    );
    expect(mine?.lawLabel).toBe(`“${found.proposition.name}”`);
    expect(mine?.openable).toBe(false);
    expect(laws.town.length).toBeGreaterThan(0);
    expect(laws.town.every((line) => line.lawLabel.length > 0)).toBe(true);
    // The player's name never appears in a town line.
    expect(
      laws.town.some((line) => line.text.includes(personName(person))),
    ).toBe(false);
  });
});
