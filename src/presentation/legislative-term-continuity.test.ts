import { describe, it, expect } from "vitest";
import {
  activeWorkRelationshipsAt,
  activeLegislativeTermEvidence,
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
  legislativeTermForRelationship,
  recordWorkStatus,
  recordWorkRole,
  workRoleAt,
  supportedLegislativeTermDates,
  workStatusAt,
  recordPersonDeath,
  type World,
} from "../simulation";
import { resolveActiveMemberSeat } from "./legislative-member-seat";
import { resolveLegislativeFilingEntry } from "./legislative-filing-entry";
import { fileDraftFromOffice } from "./legislation-docket";
import {
  recordedTermFixture,
  moveToTermDate,
  winnerQualification,
} from "../../tests/fixtures/recorded-legislative-term";

function termWork(world: World) {
  return world.history.workRelationships.find((r) =>
    legislativeTermForRelationship(world, r.id),
  )!;
}
function reopen(world: World) {
  return deserializeWorld(serializeWorld(world));
}

describe("recorded result, supported term and legitimate office continuity", () => {
  it("withholds result-day authority, enters on the clock, files through S, and reopens", () => {
    const fixture = recordedTermFixture();
    const work = termWork(fixture.world);
    const term = legislativeTermForRelationship(fixture.world, work.id)!;
    expect(work.personId).toBe(fixture.personId);
    expect(workStatusAt(fixture.world, work.id)?.status).toBe("expected");
    expect(resolveActiveMemberSeat(fixture.world, fixture.personId).kind).toBe(
      "unseated",
    );
    expect(
      resolveLegislativeFilingEntry(fixture.world, fixture.personId).kind,
    ).toBe("unavailable");
    const before = reopen(moveToTermDate(fixture.world, "2026-12-31"));
    expect(activeLegislativeTermEvidence(before, work.id)).toBeNull();
    const entered = reopen(moveToTermDate(before, term.startsAt));
    expect(
      winnerQualification(entered, fixture.personId, fixture.contest.id)
        .eligible,
    ).toBe(true);
    expect(workStatusAt(entered, work.id)?.status).toBe("active");
    expect(resolveActiveMemberSeat(entered, fixture.personId).kind).toBe(
      "seated",
    );
    expect(resolveLegislativeFilingEntry(entered, fixture.personId).kind).toBe(
      "available",
    );
    expect(entered.people[fixture.personId]).toEqual(
      fixture.world.people[fixture.personId],
    );
    expect(entered.history.householdLocations).toEqual(
      fixture.world.history.householdLocations,
    );
    const filed = fileDraftFromOffice(entered, {
      playerPersonId: fixture.personId,
      scenarioKey: "kentucky",
      jurisdictionId: term.governing.id,
      familyKey: "education-facilities",
      variantKey: "school-repair-authorization",
    });
    expect(
      filed.world.history.legislativeMeasures?.at(-1)?.sponsorPersonId,
    ).toBe(fixture.personId);
    const loaded = reopen(filed.world);
    expect(resolveActiveMemberSeat(loaded, fixture.personId).kind).toBe(
      "seated",
    );
    expect(loaded.history.legislativeMeasures).toEqual(
      filed.world.history.legislativeMeasures,
    );
    assertWorldIntegrity(loaded);
  }, 60_000);

  it("expires at the dated boundary and refuses a stale office action without mutation", () => {
    const fixture = recordedTermFixture();
    const work = termWork(fixture.world);
    const term = legislativeTermForRelationship(fixture.world, work.id)!;
    const entered = moveToTermDate(fixture.world, term.startsAt);
    const expired = reopen(moveToTermDate(entered, term.endsAt));
    const bytes = serializeWorld(expired);
    expect(workStatusAt(expired, work.id)?.status).toBe("ended");
    expect(activeLegislativeTermEvidence(expired, work.id)).toBeNull();
    expect(resolveActiveMemberSeat(expired, fixture.personId).kind).toBe(
      "unseated",
    );
    expect(() =>
      fileDraftFromOffice(expired, {
        playerPersonId: fixture.personId,
        scenarioKey: "kentucky",
        jurisdictionId: term.governing.id,
        familyKey: "education-facilities",
        variantKey: "school-repair-authorization",
      }),
    ).toThrow();
    expect(serializeWorld(expired)).toBe(bytes);
    expect(
      activeWorkRelationshipsAt(expired, fixture.personId).some(
        (r) => r.relationship.id === work.id,
      ),
    ).toBe(false);
  }, 60_000);

  it("binds a rival result to the rival and checks its independent qualification", () => {
    const fixture = recordedTermFixture("rival");
    const work = termWork(fixture.world);
    const term = legislativeTermForRelationship(fixture.world, work.id)!;
    expect(work.personId).toBe(fixture.winnerPersonId);
    expect(fixture.winnerPersonId).not.toBe(fixture.personId);
    const world = reopen(moveToTermDate(fixture.world, term.startsAt));
    const qualified = winnerQualification(
      world,
      fixture.winnerPersonId,
      fixture.contest.id,
    ).eligible;
    expect(qualified).toBe(true);
    expect(workStatusAt(world, work.id)?.status).toBe("active");
    expect(resolveActiveMemberSeat(world, fixture.personId).kind).toBe(
      "unseated",
    );
    expect(world.control).toEqual(fixture.world.control);
    expect(world.people[fixture.personId]).toEqual(
      fixture.world.people[fixture.personId],
    );
    expect(
      world.history.futureDueItemStates.find(
        (s) =>
          (s.dueItemId === term.entry.id && s.status === "blocked") ||
          (s.dueItemId === term.entry.id && s.status === "resolved"),
      ),
    ).toBeDefined();
  }, 60_000);

  it("enters the independently qualified rival without granting the loser an office", () => {
    const fixture = recordedTermFixture("qualified-rival");
    const work = termWork(fixture.world);
    const term = legislativeTermForRelationship(fixture.world, work.id)!;
    const world = reopen(moveToTermDate(fixture.world, term.startsAt));
    expect(
      winnerQualification(world, fixture.winnerPersonId, fixture.contest.id)
        .eligible,
    ).toBe(true);
    expect(workStatusAt(world, work.id)?.status).toBe("active");
    const seat = resolveActiveMemberSeat(world, fixture.winnerPersonId);
    expect(seat.kind).toBe("seated");
    if (seat.kind !== "seated") throw new Error(seat.reason);
    expect(seat.seat.chamberKey).toBe("house");
    expect(seat.seat.electionResultId).toBe(term.result.id);
    expect(resolveActiveMemberSeat(world, fixture.personId).kind).toBe(
      "unseated",
    );
    expect(world.control).toEqual(fixture.world.control);
    expect(world.people[fixture.personId]).toEqual(
      fixture.world.people[fixture.personId],
    );
    assertWorldIntegrity(world);
  }, 60_000);

  it("refuses a deceased winner separately from the recorded outcome", () => {
    const fixture = recordedTermFixture();
    const work = termWork(fixture.world);
    const blocked = recordPersonDeath(fixture.world, {
      stableKey: "rest37:winner-deceased",
      personId: fixture.personId,
      diedAt: fixture.world.currentDate,
      causeKey: "custom:fixture-death",
      sourceEntityIds: [fixture.personId],
      summary: "Explicit fictional fixture death after the recorded result.",
      provenance: {
        kind: "authored",
        note: "Supplied deceased-winner test input; the election is not asserted as a cause.",
      },
    });
    const world = reopen(moveToTermDate(blocked, work.startedAt));
    expect(workStatusAt(world, work.id)?.status).toBe("expected");
    expect(resolveActiveMemberSeat(world, fixture.personId).kind).toBe(
      "unseated",
    );
  }, 60_000);

  it("refuses changed-office workplace evidence after entry and reload", () => {
    const fixture = recordedTermFixture();
    const work = termWork(fixture.world);
    const entered = moveToTermDate(fixture.world, work.startedAt);
    const role = workRoleAt(entered, work.id)!;
    const changed = reopen(
      recordWorkRole(entered, {
        stableKey: "rest37:changed-office-workplace",
        workRelationshipId: work.id,
        effectiveAt: entered.currentDate,
        title: role.title,
        occupationClassification: role.occupationClassification,
        locationJurisdictionId: fixture.contest.jurisdictionId,
        timeDemand: role.timeDemand,
        provenance: {
          kind: "authored",
          note: "Explicit fixture workplace change; no compatibility law inferred.",
        },
        supersedesRoleId: role.id,
      }),
    );
    const bytes = serializeWorld(changed);
    expect(activeLegislativeTermEvidence(changed, work.id)).toBeNull();
    expect(resolveActiveMemberSeat(changed, fixture.personId).kind).toBe(
      "unseated",
    );
    expect(() =>
      fileDraftFromOffice(changed, {
        playerPersonId: fixture.personId,
        scenarioKey: "kentucky",
        jurisdictionId: role.locationJurisdictionId!,
        familyKey: "education-facilities",
        variantKey: "school-repair-authorization",
      }),
    ).toThrow();
    expect(serializeWorld(changed)).toBe(bytes);
  }, 60_000);

  it("uses only admitted dated office rules and preserves their source/version", () => {
    const house = supportedLegislativeTermDates(
      "us-ky-general-assembly-v1:house",
      "2026-11-03",
    );
    const senate = supportedLegislativeTermDates(
      "us-ky-general-assembly-v1:senate",
      "2026-11-03",
    );
    expect(house?.startsAt).toBe("2027-01-01");
    expect(house?.endsAt).toBe("2029-01-01");
    expect(senate?.endsAt).toBe("2031-01-01");
    expect(senate?.sourceUrl).toBe(house?.sourceUrl);
    expect(senate?.ruleVersion).toBe(house?.ruleVersion);
    expect(
      supportedLegislativeTermDates("unadmitted:house", "2026-11-03"),
    ).toBeNull();
  });

  it("does not reactivate an explicitly ended pending office after reload", () => {
    const fixture = recordedTermFixture();
    const work = termWork(fixture.world);
    const status = workStatusAt(fixture.world, work.id)!;
    const changed = recordWorkStatus(fixture.world, {
      stableKey: "rest37:entry-withdrawn",
      workRelationshipId: work.id,
      effectiveAt: fixture.world.currentDate,
      status: "ended",
      reason: "Explicit fixture office change.",
      provenance: {
        kind: "authored",
        note: "Fixture supplied office change, not an inferred constitutional incompatibility.",
      },
      supersedesStatusId: status.id,
    });
    const world = reopen(moveToTermDate(reopen(changed), work.startedAt));
    expect(workStatusAt(world, work.id)?.status).toBe("ended");
    expect(resolveActiveMemberSeat(world, fixture.personId).kind).toBe(
      "unseated",
    );
  }, 60_000);
});
