import {
  immigrationRentLevel,
  admittedWorkforce,
} from "./immigration-arrival-readers";
import { describe, expect, it } from "vitest";
import { openWatchedWorld } from "../../scripts/dev-lab/world-aging";
import { prepareLawPair } from "../../scripts/laws-proof/enact";
import { advanceObservedWorld } from "../presentation/observer-world";
import { US_CONGRESS_PACK_ID } from "./congress-rule-pack";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import { serializeWorld, deserializeWorld } from "./serialization";
import { assertWorldIntegrity } from "./world";
import {
  allocateImmigrationAdmissions,
  applyImmigrationAdmissions,
  IMMIGRATION_ADMISSIONS_QUESTION,
} from "./immigration-admissions-law";

describe("additional immigration creates residents through the town writers", () => {
  it("allocates the filed total across all 56 places without dropping unread territories", () => {
    const allocations = allocateImmigrationAdmissions(11729);
    expect(Object.keys(allocations)).toHaveLength(56);
    expect(Object.values(allocations).reduce((a, b) => a + b, 0)).toBe(11729);
    expect(
      Object.values(allocations).every((n) => Number.isSafeInteger(n) && n > 0),
    ).toBe(true);
    expect(allocations["US-CA"]).toBeGreaterThan(allocations["US-NH"]!);
    expect(() => allocateImmigrationAdmissions(-1)).toThrow();
  });
  it("adds exactly the accrued people with homes and dated jobs, and reopening cannot admit them twice", () => {
    const opened = openWatchedWorld("immigrant-arrival-records", "1700113");
    const base = ensureNationalElectionJurisdiction(opened.world);
    const proposition = Object.values(base.policyCatalog.propositions).find(
      (p) => p.stableKey === IMMIGRATION_ADMISSIONS_QUESTION,
    )!;
    const pair = prepareLawPair(base, {
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      rulePackId: US_CONGRESS_PACK_ID,
      propositionId: proposition.id,
      sponsorPersonId: opened.anchorPersonId,
      advance: advanceObservedWorld,
      policyTerms: [
        {
          questionKey: IMMIGRATION_ADMISSIONS_QUESTION,
          values: { additionalAdmissionsAnnual: 56 * 365 },
          reason: "Controlled 56-person accrual after one real-clock day.",
          principleRecordIds: [],
        },
      ],
    });
    const day = advanceObservedWorld(pair.treated, 1);
    const arrived = applyImmigrationAdmissions(day);
    const records = arrived.immigrationAdmissions!.filter(
      (r) => r.measureId === pair.measureId,
    );
    const ids = new Set(records.flatMap((r) => r.personIds));
    expect(ids.size).toBe(56);
    for (const id of ids) {
      expect(day.people[id]).toBeUndefined();
      expect(arrived.people[id]).toBeDefined();
      expect(
        arrived.history.householdMemberships.some((r) => r.personId === id),
      ).toBe(true);
    }
    const jobs = arrived.history.workRelationships.filter((r) =>
      ids.has(r.personId),
    );
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.every((r) => r.startedAt === arrived.currentDate)).toBe(true);
    for (const record of records) {
      const households = new Set(
        arrived.history.householdMemberships
          .filter((m) => record.personIds.includes(m.personId))
          .map((m) => m.householdId),
      );
      expect(
        arrived.history.dwellingOccupancies.some(
          (o) =>
            o.occupant.kind === "household" &&
            households.has(o.occupant.householdId),
        ),
      ).toBe(true);
      expect(
        immigrationRentLevel(arrived, record.townId, arrived.currentDate),
      ).toBeGreaterThan(
        immigrationRentLevel(day, record.townId, day.currentDate),
      );
    }
    expect(
      records.reduce(
        (n, r) => n + admittedWorkforce(arrived, r.townId, arrived.currentDate),
        0,
      ),
    ).toBeGreaterThan(0);
    expect(records.every((r) => r.arrivedOn === arrived.currentDate)).toBe(
      true,
    );
    const reopened = deserializeWorld(serializeWorld(arrived));
    expect(applyImmigrationAdmissions(reopened)).toBe(reopened);
    assertWorldIntegrity(reopened);
  }, 180000);
});
