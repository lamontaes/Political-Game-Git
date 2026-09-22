import { afterEach, describe, expect, it } from "vitest";
import { fileForOffice } from "../../tests/fixtures/campaign-fixture";
import {
  adultLifeIn,
  passUntil,
  runToElection,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";
import {
  activeLegislativeTermEvidence,
  bindRuleCapabilityResolver,
  BLANKET_LEGISLATIVE_TERM_RULE_VERSION,
  legislativeTermDates,
  legislativeTermForRelationship,
  makeIsoDate,
  unadmittedRuleCapabilityResolver,
  workRelationshipHistoryForPerson,
  workStatusAt,
} from "../simulation";
import { projectCampaign } from "./campaign-projection";
import { projectOfficeTransition } from "./office-transition";

afterEach(() => bindRuleCapabilityResolver(unadmittedRuleCapabilityResolver));

describe("a legislative term in a state with no sourced term rule", () => {
  it("uses the sourced rule where there is one and the marked blanket everywhere else", () => {
    const election = makeIsoDate("2026-11-03");
    const ky = legislativeTermDates(
      "us-ky-general-assembly-v1:house",
      election,
    )!;
    expect(ky.basis).toBe("sourced");
    expect([ky.startsAt, ky.endsAt]).toEqual(["2027-01-01", "2029-01-01"]);

    const ilHouse = legislativeTermDates(
      "us-il-general-assembly-v1:house",
      election,
    )!;
    expect(ilHouse.basis).toBe("blanket");
    expect(ilHouse.ruleVersion).toBe(BLANKET_LEGISLATIVE_TERM_RULE_VERSION);
    expect([ilHouse.startsAt, ilHouse.endsAt]).toEqual([
      "2027-01-01",
      "2029-01-01",
    ]);
    expect(
      legislativeTermDates("us-nv-legislature-v1:senate", election)!.endsAt,
    ).toBe("2031-01-01");
    // A known term length from the qualification corpus beats the blanket.
    expect(
      legislativeTermDates("us-ak-legislature-v1:senate", election)!.endsAt,
    ).toBe("2031-01-01");
    // Not a legislative office the game offers: no invented term.
    expect(legislativeTermDates("fixture:no-such-office", election)).toBeNull();
  });

  it("is not seated on election night in Illinois: it waits, shows the transition, and is seated when the term begins", () => {
    const { world, personId } = adultLifeIn("IL", "blanket-term-IL");
    const decided = runToElection(
      fileForOffice(world, personId),
      personId,
      suppliedWin(personId),
    );
    expect(projectCampaign(decided, personId).phase).toBe("won");
    const seat = workRelationshipHistoryForPerson(decided, personId).find(
      (relationship) => relationship.kind === "employment:legislative-member",
    )!;
    expect(seat).toBeDefined();
    expect(workStatusAt(decided, seat.id)?.status).toBe("expected");
    const term = legislativeTermForRelationship(decided, seat.id)!;
    expect(term.entry.stableKey).toContain(
      BLANKET_LEGISLATIVE_TERM_RULE_VERSION,
    );
    expect(activeLegislativeTermEvidence(decided, seat.id)).toBeNull();
    expect(projectCampaign(decided, personId).afterword).toMatch(
      /The term begins January 1, \d{4}; until then the office is not theirs\./,
    );
    expect(projectOfficeTransition(decided, personId)?.startsAt).toBe(
      term.startsAt,
    );

    const seated = passUntil(decided, term.startsAt);
    expect(workStatusAt(seated, seat.id)?.status).toBe("active");
    expect(activeLegislativeTermEvidence(seated, seat.id)).not.toBeNull();
    expect(projectOfficeTransition(seated, personId)).toBeNull();
  }, 600_000);
});
