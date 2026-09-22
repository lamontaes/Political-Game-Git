import { afterEach, describe, expect, it } from "vitest";
import {
  adultLifeIn,
  passUntil,
  runToElection,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";
import {
  bindRuleCapabilityResolver,
  unadmittedRuleCapabilityResolver,
} from "../simulation";
import { projectCampaign } from "./campaign-projection";
import { projectToday, projectWorkRole } from "./day-overview";
import { projectHouseholdPapers } from "./household-papers";
import {
  fileForStateExecutiveOffice,
  qualifyForStateExecutiveTerm,
  stateExecutiveEntryStatus,
} from "./nationwide-candidacy";

afterEach(() => bindRuleCapabilityResolver(unadmittedRuleCapabilityResolver));

/*
 * Walked on 4965f63c in Reno and Springfield: a won governorship put "An
 * offer of work as Governor is waiting for your answer" on every screen, the
 * waiting line opened Work, and Work had no Accept for it. The answer is the
 * Qualify control on Campaigns. These say the line leads there and says so.
 */
describe("a won executive term waiting on the player", () => {
  it("names Qualify, opens Campaigns, and stops asking once qualified or lapsed", () => {
    const { world, personId } = adultLifeIn("NV", "elected-term-offer-NV");
    const filed = fileForStateExecutiveOffice(world, personId);
    const decided = runToElection(filed, personId, suppliedWin(personId));
    expect(projectCampaign(decided, personId).phase).toBe("won");
    const status = stateExecutiveEntryStatus(decided, personId);
    expect(status.kind).toBe("awaiting-qualification");
    if (status.kind !== "awaiting-qualification") return;

    const [offer] = projectWorkRole(decided, personId).awaitingAnswer;
    expect(offer?.answer).toBe("qualify");
    const key = `work-offer:${offer!.relationshipId}`;

    const waiting = projectToday(decided, personId).waiting.find(
      (entry) => entry.key === key,
    );
    expect(waiting?.sentence).toMatch(/Qualify for the term under Campaigns/);
    expect(waiting?.sentence).not.toMatch(/offer of work/);
    expect(projectWorkRole(decided, personId).sentence).toMatch(
      /Qualify for the term under Campaigns/,
    );
    const paper = projectHouseholdPapers(decided, personId).find(
      (entry) => entry.key === key,
    );
    expect(paper?.destination).toEqual({
      kind: "surface",
      surface: "work",
      section: "campaign",
    });

    const qualified = qualifyForStateExecutiveTerm(decided, personId);
    expect(projectWorkRole(qualified, personId).awaitingAnswer[0]?.answer).toBe(
      "qualified",
    );
    expect(
      projectToday(qualified, personId).waiting.some(
        (entry) => entry.key === key,
      ),
    ).toBe(false);
    expect(projectWorkRole(qualified, personId).sentence).toMatch(
      /You have qualified as .+\. The term begins/,
    );

    // Seated on the start date: no longer an offer of any kind.
    const seated = passUntil(qualified, status.startsAt);
    expect(stateExecutiveEntryStatus(seated, personId).kind).toBe("in-office");
    expect(projectWorkRole(seated, personId).awaitingAnswer).toHaveLength(0);

    // The start date passing unqualified is not entered late, so from the
    // same won race the line stops asking.
    const lapsed = passUntil(decided, status.startsAt);
    expect(stateExecutiveEntryStatus(lapsed, personId).kind).toBe(
      "term-over-or-not-entered",
    );
    expect(projectWorkRole(lapsed, personId).awaitingAnswer).toHaveLength(0);
  }, 240_000);
});
