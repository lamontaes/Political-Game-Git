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
  journeyStates,
  passUntil,
  runToElection,
  suppliedWin,
} from "../../tests/fixtures/state-executive-entry";

import {
  deserializeWorld,
  serializeWorld,
  stateExecutiveIdentity,
  isPersonAliveAt,
  bindRuleCapabilityResolver,
  unadmittedRuleCapabilityResolver,
} from "../simulation";
import type { World } from "../simulation";
import {
  decideGoverningMatter,
  governingMatters,
  governingOfficeForPerson,
  stateExecutiveTermRule,
  termDatesAfterElection,
} from "../simulation";
import { projectCampaign } from "./campaign-projection";
import {
  fileForStateExecutiveOffice,
  qualifyForStateExecutiveTerm,
  stateExecutiveCandidacyForPerson,
  stateExecutiveEntryStatus,
  stateExecutiveOfficeCalendar,
} from "./nationwide-candidacy";
import { currentPublicOfficeholders } from "./opening-officeholders";
import { passOrdinaryDays } from "./ordinary-life";

afterEach(() => bindRuleCapabilityResolver(unadmittedRuleCapabilityResolver));

describe("GOVERNING state executive journey, once per compiled mechanism", () => {
  it.each(journeyStates())(
    "%s: result, qualification, dated entry, first matters, a recorded consequence, reopen",
    (usps) => {
      const { world, personId } = adultLifeIn(usps, `governing-entry-${usps}`);
      const identity = stateExecutiveIdentity(usps)!;
      const candidacy = stateExecutiveCandidacyForPerson(world, personId)!;
      if (!candidacy.eligible)
        throw new Error(
          `${usps} represents a rule shape but cannot file: ${candidacy.blocks[0]?.reason}. Pick another state for this shape rather than dropping the journey.`,
        );
      const calendar = stateExecutiveOfficeCalendar(world, usps)!;
      const rule = stateExecutiveTermRule(usps)!;
      const filed = fileForStateExecutiveOffice(world, personId);
      const contest = filed.history.electionContests!.at(-1)!;
      expect(contest.electionDate).toBe(calendar.nextElection);

      const decided = runToElection(filed, personId, suppliedWin(personId));
      expect(projectCampaign(decided, personId).phase).toBe("won");
      // A winner who dies before the term begins does not take office, which
      // is the rule the case below proves. Here that would look exactly like
      // an entry defect, so say which it is: this representative's seed must
      // produce a winner who survives to entry, and if it stops doing so the
      // seed is what changed.
      expect(
        isPersonAliveAt(decided, personId, {
          asOfDate: decided.currentDate,
          historySequenceExclusive: decided.history.nextSequence,
        }),
        `${usps} represents a rule shape but its winner did not survive to entry. That is legitimate world behaviour, not an entry defect — choose another seed or another state for this shape.`,
      ).toBe(true);
      // Never occupied on election night.
      expect(governingOfficeForPerson(decided, personId)).toBeNull();
      const planned = stateExecutiveEntryStatus(decided, personId);
      expect(planned.kind).toBe("awaiting-qualification");
      if (planned.kind !== "awaiting-qualification") return;
      const expected = termDatesAfterElection(rule, contest.electionDate);
      expect(planned.startsAt).toBe(expected.startsAt);
      expect(planned.endsAt).toBe(expected.endsAt);

      const qualified = qualifyForStateExecutiveTerm(decided, personId);
      const entered = passUntil(qualified, planned.startsAt);
      expect(stateExecutiveEntryStatus(entered, personId).kind).toBe(
        "in-office",
      );
      const office = governingOfficeForPerson(entered, personId)!;
      expect(office.officeKey).toBe(identity.officeKey);
      expect(office.termStartedAt).toBe(planned.startsAt);
      expect(
        currentPublicOfficeholders(entered).find(
          (holder) => holder.officeKey === identity.officeKey,
        )?.personId,
      ).toBe(personId);

      // The day after entry the office has its first matters.
      const working = passOrdinaryDays(entered, 2);
      // Matters of the office's previous holder stay on record; the new
      // governor's own first matters are these.
      const mine = (w: World) =>
        governingMatters(w, office.officeKey).filter(
          (m) => m.holderPersonId === personId,
        );
      const opening = mine(working);
      expect(opening.map((m) => m.family).sort()).toEqual([
        "agenda",
        "chief-of-staff",
      ]);
      expect(opening.every((m) => m.workItemId !== null)).toBe(true);

      // Team, agenda and one consequential executive task.
      const cos = opening.find((m) => m.family === "chief-of-staff")!;
      expect(cos.options).toHaveLength(3);
      let next = decideGoverningMatter(working, cos.id, cos.options[0]!.key);
      expect(next.ok).toBe(true);
      const agenda = mine(next.world).find((m) => m.family === "agenda")!;
      const priority = agenda.options.find((o) => o.key !== "priority:none")!;
      next = decideGoverningMatter(next.world, agenda.id, priority.key);
      expect(next.ok).toBe(true);
      const task = mine(next.world).find((m) => m.family === "implementation")!;
      expect(task.status).toBe("open");
      next = decideGoverningMatter(next.world, task.id, "pace:fast");
      expect(next.ok).toBe(true);
      const reported = passOrdinaryDays(next.world, 61);
      const outcome = reported.history.events.find(
        (event) =>
          event.type === "governing.outcome" &&
          event.tags.includes(`matter:${task.id}`),
      );
      expect(outcome?.visibility).toBe("public");

      const reopened = deserializeWorld(serializeWorld(reported));
      expect(governingOfficeForPerson(reopened, personId)?.officeKey).toBe(
        office.officeKey,
      );
      // The three matters decided above survive a reopen unchanged.
      for (const decided of [cos.id, agenda.id, task.id])
        expect(mine(reopened).find((m) => m.id === decided)?.status).toBe(
          "decided",
        );
    },
    240_000,
  );

  /*
   * A winner who dies between election day and the term start does not take
   * office. That rule is enforced in the entry transition and, until this
   * case, nothing tested it — it was found only because CRISIS mortality now
   * runs from the opening and one state's seed drifted into it.
   *
   * MD's seed is kept deliberately BECAUSE its winner dies. It is cheap: the
   * journey stops at the blocked entry rather than going on to govern.
   */
});
