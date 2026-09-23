import { afterEach, describe, expect, it } from "vitest";
import {
  adultLifeIn,
  passUntil,
  runToElection,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";
import {
  addDays,
  bindRuleCapabilityResolver,
  LATE_TERM_ENTRY,
  unadmittedRuleCapabilityResolver,
} from "../simulation";
import { EXECUTIVE_QUALIFICATION } from "../simulation/executive-work-context";
import { projectCampaign } from "./campaign-projection";
import { projectToday, projectWorkRole } from "./day-overview";
import {
  fileForStateExecutiveOffice,
  stateExecutiveEntryStatus,
} from "./nationwide-candidacy";
import { openOrdinaryLife } from "./ordinary-life";

afterEach(() => bindRuleCapabilityResolver(unadmittedRuleCapabilityResolver));

/*
 * Walked on 4965f63c in Reno and Springfield: a won governorship put "An
 * offer of work as Governor is waiting for your answer" on every screen, and
 * the answer was a Qualify control on Campaigns. Then Fatima, a Maine
 * governor on a599b31, never pressed it and lost the whole term when the week
 * button passed the start date. lamontae, 2026-09-23: there is no Qualify
 * button; the office's requirements are checked, and the oath on the first
 * day is the ceremony.
 */
describe("a won executive term", () => {
  it("is qualified for the winner, asks nothing, and is entered on the start date", () => {
    const { world, personId } = adultLifeIn("NV", "elected-term-offer-NV");
    const filed = fileForStateExecutiveOffice(world, personId);
    const decided = runToElection(filed, personId, suppliedWin(personId));
    expect(projectCampaign(decided, personId).phase).toBe("won");
    const status = stateExecutiveEntryStatus(decided, personId);
    expect(status.kind).toBe("qualified-awaiting-entry");
    if (status.kind !== "qualified-awaiting-entry") return;
    expect(projectCampaign(decided, personId).afterword).toMatch(
      /won\. The term begins .+; until then the office is not theirs\./,
    );

    const [offer] = projectWorkRole(decided, personId).awaitingAnswer;
    expect(offer?.answer).toBe("qualified");
    expect(
      projectToday(decided, personId).waiting.some(
        (entry) => entry.key === `work-offer:${offer!.relationshipId}`,
      ),
    ).toBe(false);
    expect(projectWorkRole(decided, personId).sentence).toMatch(
      /You won the race for .+\. The term begins .+, and you take the oath that day\./,
    );
    expect(projectWorkRole(decided, personId).sentence).not.toMatch(
      /offer of work|Qualify/,
    );

    const seated = passUntil(decided, status.startsAt);
    expect(stateExecutiveEntryStatus(seated, personId).kind).toBe("in-office");
    expect(projectWorkRole(seated, personId).awaitingAnswer).toHaveLength(0);
  }, 240_000);

  it("seats a save that lost its term behind the old Qualify step, when it opens", () => {
    const { world, personId } = adultLifeIn("NV", "elected-term-legacy-NV");
    const decided = runToElection(
      fileForStateExecutiveOffice(world, personId),
      personId,
      suppliedWin(personId),
    );
    const status = stateExecutiveEntryStatus(decided, personId);
    if (status.kind !== "qualified-awaiting-entry")
      throw new Error(`Expected a qualified term, got ${status.kind}.`);
    // What a save planned before this change holds: the same term with no
    // qualification recorded for the player. History is append-only and
    // sequence-contiguous, and later records point at this one, so it keeps
    // its place and identity under a type nothing reads as a qualification.
    const legacy: typeof decided = {
      ...decided,
      history: {
        ...decided.history,
        events: decided.history.events.map((event) =>
          event.type === EXECUTIVE_QUALIFICATION
            ? { ...event, type: "fixture.legacy-unrecorded" as const }
            : event,
        ),
      },
    };
    expect(stateExecutiveEntryStatus(legacy, personId).kind).toBe(
      "awaiting-qualification",
    );
    const lapsed = passUntil(legacy, addDays(status.startsAt, 9));
    expect(stateExecutiveEntryStatus(lapsed, personId).kind).toBe(
      "term-over-or-not-entered",
    );

    const opened = openOrdinaryLife(lapsed, personId);
    expect(stateExecutiveEntryStatus(opened, personId).kind).toBe("in-office");
    expect(
      opened.history.events.filter((event) => event.type === LATE_TERM_ENTRY),
    ).toHaveLength(1);
    // Opening again changes nothing.
    expect(openOrdinaryLife(opened, personId).history.events.length).toBe(
      opened.history.events.length,
    );
    // Before the start date, the same legacy term is simply qualified.
    const early = openOrdinaryLife(legacy, personId);
    expect(stateExecutiveEntryStatus(early, personId).kind).toBe(
      "qualified-awaiting-entry",
    );
  }, 240_000);
});
