import { ensureLocalGovernmentOrganization } from "../nationwide-world/local-governments";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { observerSetup } from "../../presentation/observer-world";
import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../demo";
import { makeIsoDate } from "../dates";
import { createOrganization, createWorkRelationship } from "../life";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../life-places";
import { ensureStateJurisdictionForKey } from "../nationwide-world/state-executives";
import { chiefExecutiveJurisdiction } from "../nationwide-world/government-jurisdiction";
import { resourcePositionAt } from "../resource-queries";
import { createResourcePosition, money } from "../resources";
import { publicOrganizationKey } from "../tax-policy";
import { STATES } from "../state-reference";
import {
  allGovernmentUnits,
  governmentUnitJurisdictionId,
} from "../government-units";
import { lifePlaceByKey } from "../life-places";
import { advanceWorld, createWorld } from "../world";
import type { PublicGovernmentIdentity, World } from "../types";
import { payTownPaydays, startTownJobPay, townPaySource } from "./town-pay";

const date = makeIsoDate("2026-01-05");
const authored = {
  kind: "authored" as const,
  note: "Controlled payroll fixture; not an observed treasury balance.",
};
const source = {
  kind: "source-record" as const,
  reference: "https://example.invalid/a50/controlled-owner",
  asOf: date,
};

function employer(
  world: World,
  identity?: PublicGovernmentIdentity,
  government = true,
) {
  return createOrganization(world, {
    stableKey: "fixture:payroll-employer",
    formedAt: world.currentDate,
    provenance: identity ? { ...source, asOf: world.currentDate } : authored,
    initialProfile: {
      name: "Controlled payroll employer",
      classification: government ? "service:school" : "enterprise:retail",
      locationJurisdictionId: world.jurisdictionOrder[0]!,
      ...(identity ? { publicGovernmentIdentity: identity } : {}),
    },
  });
}

function fundedAccount(
  world: World,
  jurisdictionId: World["jurisdictionOrder"][number],
) {
  let next = createOrganization(world, {
    stableKey: publicOrganizationKey(jurisdictionId),
    formedAt: world.currentDate,
    provenance: authored,
    initialProfile: {
      name: "Controlled public account",
      classification: "sector:government",
      locationJurisdictionId: jurisdictionId,
    },
  });
  const organizationId = next.history.organizations.at(-1)!.id;
  next = createResourcePosition(next, {
    stableKey: "fixture:public-cash",
    owner: { kind: "organization", organizationId },
    openedAt: next.currentDate,
    openingBalance: money(100_000_000, "USD"),
    provenance: authored,
  });
  return { world: next, organizationId };
}

describe("town payroll resolves the saved public employer identity", () => {
  it.each(Object.keys(STATES).sort())(
    "%s reuses canonical cash without a second account",
    (usps) => {
      const jurisdiction = chiefExecutiveJurisdiction(usps)!;
      let world = createWorld({
        seed: `a50:${usps}`,
        currentDate: date,
        jurisdictions: [jurisdiction],
        people: [],
      });
      const account = fundedAccount(world, jurisdiction.id);
      world = employer(account.world, {
        kind: "jurisdiction",
        jurisdictionId: jurisdiction.id,
      });
      const id = world.history.organizations.at(-1)!.id;
      const before = JSON.stringify(world);
      const result = townPaySource(world, id);
      expect(result.organizationId).toBe(account.organizationId);
      expect(JSON.stringify(result.world)).toBe(before);
      expect(townPaySource(result.world, id)).toEqual(result);
    },
  );

  it("keeps a private employer and refuses to infer public ownership from location", () => {
    const jurisdiction = stateJurisdictionForKey(
      Object.keys(STATES)
        .map((key) => `US-${key}`)
        .sort()[0]!,
    )!;
    const base = createWorld({
      seed: "a50:ownership",
      currentDate: date,
      jurisdictions: [jurisdiction],
      people: [],
    });
    const privateWorld = employer(base, undefined, false);
    const id = privateWorld.history.organizations.at(-1)!.id;
    expect(townPaySource(privateWorld, id)).toEqual({
      world: privateWorld,
      organizationId: id,
    });
    const publicWorld = employer(base);
    const publicEmployerId = publicWorld.history.organizations.at(-1)!.id;
    expect(townPaySource(publicWorld, publicEmployerId)).toEqual({
      world: publicWorld,
      organizationId: publicEmployerId,
    });
  });

  it("uses an existing state alias account instead of opening a duplicate", () => {
    const usps = Object.keys(STATES).find(
      (key) =>
        stateJurisdictionForKey(`US-${key}`)!.id !==
        chiefExecutiveJurisdiction(key)!.id,
    )!;
    expect(usps).toBeDefined();
    const alias = stateJurisdictionForKey(`US-${usps}`)!;
    const canonical = chiefExecutiveJurisdiction(usps)!;
    const base = createWorld({
      seed: "a50:alias",
      currentDate: date,
      jurisdictions: alias.id === canonical.id ? [alias] : [alias, canonical],
      people: [],
    });
    const account = fundedAccount(base, alias.id);
    const world = employer(account.world, {
      kind: "jurisdiction",
      jurisdictionId: canonical.id,
    });
    const result = townPaySource(world, world.history.organizations.at(-1)!.id);
    expect(result.organizationId).toBe(account.organizationId);
    expect(result.world.history.resourcePositions).toEqual(
      world.history.resourcePositions,
    );
    expect(result.world.history.organizations).toEqual(
      world.history.organizations,
    );
  });

  it("retains a compiled local government's identity and reuses its single account", () => {
    const unit = allGovernmentUnits().find(
      (row) =>
        row.functionalActive &&
        row.unitType === "municipality" &&
        row.placeGeoid &&
        lifePlaceByKey(row.placeGeoid)?.context.jurisdiction.id ===
          governmentUnitJurisdictionId(row),
    )!;
    const jurisdiction = lifePlaceByKey(unit.placeGeoid!)!.context.jurisdiction;
    const base = createWorld({
      seed: "a50:local-account",
      currentDate: date,
      jurisdictions: [jurisdiction],
      people: [],
    });
    const world = ensureLocalGovernmentOrganization(base, unit);
    const id = world.history.organizations.at(-1)!.id;
    const first = townPaySource(world, id);
    expect(first.organizationId).not.toBe(id);
    expect(first.world.history.organizations.at(-1)!.stableKey).toBe(
      `public-government:local:${encodeURIComponent(unit.id)}`,
    );
    const again = townPaySource(first.world, id);
    expect(again.organizationId).toBe(first.organizationId);
    expect(JSON.stringify(again.world)).toBe(JSON.stringify(first.world));
  });

  it("the actual town paycheck debits saved government cash, not the school", () => {
    const demo = createDemoWorld("a50:paid-teacher");
    const template = demo.history.workRelationships[0]!;
    const role = demo.history.workRoles.find(
      (row) => row.workRelationshipId === template.id,
    )!;
    const place = lifePlaceByJurisdictionId(role.locationJurisdictionId!)!;
    let world = createWorld({
      seed: demo.seed,
      currentDate: demo.currentDate,
      jurisdictions: Object.values(demo.jurisdictions),
      people: Object.values(demo.people),
    });
    world = ensureStateJurisdictionForKey(world, place.stateJurisdictionKey!);
    const jurisdictionId = chiefExecutiveJurisdiction(
      place.stateJurisdictionKey!.slice(3),
    )!.id;
    const account = fundedAccount(world, jurisdictionId);
    world = employer(account.world, { kind: "jurisdiction", jurisdictionId });
    const employerId = world.history.organizations.at(-1)!.id;
    world = createWorkRelationship(world, {
      ...template,
      stableKey: "town-employment-v1:fixture:teacher",
      organizationId: employerId,
      startedAt: world.currentDate,
      provenance: authored,
      initialRole: {
        title: "Controlled teacher",
        occupationClassification: "profession:teacher",
        locationJurisdictionId: role.locationJurisdictionId,
        timeDemand: role.timeDemand,
      },
    });
    const startsAt = world.currentDate;
    world = startTownJobPay(world, null, startsAt);
    const flow = world.history.resourceFlows.find(
      (row) => row.basisKind === "compensation:work",
    )!;
    expect(flow).toBeDefined();
    expect(flow.source).toEqual({
      kind: "organization",
      organizationId: account.organizationId,
    });
    const currency = money(0, "USD").currency;
    const owner = {
      kind: "organization" as const,
      organizationId: account.organizationId,
    };
    const before = resourcePositionAt(world, owner, currency)!.liquidBalance
      .minorUnits;
    world = payTownPaydays(advanceWorld(world, 28), startsAt, null);
    const paychecks = world.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === flow.id,
    );
    expect(paychecks.length).toBeGreaterThan(0);
    const gross = paychecks.reduce(
      (sum, row) => sum + row.transferredAmount.minorUnits,
      0,
    );
    expect(
      resourcePositionAt(world, owner, currency)!.liquidBalance.minorUnits,
    ).toBe(before - gross);
    expect(
      resourcePositionAt(
        world,
        { kind: "organization", organizationId: employerId },
        currency,
      ),
    ).toBeUndefined();
    const paid = JSON.stringify(world);
    expect(JSON.stringify(payTownPaydays(world, startsAt, null))).toBe(paid);
  });
});

// Opening proof exercises the real current-main producer before payroll.

describe("A50 receiving opens current games", () => {
  it.each([
    "a50-payroll-opening-one",
    "a50-payroll-opening-two",
    "a50-payroll-opening-three",
  ])("opens the random place for %s", (seed) => {
    const setup = observerSetup(seed);
    const opened = generateOpeningLife(
      prepareOpeningLife({ ...setup, questionnaire: "skipped" }),
    );
    expect(opened.game).not.toBeNull();
    const game = opened.game!;
    expect(game.world.people[game.playerPersonId]).toBeDefined();
    expect(game.world.history.workRelationships.length).toBeGreaterThan(0);
    process.stdout.write(
      JSON.stringify({
        receipt: "A50 public payroll opening",
        seed,
        placeKey: setup.placeKey,
        date: game.world.currentDate,
        playerPersonId: game.playerPersonId,
      }) + "\n",
    );
  });
});
