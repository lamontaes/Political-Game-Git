import { describe, expect, it } from "vitest";
import {
  adultLifeIn,
  passUntil,
  runToElection,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";

import { addDays } from "../simulation/dates";
import {
  activeWorkRelationshipsAt,
  workStatusAt,
} from "../simulation/life-queries";
import { CONGRESS_MEMBER_WORK_KIND } from "../simulation/living-world/congress-member-work";
import {
  PAID_OFFICE_KINDS,
  settleOfficeSalaries,
} from "../simulation/office-salary";
import { personName, type World } from "../simulation";
import {
  congressCandidacyForPerson,
  congressSeatStatus,
  fileForCongressSeat,
} from "./congress-candidacy";
import { projectGovernmentBrowser } from "./politics-government";

function ordinaryJobs(world: World, personId: string) {
  return activeWorkRelationshipsAt(world, personId as never).filter(
    ({ relationship }) =>
      relationship.kind.startsWith("employment:") &&
      !PAID_OFFICE_KINDS.includes(relationship.kind),
  );
}

describe("a member of Congress is paid for the seat", () => {
  it("starts a paid job on January 3, keeps the jobs they had, and ends with the term", () => {
    const { world, personId } = adultLifeIn("OR", "congress-work-or");
    // The seat for the district the home is recorded in, so the Government
    // screen's "represented by" row for that home is the player's own seat.
    const house = congressCandidacyForPerson(world, personId)!.seats.find(
      (seat) =>
        seat.identity.seat.chamberKey === "us-house" &&
        seat.eligible &&
        seat.homeDistrict === "recorded",
    );
    if (!house)
      throw new Error("This seed's player cannot stand for the House.");
    const filed = fileForCongressSeat(
      world,
      personId,
      house.identity.officeKey,
    );
    const decided = runToElection(filed, personId, suppliedWin(personId));
    const status = congressSeatStatus(decided, personId);
    if (status.kind !== "won-awaiting-term") throw new Error(status.kind);
    const jobsBefore = ordinaryJobs(decided, personId);

    // Play settles office pay as each day opens; the fixture's day pass
    // does not, so settle it the way the first day and a later one would.
    const firstDay = settleOfficeSalaries(
      passUntil(decided, addDays(status.startsAt, 1)),
      personId,
    );
    const seated = settleOfficeSalaries(
      passUntil(firstDay, addDays(status.startsAt, 22)),
      personId,
    );
    const seatWork = activeWorkRelationshipsAt(seated, personId).filter(
      ({ relationship }) => relationship.kind === CONGRESS_MEMBER_WORK_KIND,
    );
    expect(seatWork).toHaveLength(1);
    const work = seatWork[0]!.relationship;
    expect(work.startedAt).toBe(status.startsAt);
    expect(seatWork[0]!.role.title).toMatch(/Representative/);

    // Jobs held on election night are kept: whether a member may keep them
    // is not a rule on file yet.
    expect(
      ordinaryJobs(seated, personId).map((job) => job.relationship.id),
    ).toEqual(jobsBefore.map((job) => job.relationship.id));

    // Three weeks in, the seat has paid weekly.
    const paid = seated.history.resourceTransferOutcomes.filter((outcome) =>
      seated.history.resourceFlows.some(
        (flow) =>
          flow.id === outcome.resourceFlowId &&
          flow.basisReference.kind === "work" &&
          flow.basisReference.workRelationshipId === work.id,
      ),
    );
    expect(paid.length).toBeGreaterThanOrEqual(2);

    // The Government screen shows the home's recorded district, whose seat
    // the member now holds.
    const government = projectGovernmentBrowser(seated, personId);
    const row = government.representedBy!.find((r) => r.key === "us-house")!;
    expect(row.district).toMatch(/^Oregon, district \d+$/);
    expect(row.holders.map((holder) => holder.name)).toEqual([
      personName(seated.people[personId]!),
    ]);
    expect(row.note).toBeNull();

    // A member who did not file again leaves the seat, and its job, when the
    // term ends.
    const after = passUntil(seated, addDays(status.endsAt, 1));
    expect(workStatusAt(after, work.id)?.status).toBe("ended");
  }, 900_000);
});
