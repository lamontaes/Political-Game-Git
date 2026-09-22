import { describe, expect, it } from "vitest";
import {
  adultLifeIn,
  passUntil,
  runToElection,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";

import { addDays } from "../simulation";
import {
  fileForStateExecutiveOffice,
  qualifyForStateExecutiveTerm,
  stateExecutiveCandidacyForPerson,
  stateExecutiveEntryStatus,
  stateExecutiveOfficeCalendar,
  stateExecutiveReelection,
} from "./nationwide-candidacy";

/**
 * A sitting governor in the corrupt-life replay could not file for re-election:
 * the Campaigns screen said only when her term ended. An incumbent may stand
 * again unless a term limit says otherwise, and the game says which.
 */
describe("a sitting governor can run for another term", () => {
  it("lets a first-term Alaska governor file for the next election", () => {
    const { world, personId } = adultLifeIn("AK", "governor-reelection");
    const filed = fileForStateExecutiveOffice(world, personId);
    const decided = runToElection(filed, personId, suppliedWin(personId));
    const planned = stateExecutiveEntryStatus(decided, personId);
    if (planned.kind !== "awaiting-qualification")
      throw new Error(`Expected a won term, found ${planned.kind}`);
    const serving = passUntil(
      qualifyForStateExecutiveTerm(decided, personId),
      addDays(planned.startsAt, 400),
    );
    expect(stateExecutiveEntryStatus(serving, personId).kind).toBe("in-office");
    const calendar = stateExecutiveOfficeCalendar(serving, "AK")!;
    expect(calendar.nextElection <= planned.endsAt).toBe(true);

    const reelection = stateExecutiveReelection(serving, personId);
    expect(reelection).toEqual({ canStand: true, reason: null });
    const candidacy = stateExecutiveCandidacyForPerson(serving, personId)!;
    expect(candidacy.eligible).toBe(true);
    const refiled = fileForStateExecutiveOffice(serving, personId);
    const contest = refiled.history.electionContests!.at(-1)!;
    expect(contest.electionDate).toBe(calendar.nextElection);
    expect(contest.candidatePersonIds).toContain(personId);
  }, 900_000);
});
