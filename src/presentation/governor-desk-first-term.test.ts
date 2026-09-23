import { afterEach, describe, expect, it } from "vitest";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import {
  adultLifeIn,
  passUntil,
  runToElection,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";
import {
  addDays,
  bindRuleCapabilityResolver,
  currentGoverningOffices,
  governingOutcomes,
  recordOfficeWorkflowPreference,
  unadmittedRuleCapabilityResolver,
  workRelationshipHistoryForPerson,
} from "../simulation";
import { projectGoverningBriefing } from "./governing-briefing";
import { projectGoverningOfficeDesk } from "./governing-office-desk";
import { fileForStateExecutiveOffice } from "./nationwide-candidacy";
import { projectOfficeTransition } from "./office-transition";

afterEach(() => bindRuleCapabilityResolver(unadmittedRuleCapabilityResolver));

describe("a governor's first weeks in office", () => {
  it("can arrange casework without a voting workflow, and reads only this term's outcomes", () => {
    const { world, personId } = adultLifeIn("NV", "governor-desk-first-term");
    const decided = runToElection(
      fileForStateExecutiveOffice(world, personId),
      personId,
      suppliedWin(personId),
    );
    const startsAt = projectOfficeTransition(decided, personId)!.startsAt;
    const inOffice = passUntil(decided, addDays(startsAt, 14));

    // Casework was "set up when you take the office", and never was: a
    // governor casts no votes, so the voting half of the record never came.
    const desk = projectGoverningOfficeDesk(inOffice, personId)!;
    expect(desk.casework).not.toBeNull();
    expect(desk.casework!.mode).toBeNull();
    expect(desk.casework!.votingMode).toBeNull();
    expect(desk.caseworkNote).toBeNull();

    const recorded = recordOfficeWorkflowPreference(inOffice, {
      personId,
      officeRelationshipId: desk.casework!.officeRelationshipId,
      votingMode: null,
      caseworkMode: "staff-routine-player-exceptions",
    });
    expect(recorded.kind).toBe("recorded");
    if (recorded.kind !== "recorded") return;
    const after = projectGoverningOfficeDesk(recorded.world, personId)!;
    expect(after.casework!.mode).toBe("staff-routine-player-exceptions");
    expect(after.casework!.votingMode).toBeNull();

    // What came of it is this governor's, not the predecessor's.
    const office = currentGoverningOffices(inOffice).find(
      (candidate) => candidate.holderPersonId === personId,
    )!;
    expect(
      governingOutcomes(inOffice, office.officeKey).some(
        (event) => event.occurredAt < office.termStartedAt!,
      ),
    ).toBe(true);
    for (const entry of projectGoverningBriefing(inOffice, personId)!.recent)
      expect(Date.parse(entry.date)).toBeGreaterThanOrEqual(
        Date.parse(`${office.termStartedAt}T00:00:00Z`),
      );
  }, 600_000);

  it("still refuses a legislative seat's record without a voting workflow", () => {
    const { world, personId } = adultLifeIn("ME", "governor-desk-legislator");
    const decided = runToElection(
      fileForOffice(world, personId),
      personId,
      suppliedWin(personId),
    );
    const seated = passUntil(
      decided,
      projectOfficeTransition(decided, personId)!.startsAt,
    );
    const seat = workRelationshipHistoryForPerson(seated, personId).find(
      (relationship) => relationship.kind === "employment:legislative-member",
    )!;
    const refused = recordOfficeWorkflowPreference(seated, {
      personId,
      officeRelationshipId: seat.id,
      votingMode: null,
      caseworkMode: "player-handles-all",
    });
    expect(refused.kind).toBe("refused");
  }, 600_000);
});
