import { describe, expect, it } from "vitest";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import {
  adultLifeAt,
  adultLifeIn,
  passUntil,
  runToElection,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";
import {
  activeWorkRelationshipsAt,
  campaignForCandidate,
  legislativeTermForRelationship,
  requireElectionContest,
  serializeWorld,
  workRelationshipHistoryForPerson,
  workStatusAt,
  type EntityId,
  type World,
} from "../simulation";
import {
  campaignElectionDate,
  fileForOffice as fileOnCalendar,
  projectCampaign,
} from "./campaign-projection";
import { stateExecutiveOfficeCalendar } from "./nationwide-candidacy";
import { projectCampaignOffices } from "./campaign-office-discovery";
import { projectWorkRole } from "./day-overview";
import { proseDate } from "./prose-dates";

function seats(world: World, personId: EntityId) {
  return workRelationshipHistoryForPerson(world, personId).filter(
    (relationship) => relationship.kind === "employment:legislative-member",
  );
}

function activeSeats(world: World, personId: EntityId) {
  return activeWorkRelationshipsAt(world, personId).filter(
    (entry) => entry.relationship.kind === "employment:legislative-member",
  );
}

describe("a Nevada Assembly seat's term", () => {
  it("ends on its date during ordinary days, and the seat leaves the work line", () => {
    const { world, personId } = adultLifeIn("NV", "seat-terms-nv-expiry");
    const won = runToElection(
      fileForOffice(world, personId),
      personId,
      suppliedWin(personId),
    );
    const seat = seats(won, personId)[0]!;
    const term = legislativeTermForRelationship(won, seat.id)!;
    const title = projectCampaign(won, personId).officeTitle;

    const seated = passUntil(won, term.startsAt);
    expect(workStatusAt(seated, seat.id)?.status).toBe("active");
    expect(projectWorkRole(seated, personId).roles).toContain(title);

    const after = passUntil(seated, term.endsAt);
    expect(after.currentDate >= term.endsAt).toBe(true);
    expect(workStatusAt(after, seat.id)?.status).toBe("ended");
    expect(activeSeats(after, personId)).toEqual([]);
    expect(projectWorkRole(after, personId).roles).not.toContain(title);
  }, 600_000);

  it("is continued, not doubled, when the member runs again for the seat and wins", () => {
    const { world, personId } = adultLifeIn("NV", "seat-terms-nv-refile");
    const first = runToElection(
      fileForOffice(world, personId),
      personId,
      suppliedWin(personId),
    );
    const firstSeat = seats(first, personId)[0]!;
    const firstTerm = legislativeTermForRelationship(first, firstSeat.id)!;
    const seated = passUntil(first, firstTerm.startsAt);
    expect(activeSeats(seated, personId)).toHaveLength(1);

    const again = runToElection(
      fileForOffice(seated, personId),
      personId,
      suppliedWin(personId),
    );
    expect(projectCampaign(again, personId).phase).toBe("won");
    const secondSeat = seats(again, personId).find(
      (relationship) => relationship.id !== firstSeat.id,
    )!;
    const secondTerm = legislativeTermForRelationship(again, secondSeat.id)!;
    // The term is still ahead, but the member already sits in this seat.
    expect(secondTerm.startsAt < firstTerm.endsAt).toBe(true);
    expect(projectCampaign(again, personId).afterword).toBe(
      `${projectCampaign(again, personId).candidateName} won and keeps the seat. The new term begins ${proseDate(secondTerm.startsAt)}.`,
    );

    const renewed = passUntil(again, secondTerm.startsAt);
    expect(
      activeSeats(renewed, personId).map((entry) => entry.relationship.id),
    ).toEqual([secondSeat.id]);
    expect(workStatusAt(renewed, firstSeat.id)?.status).toBe("ended");
    expect(workStatusAt(renewed, firstSeat.id)?.effectiveAt).toBe(
      secondTerm.startsAt,
    );
  }, 600_000);
});

describe("office discovery's election date", () => {
  it("reads the office's own calendar, then the recorded contest, as a date and nothing else", () => {
    const { world, personId } = adultLifeIn("NV", "seat-terms-nv-discovery");
    const before = serializeWorld(world);
    const offices = projectCampaignOffices(world, personId);
    expect(offices.length).toBeGreaterThan(0);
    for (const office of offices) {
      const date = campaignElectionDate(
        world,
        world.people[personId]!.homeJurisdictionId,
        office.officeKey,
      );
      expect(office.timing).toBe(`The next election is ${proseDate(date)}.`);
      expect(office.timing).not.toMatch(
        /recorded|contest|simulated|authored|\d{4}-\d{2}-\d{2}/,
      );
    }
    // Eligibility is said plainly, not in the rules' own vocabulary.
    for (const office of offices.filter((office) => office.eligible))
      expect(office.eligibility).toBe("You can stand for this office.");
    expect(serializeWorld(world)).toBe(before);

    const filed = fileForOffice(world, personId);
    const contest = requireElectionContest(
      filed,
      campaignForCandidate(filed, personId)!.contestId,
    );
    const own = projectCampaignOffices(filed, personId).find(
      (office) => office.officeKey === contest.office.officeKey,
    )!;
    // The fixture's short authored race, not the calendar date.
    expect(own.timing).toBe(
      `The next election is ${proseDate(contest.electionDate)}.`,
    );
  });
});

describe("Anchorage, Alaska, filing in October of an election year", () => {
  it("offers only future election dates, and says the governor's field has closed", () => {
    const opened = adultLifeAt("0203000", "seat-terms-ak-october");
    const world = passUntil(opened.world, "2026-10-05");
    const personId = opened.personId;
    expect(world.currentDate).toBe("2026-10-05");
    const home = world.people[personId]!.homeJurisdictionId;
    const offices = projectCampaignOffices(world, personId);
    expect(offices.length).toBeGreaterThan(0);
    for (const office of offices)
      expect(
        campaignElectionDate(world, home, office.officeKey) > world.currentDate,
      ).toBe(true);

    // The town's own body, on its own calendar, is filed for a future day.
    const assembly = offices.find((office) =>
      office.officeKey.endsWith("-governing-body"),
    )!;
    const filed = fileOnCalendar(world, personId, null, assembly.officeKey);
    const contest = requireElectionContest(
      filed,
      campaignForCandidate(filed, personId)!.contestId,
    );
    expect(contest.electionDate > world.currentDate).toBe(true);

    // Alaska's 2026 governor's race is past its field's close by October.
    const calendar = stateExecutiveOfficeCalendar(world, "AK")!;
    expect(calendar.closedElection).toBe("2026-11-03");
    expect(calendar.nextElection > calendar.closedElection!).toBe(true);
  }, 600_000);
});
