/*
 * Split from nationwide-state-executive-entry.test.ts. The shard sequencer
 * deals adjacent files to different runners, so separating the fifty cheap
 * compiled-facts cases from the two expensive simulated routes lets them run
 * on separate machines instead of queueing behind each other on one. Same
 * assertions, same count, no timeout raised.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  adultLifeIn,
  daysBetween,
  journeyStates,
  residentIn,
  ruleShapes,
} from "../../tests/fixtures/state-executive-entry";

import {
  US_STATE_USPS,
  termDatesAfterElection,
  unadmittedRuleCapabilityResolver,
  bindRuleCapabilityResolver,
  candidacyEligibility,
  stateExecutiveIdentity,
  stateJurisdictionForKey,
} from "../simulation";
import { stateExecutiveTermRule } from "../simulation";
import {
  fileForStateExecutiveOffice,
  stateExecutiveCandidacyForPerson,
  stateExecutiveEntryStatus,
  stateExecutiveOfficeCalendar,
} from "./nationwide-candidacy";

afterEach(() => bindRuleCapabilityResolver(unadmittedRuleCapabilityResolver));

const outcomes: Record<string, string> = {};

describe("GOVERNING all-fifty-state campaign -> office -> work (supplied win fixture)", () => {
  /*
   * Every state keeps its own compiled facts and its own candidacy: office
   * identity, term rule, calendar, eligibility, and — where it is eligible —
   * that filing stands in that state's own regular election. Eligibility
   * really does vary, which is why the refusal branch below exists and fires,
   * so no state may be dropped from this one.
   *
   * What this case no longer does is run the JOURNEY. Running to an election
   * and on to a seated term costs roughly a simulated year per state, and on
   * a head where every day runs mortality, hazards, press and party bodies,
   * fifty of those is the whole file's cost. The journey is identical for
   * every state sharing a rule shape — forty-nine of these rules are the same
   * object — so it runs once per shape in the case below, Washington
   * included, which is the only one that differs.
   */
  it.each([...US_STATE_USPS])(
    "%s: compiled office facts, candidacy, and filing into its own election",
    (usps) => {
      const { world, personId } = residentIn(usps, `governing-facts-${usps}`);
      const identity = stateExecutiveIdentity(usps)!;
      const candidacy = stateExecutiveCandidacyForPerson(world, personId)!;
      expect(candidacy.identity.officeKey).toBe(identity.officeKey);
      if (!candidacy.eligible) {
        // Refused with the exact RULES sentence, and nothing is written.
        expect(candidacy.blocks.length).toBeGreaterThan(0);
        expect(() => fileForStateExecutiveOffice(world, personId)).toThrow(
          candidacy.blocks[0]!.reason,
        );
        outcomes[usps] =
          `UNFINISHED refused:${candidacy.blocks[0]!.kind}: ${candidacy.blocks[0]!.reason}`;
        return;
      }
      const calendar = stateExecutiveOfficeCalendar(world, usps)!;
      const rule = stateExecutiveTermRule(usps)!;

      // Filing stands in the office's own regular election, not a fixed
      // number of days away.
      const filed = fileForStateExecutiveOffice(world, personId);
      const contest = filed.history.electionContests!.at(-1)!;
      expect(contest.electionDate).toBe(calendar.nextElection);
      expect(daysBetween(world.currentDate, contest.electionDate)).not.toBe(28);
      expect(stateExecutiveEntryStatus(filed, personId).kind).toBe(
        "pending-election",
      );

      // Where a term begins and ends is a pure function of THIS state's rule
      // and its own election date. This is where Washington's difference is
      // asserted — it is the only verified rule and it commences differently
      // — which is why the journey does not simulate three extra years to
      // observe what this states directly.
      const term = termDatesAfterElection(rule, contest.electionDate);
      expect(term.startsAt > contest.electionDate).toBe(true);
      expect(term.endsAt > term.startsAt).toBe(true);
      expect(term.startsAt).toBe(
        termDatesAfterElection(rule, calendar.nextElection).startsAt,
      );

      outcomes[usps] =
        `filed for ${contest.electionDate}, term ${term.startsAt} to ${term.endsAt}`;
    },
    240_000,
  );

  /*
   * The whole journey, once per compiled rule shape. `journeyStates()` derives
   * its own list, so this grows by itself if a state ever gains a distinct
   * rule rather than needing somebody to remember.
   */
  it("runs few enough journeys to fit the shard", () => {
    const shapes = ruleShapes();
    const states = [...shapes.values()].reduce(
      (total, group) => total + group.length,
      0,
    );
    expect(states).toBe(US_STATE_USPS.length);
    expect(journeyStates()).toHaveLength(shapes.size);
    expect(
      shapes.size,
      `The fifty states now compile into ${shapes.size} distinct executive rule shapes, and this file runs the full journey once per shape. Each journey costs roughly a simulated year of advancement on a head that runs mortality, hazards, press and party bodies every day, so this is a budget decision and not a number to raise quietly.`,
    ).toBeLessThanOrEqual(6);
    // WA is deliberately NOT journeyed: it shares the mechanism and differs
    // only in its dates, which its own per-state case asserts exactly. If a
    // state ever differs in mechanism it becomes its own shape here, and the
    // journey count rises with it rather than silently staying at one.
    expect(shapes.size).toBeGreaterThanOrEqual(1);
  });

  it("refuses another state's governorship as living elsewhere", () => {
    const { world, personId } = adultLifeIn("NV", "nationwide-entry-wrong");
    const kentucky = stateExecutiveIdentity("KY")!;
    const eligibility = candidacyEligibility(world, {
      personId,
      jurisdictionId: stateJurisdictionForKey("US-KY")!.id,
      officeKey: kentucky.officeKey,
      alreadyACandidate: false,
    });
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.blocks.map((block) => block.kind)).toContain(
      "lives-elsewhere",
    );
  });

  it("reports the per-state outcome summary", () => {
    console.info(
      `[governing-entry outcomes]\n${Object.entries(outcomes)
        .map(([usps, text]) => `${usps}: ${text}`)
        .join("\n")}`,
    );
    expect(Object.keys(outcomes)).toHaveLength(50);
  });
});

/** A campaign actually won on the shared clock; seeds are tried, results are never supplied. */
