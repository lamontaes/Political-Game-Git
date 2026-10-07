import { describe, expect, it } from "vitest";

import type { World } from "./types";
import {
  estimatedStatePay,
  officePayInForce,
  OFFICE_PAY_META,
  statePayFor,
  paidOfficeOf,
} from "./office-pay";
import { createScenarioWorld } from "./demo";
import { requireLifePlace, stateJurisdictionForKey } from "./life-places";
import { ensureStateJurisdictionForKey } from "./nationwide-world/state-executives";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkRole,
} from "./life";
import { deserializeWorld, serializeWorld } from "./serialization";
import { personName } from "./people";
import { advanceWorld } from "./world";
import { workRoleAt } from "./life-queries";

describe("what states pay for an office", () => {
  it("holds the governor's published salary", () => {
    expect(statePayFor("governor", "NY")?.annualDollars).toBe(250_000);
    expect(statePayFor("governor", "AL")?.annualDollars).toBe(131_800);
    expect(OFFICE_PAY_META.governors).toBeGreaterThanOrEqual(50);
  });

  it("holds a legislator's annual salary where the state pays one", () => {
    expect(statePayFor("state-legislator", "NY")?.annualDollars).toBe(142_000);
    expect(statePayFor("state-legislator", "TX")?.annualDollars).toBe(7_200);
  });

  it("holds California's newer legislator salary in place of the 2023 table's", () => {
    // $128,215 since December 4, 2023; the Book of the States 2023 shows $122,694.
    expect(statePayFor("state-legislator", "CA")?.annualDollars).toBe(128_215);
    expect(OFFICE_PAY_META.newerThanTables).toEqual([
      expect.objectContaining({
        office: "state-legislator",
        state: "CA",
        annualDollars: 128_215,
        effectiveFrom: "2023-12-04",
      }),
    ]);
  });

  it("holds a trial court judge's and a member of Congress's salary", () => {
    expect(statePayFor("trial-court-judge", "NY")?.annualDollars).toBe(210_900);
    expect(statePayFor("member-of-congress", "US")?.annualDollars).toBe(
      174_000,
    );
  });

  it("holds nothing, not zero, where the state pays no single annual salary", () => {
    // Utah pays by the legislative day, Vermont by the week during session,
    // Virginia a different salary in each chamber, New Mexico no salary.
    for (const state of ["UT", "VT", "VA", "NM"])
      expect(statePayFor("state-legislator", state)).toBeNull();
    expect(statePayFor("governor", "ZZ")).toBeNull();
  });

  it("estimates from the average, never zero, where the tables give no salary", () => {
    const world = (seed: string) => ({ seed }) as unknown as World;
    const utah = estimatedStatePay(world("a"), "state-legislator", "UT")!;
    expect(utah.basis).toMatch(
      /^ESTIMATED FROM AVERAGE: .*ranked by Census region/,
    );
    // An annual estimate from actual same-office salaries, never a pay law.
    expect(utah.annualDollars).toBeGreaterThan(20_000);
    expect(utah.annualDollars).toBeLessThan(75_000);
    expect(utah.annualDollars % 100).toBe(0);
    // The same sourced estimate across all worlds; no seed chooses pay.
    expect(estimatedStatePay(world("a"), "state-legislator", "UT")).toEqual(
      utah,
    );
    const others = new Set(
      ["b", "c", "d", "e", "f"].map(
        (seed) =>
          estimatedStatePay(world(seed), "state-legislator", "UT")!
            .annualDollars,
      ),
    );
    expect(others.size).toBe(1);
    expect(utah.basis).toContain("not statutory salary authority");
    // A territory without sourced CPS income gets an actual same-office mean.
    const territory = estimatedStatePay(world("a"), "state-legislator", "AS")!;
    expect(territory.basis).toContain("same-office plain mean");
    expect(estimatedStatePay(world("b"), "state-legislator", "AS")).toEqual(
      territory,
    );
    // Congress is set by statute, never estimated.
    expect(
      estimatedStatePay(world("a"), "member-of-congress", "US"),
    ).toBeNull();
  });

  it("the existing salary reader preserves the estimate and saved worker through canonical reload", () => {
    const place = requireLifePlace("4967000");
    let world = ensureStateJurisdictionForKey(
      createScenarioWorld("team6-a42-office-reader", place.context, {
        peopleCount: 3,
      }),
      "US-UT",
    );
    const personId = world.personOrder[0]!;
    const jurisdictionId = stateJurisdictionForKey("US-UT")!.id;
    const provenance = {
      kind: "authored" as const,
      note: "Explicit salary-reader fixture, not an election or appointment.",
    };
    world = createOrganization(world, {
      stableKey: "team6-a42:office",
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: "Authored salary-reader office",
        classification: "sector:government",
        locationJurisdictionId: jurisdictionId,
      },
    });
    world = createWorkRelationship(world, {
      stableKey: "team6-a42:work",
      personId,
      organizationId: world.history.organizations.at(-1)!.id,
      startedAt: world.currentDate,
      kind: "employment:legislative-member",
      compensation: "paid",
      authority: "directed",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Authored legislative salary-reader fixture",
        occupationClassification: null,
        locationJurisdictionId: jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 40, maximumHours: 40 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: jurisdictionId,
        },
      },
    });
    const work = world.history.workRelationships.at(-1)!;
    const before = serializeWorld(world);
    const pay = officePayInForce(world, work, world.currentDate)!;
    expect(pay.annualDollars).toBe(
      estimatedStatePay(world, "state-legislator", "UT")!.annualDollars,
    );
    expect(pay.law).toBeNull();
    expect(pay.estimatedBecause).toContain("not statutory salary authority");
    expect(serializeWorld(world)).toBe(before);
    const loaded = deserializeWorld(before);
    const savedWork = loaded.history.workRelationships.find(
      (r) => r.id === work.id,
    )!;
    expect(officePayInForce(loaded, savedWork, loaded.currentDate)).toEqual(
      pay,
    );
    expect(serializeWorld(loaded)).toBe(before);
    console.log(
      "A42_SAVED_READER",
      personName(world.people[personId]!),
      personId,
      work.id,
      pay.annualDollars,
    );
  });
  it("reads overdue office pay from its period role after a later state role change and reload", () => {
    const place = requireLifePlace("4967000");
    let world = ensureStateJurisdictionForKey(
      createScenarioWorld("team6-a42-office-reader", place.context, {
        peopleCount: 3,
      }),
      "US-UT",
    );
    const personId = world.personOrder[0]!;
    const jurisdictionId = stateJurisdictionForKey("US-UT")!.id;
    const provenance = {
      kind: "authored" as const,
      note: "Explicit salary-reader fixture, not an election or appointment.",
    };
    world = createOrganization(world, {
      stableKey: "team6-a42:office",
      formedAt: world.currentDate,
      provenance,
      initialProfile: {
        name: "Authored salary-reader office",
        classification: "sector:government",
        locationJurisdictionId: jurisdictionId,
      },
    });
    world = createWorkRelationship(world, {
      stableKey: "team6-a42:work",
      personId,
      organizationId: world.history.organizations.at(-1)!.id,
      startedAt: world.currentDate,
      kind: "employment:legislative-member",
      compensation: "paid",
      authority: "directed",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance,
      initialRole: {
        title: "Authored legislative salary-reader fixture",
        occupationClassification: null,
        locationJurisdictionId: jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 40, maximumHours: 40 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: jurisdictionId,
        },
      },
    });
    const work = world.history.workRelationships.at(-1)!;
    const onDate = world.currentDate;
    const expected = officePayInForce(world, work, onDate)!;
    const role = workRoleAt(world, work.id)!;
    world = ensureStateJurisdictionForKey(advanceWorld(world, 1), "US-NY");
    world = recordWorkRole(world, {
      stableKey: "overdue-office:later-role",
      workRelationshipId: work.id,
      effectiveAt: world.currentDate,
      title: role.title,
      occupationClassification: role.occupationClassification,
      locationJurisdictionId: stateJurisdictionForKey("US-NY")!.id,
      timeDemand: role.timeDemand,
      provenance,
      supersedesRoleId: role.id,
    });
    expect(paidOfficeOf(world, work)?.state).toBe("NY");
    expect(
      officePayInForce(world, work, world.currentDate)?.annualDollars,
    ).toBe(statePayFor("state-legislator", "NY")!.annualDollars);
    expect(officePayInForce(world, work, onDate)).toEqual(expected);
    const loaded = deserializeWorld(serializeWorld(world));
    expect(officePayInForce(loaded, work, onDate)).toEqual(expected);
  });
});
