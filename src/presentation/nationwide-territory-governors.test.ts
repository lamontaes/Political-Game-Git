/*
 * The territories' Governors, played.
 *
 * Puerto Rico, Guam, the U.S. Virgin Islands, American Samoa and the Northern
 * Mariana Islands each elect their own Governor. None of the offices' rules has
 * been retrieved yet, so every qualification and term value is the game's own
 * national-range profile, exactly as for an unread state; what this file holds
 * is that a territory life sees its own territory's office, never a state's,
 * and can stand for it through the ordinary campaign and contest route.
 */
import { afterEach, describe, expect, it } from "vitest";

import { residentIn } from "../../tests/fixtures/state-executive-entry";
import {
  CHIEF_EXECUTIVE_JURISDICTIONS,
  bindRuleCapabilityResolver,
  chiefExecutiveJurisdictionName,
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
  unadmittedRuleCapabilityResolver,
} from "../simulation";
import {
  fileForStateExecutiveOffice,
  stateExecutiveCandidacyForPerson,
  stateExecutiveEntryStatus,
  stateExecutiveOfficeCalendar,
} from "./nationwide-candidacy";

afterEach(() => bindRuleCapabilityResolver(unadmittedRuleCapabilityResolver));

const TERRITORIES = [
  ["PR", "Governor of Puerto Rico", "Puerto Rico"],
  ["GU", "Governor of Guam", "Guam"],
  ["VI", "Governor of the U.S. Virgin Islands", "U.S. Virgin Islands"],
  ["AS", "Governor of American Samoa", "American Samoa"],
  [
    "MP",
    "Governor of the Northern Mariana Islands",
    "Northern Mariana Islands",
  ],
] as const;

describe("a territory's own Governor", () => {
  it("counts the five territories among the governments with a chief executive", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    for (const [usps] of TERRITORIES) {
      expect(CHIEF_EXECUTIVE_JURISDICTIONS).toContain(usps);
    }
  });

  it.each(TERRITORIES)(
    "%s: a resident sees the territory's own office",
    (usps, displayName, name) => {
      const { world, personId } = residentIn(
        usps,
        `territory-governor-${usps}`,
      );
      const candidacy = stateExecutiveCandidacyForPerson(world, personId)!;
      expect(candidacy.identity.stateUsps).toBe(usps);
      expect(candidacy.identity.title).toBe("Governor");
      expect(candidacy.identity.displayName).toBe(displayName);
      expect(chiefExecutiveJurisdictionName(usps)).toBe(name);
    },
  );

  it.each(TERRITORIES)(
    "%s: seats one Governor on the territory's own jurisdiction",
    (usps, displayName) => {
      const { world, personId } = residentIn(usps, `territory-seat-${usps}`);
      const next = ensureStateExecutiveIncumbent(world, personId, usps);
      const holders = currentStateExecutiveHolders(next).filter(
        (holder) => holder.stateUsps === usps,
      );
      expect(holders).toHaveLength(1);
      expect(holders[0]!.title).toBe(displayName);
    },
  );

  it.each(TERRITORIES)(
    "%s: files into the territory's own election, on the game's own calendar",
    (usps) => {
      const { world, personId } = residentIn(usps, `territory-file-${usps}`);
      const candidacy = stateExecutiveCandidacyForPerson(world, personId)!;
      const calendar = stateExecutiveOfficeCalendar(world, usps)!;
      // Nothing about the real office's term was read, so the calendar is the
      // game's profile and says nothing that sounds sourced.
      expect(calendar.basis).toBe("game-profile");
      // An adult resident with nothing against them can stand.
      expect(candidacy.blocks).toEqual([]);
      expect(candidacy.eligible).toBe(true);
      const filed = fileForStateExecutiveOffice(world, personId);
      const contest = filed.history.electionContests!.at(-1)!;
      expect(contest.electionDate).toBe(calendar.nextElection);
      expect(contest.jurisdictionId).toBe(candidacy.jurisdictionId);
      expect(stateExecutiveEntryStatus(filed, personId).kind).toBe(
        "pending-election",
      );
    },
  );
});
