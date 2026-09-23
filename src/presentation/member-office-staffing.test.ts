import { describe, expect, it } from "vitest";

import {
  LEGISLATIVE_MEMBER_STAFF_PROFILE,
  deserializeWorld,
  hireOfficeStaff,
  officeStaffPositionRecords,
  openOfficeStaffSearch,
  recordWorkStatus,
  serializeWorld,
  workStatusAt,
  type World,
} from "../simulation";
import { activeMemberSeats } from "./legislative-member-seat";
import {
  listOfficeStaff,
  memberStaffOffice,
  projectOfficeOnboarding,
} from "./office-onboarding";
import {
  addSuppliedLegislativeSeat,
  suppliedLegislativeSeat,
} from "../../tests/fixtures/supplied-legislative-seat";

function done(result: ReturnType<typeof openOfficeStaffSearch>): World {
  if (result.kind !== "done") throw new Error(result.reason);
  return result.world;
}

describe("a seated legislator hires office staff", () => {
  it("offers applicants for each placeholder position and hires one into it", () => {
    const member = suppliedLegislativeSeat("US-NE", "legislature");
    const before = projectOfficeOnboarding(member.world, member.personId);
    if (before.membership.kind !== "seated") throw new Error("not seated");
    const seat = before.membership.seat;
    // Reading the office writes nothing and authorizes nothing.
    expect(before.staffing?.authorized).toBe(false);
    expect(officeStaffPositionRecords(member.world)).toHaveLength(0);

    const office = memberStaffOffice(member.world, seat, member.personId);
    let world = done(openOfficeStaffSearch(member.world, office));
    const searched = projectOfficeOnboarding(world, member.personId);
    expect(searched.staffing?.openings.map((o) => o.title)).toEqual([
      "Legislative Aide",
      "Constituent Caseworker",
    ]);
    for (const opening of searched.staffing!.openings)
      expect(opening.candidates).toHaveLength(3);
    expect(
      officeStaffPositionRecords(world).every(
        (record) =>
          record.profile === LEGISLATIVE_MEMBER_STAFF_PROFILE &&
          record.civilClass === "unknown",
      ),
    ).toBe(true);

    // Asking again writes nothing new.
    const again = done(openOfficeStaffSearch(world, office));
    expect(serializeWorld(again)).toBe(serializeWorld(world));

    const aide = searched.staffing!.openings[0]!;
    const chosen = aide.candidates[1]!.personId;
    world = done(
      hireOfficeStaff(world, office, {
        positionId: aide.positionId,
        personId: chosen,
      }),
    );
    const after = projectOfficeOnboarding(world, member.personId);
    expect(after.staffing?.filled).toEqual([
      {
        positionId: aide.positionId,
        title: "Legislative Aide",
        personId: chosen,
      },
    ]);
    expect(after.staffing?.openings.map((o) => o.title)).toEqual([
      "Constituent Caseworker",
    ]);
    // The office briefing, which was empty, now reads the hire.
    expect(after.briefing.kind).toBe("staffed");
    expect(after.briefing.staff.map((s) => s.personId)).toEqual([chosen]);
    expect(after.briefing.staff[0]!.title).toBe("Legislative Aide");

    // Survives save and reopen.
    const reopened = deserializeWorld(serializeWorld(world));
    expect(
      projectOfficeOnboarding(reopened, member.personId).staffing?.filled,
    ).toHaveLength(1);
  });

  it("refuses somebody who did not apply, and a position already held", () => {
    const member = suppliedLegislativeSeat("US-AK", "house");
    const seat = activeMemberSeats(member.world, member.personId)[0]!;
    const office = memberStaffOffice(member.world, seat, member.personId);
    let world = done(openOfficeStaffSearch(member.world, office));
    const opening = projectOfficeOnboarding(world, member.personId).staffing!
      .openings[0]!;
    const outsider = hireOfficeStaff(world, office, {
      positionId: opening.positionId,
      personId: member.personId,
    });
    expect(outsider.kind).toBe("refused");
    world = done(
      hireOfficeStaff(world, office, {
        positionId: opening.positionId,
        personId: opening.candidates[0]!.personId,
      }),
    );
    const twice = hireOfficeStaff(world, office, {
      positionId: opening.positionId,
      personId: opening.candidates[2]!.personId,
    });
    expect(twice).toEqual({
      kind: "refused",
      reason: "Somebody already holds the Legislative Aide position.",
    });
  });

  it("keeps each seat's staff with that seat's office", () => {
    const first = suppliedLegislativeSeat("US-AK", "house");
    const both = addSuppliedLegislativeSeat(
      first.world,
      first.personId,
      "US-AK",
      "senate",
      "s30-s:second-seat",
    );
    const seats = activeMemberSeats(both.world, both.personId);
    const house = seats.find((seat) => seat.chamberKey === "house")!;
    const senate = seats.find((seat) => seat.chamberKey === "senate")!;
    const houseOffice = memberStaffOffice(both.world, house, both.personId);
    let world = done(openOfficeStaffSearch(both.world, houseOffice));
    const opening = world.history.officeStaffPositions!.find(
      (record) => record.officeKey === houseOffice.officeKey,
    )!;
    const applicant = world.history.events
      .filter((event) => event.type === "governing.staff-candidates-offered")
      .find((event) => event.tags.includes(`position:${opening.id}`))!
      .participants.find((p) => p.role === "focus:candidate")!.personId;
    world = done(
      hireOfficeStaff(world, houseOffice, {
        positionId: opening.id,
        personId: applicant,
      }),
    );
    expect(
      listOfficeStaff(world, house, both.personId).map((s) => s.personId),
    ).toEqual([applicant]);
    if (house.organizationId === senate.organizationId)
      expect(listOfficeStaff(world, senate, both.personId)).toEqual([]);
  });

  it("reopens a position when the employment behind it ends", () => {
    const member = suppliedLegislativeSeat("US-AK", "house");
    const seat = activeMemberSeats(member.world, member.personId)[0]!;
    const office = memberStaffOffice(member.world, seat, member.personId);
    let world = done(openOfficeStaffSearch(member.world, office));
    const opening = projectOfficeOnboarding(world, member.personId).staffing!
      .openings[0]!;
    const first = opening.candidates[0]!.personId;
    world = done(
      hireOfficeStaff(world, office, {
        positionId: opening.positionId,
        personId: first,
      }),
    );
    const work = world.history.workRelationships.find(
      (relationship) =>
        relationship.personId === first &&
        relationship.kind === "employment:legislative-staff",
    )!;
    expect(workStatusAt(world, work.id)?.status).toBe("active");
    const previous = workStatusAt(world, work.id)!;
    world = recordWorkStatus(world, {
      stableKey: "test:aide-quit",
      workRelationshipId: work.id,
      effectiveAt: world.currentDate,
      status: "ended",
      reason: "The aide left the office.",
      supersedesStatusId: previous.id,
      provenance: { kind: "authored", note: "test" },
    });
    const reopened = projectOfficeOnboarding(world, member.personId).staffing!;
    const again = reopened.openings.find(
      (o) => o.positionId === opening.positionId,
    )!;
    // A fresh search: the earlier applicants are not silently re-offered.
    expect(again.candidates).toEqual([]);
    world = done(openOfficeStaffSearch(world, office));
    const fresh = projectOfficeOnboarding(
      world,
      member.personId,
    ).staffing!.openings.find((o) => o.positionId === opening.positionId)!;
    expect(fresh.candidates).toHaveLength(3);
    expect(fresh.candidates.map((c) => c.personId)).not.toContain(first);
  });

  it("refuses to hire for an office the controlled person does not hold", () => {
    const member = suppliedLegislativeSeat("US-AK", "house");
    const seat = activeMemberSeats(member.world, member.personId)[0]!;
    const office = {
      ...memberStaffOffice(member.world, seat, member.personId),
      holderPersonId: "person:somebody-else" as typeof member.personId,
    };
    expect(openOfficeStaffSearch(member.world, office).kind).toBe("refused");
  });
});
