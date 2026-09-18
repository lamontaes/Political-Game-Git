/*
 * Split from nationwide-state-executive-entry.test.ts. The shard sequencer
 * deals adjacent files to different runners, so separating the fifty cheap
 * compiled-facts cases from the two expensive simulated routes lets them run
 * on separate machines instead of queueing behind each other on one. Same
 * assertions, same count, no timeout raised.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  US_STATE_USPS,
  addDays,
  createScenarioWorld,
  bindRuleCapabilityResolver,
  candidacyEligibility,
  deserializeWorld,
  searchLifePlaces,
  serializeWorld,
  stateExecutiveIdentity,
  isPersonAliveAt,
  recordPersonDeath,
  evaluateCampaignAwareOutcome,
  stateJurisdictionForKey,
  unadmittedRuleCapabilityResolver,
} from "../simulation";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  RuleCapabilityResolver,
  World,
} from "../simulation";
import {
  ELECTION_CONTEST_TRANSITION_KEY,
  campaignElectionTransitionHandler,
  createFutureTransitionHandlerRegistry,
  decideGoverningMatter,
  electionContestResult,
  governingMatters,
  governingOfficeForPerson,
  resolveCampaignElectionFromRecordedInput,
  stateExecutiveTermRule,
  termDatesAfterElection,
} from "../simulation";
import { resolveExecutiveOffice } from "../simulation/executive-work-context";
import { receiveExecutiveWork } from "../simulation/executive-work";
import { receiveExecutiveWorkIfCurrentOffice } from "../simulation/incident-response";
import { projectCampaign, spendAnAfternoon } from "./campaign-projection";
import {
  fileForStateExecutiveOffice,
  qualifyForStateExecutiveTerm,
  stateExecutiveCandidacyForPerson,
  stateExecutiveEntryStatus,
  stateExecutiveOfficeCalendar,
} from "./nationwide-candidacy";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { currentPublicOfficeholders } from "./opening-officeholders";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

function firstLocality(usps: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${usps}`,
    scope: "locality",
  })[0];
  if (!place) throw new Error(`No locality found for ${usps}.`);
  return place;
}

function adultLifeIn(usps: string, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: firstLocality(usps).key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

/**
 * A resident adult in a state, without generating a life.
 *
 * The fifty compiled-facts cases below check what the DATA says — the office's
 * identity, its term rule, its calendar, and that a filing stands in that
 * office's own election. None of that needs a generated opening life with its
 * households, relationships and NPC population; it needs somebody who lives in
 * the state and can file. Measured on the composed head, this is about 0.03 s
 * against roughly 1.4 s for a generated life, and the fifty cases were the
 * largest remaining cost once the journeys collapsed.
 *
 * The journey cases still use a real generated life, because what they exercise
 * is the ordinary route rather than the compiled numbers.
 */
function residentIn(usps: string, seed: string) {
  const world = createScenarioWorld(seed, firstLocality(usps).context, {
    peopleCount: 4,
  });
  return { world, personId: world.personOrder[0]! };
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

function runToElection(
  world: World,
  personId: EntityId,
  handlers?: FutureTransitionHandlerRegistry,
): World {
  let next = world;
  for (
    let step = 0;
    step < 60 && projectCampaign(next, personId).phase === "active";
    step += 1
  )
    next = passOrdinaryDays(next, 30, handlers ? { handlers } : {});
  return next;
}

function passUntil(world: World, date: string): World {
  let next = world;
  for (let step = 0; step < 200 && next.currentDate < date; step += 1)
    next = passOrdinaryDays(
      next,
      Math.max(1, Math.min(30, daysBetween(next.currentDate, date))),
    );
  return next;
}

/**
 * Test fixture only: a supplied result so every state's entry route can be
 * exercised with the player as winner. Not a forecast and not a real result.
 */
function suppliedWin(personId: EntityId): FutureTransitionHandlerRegistry {
  return createFutureTransitionHandlerRegistry([
    [
      ELECTION_CONTEST_TRANSITION_KEY,
      (atDate, due) => {
        const contest = (atDate.history.electionContests ?? []).find((c) =>
          due.entityIds.includes(c.id),
        );
        if (!contest || !contest.candidatePersonIds.includes(personId))
          return campaignElectionTransitionHandler(atDate, due);
        const resolved = resolveCampaignElectionFromRecordedInput(atDate, {
          contestId: contest.id,
          winnerPersonId: personId,
          tallies: contest.candidatePersonIds.map((candidatePersonId) => ({
            candidatePersonId,
            votes: candidatePersonId === personId ? 2 : 1,
            voteShare: candidatePersonId === personId ? 2 / 3 : 1 / 3,
          })),
          provenance: {
            method: "authored",
            sourceEntityIds: [],
            note: "Supplied fictional test result; not a forecast.",
          },
        });
        return {
          world: resolved,
          status: "resolved",
          reasonKey: null,
          context: "Supplied recorded-result fixture.",
          outcomeEventId: electionContestResult(resolved, contest.id)!
            .outcomeEventId,
        };
      },
    ],
  ]);
}

/** Test fixture only. Not a sourced term rule for any state. */
const FIXTURE_TERM_FACTS: RuleCapabilityResolver = (request) => ({
  ...unadmittedRuleCapabilityResolver(request),
  refusal: null,
  fields: request.fields.map((field) =>
    field === "term.years" || field === "term.start"
      ? {
          field,
          state: "ADMITTED" as const,
          value:
            field === "term.years"
              ? 4
              : {
                  kind: "reference-start",
                  // Chosen so the cycle's next start falls just after the
                  // 2026 general rather than in 2030. The cases below advance
                  // to it twice, and three years of simulated time proves
                  // nothing the first ten weeks do not. Fixture data, not law.
                  referenceStart: "2023-01-15",
                  cycleYears: 4,
                },
          ruleScope: "state-constitution" as const,
          ruleVersion: "test-fixture-not-law-v1",
          validFrom: null,
          validThrough: null,
          source: null,
          reason: "Test fixture only; not a sourced rule.",
        }
      : unadmittedRuleCapabilityResolver({ ...request, fields: [field] })
          .fields[0]!,
  ),
});

afterEach(() => bindRuleCapabilityResolver(unadmittedRuleCapabilityResolver));

const outcomes: Record<string, string> = {};

/**
 * The distinct state-executive rule MECHANISMS, derived from the compiled data.
 *
 * REVERSED, deliberately, and the reason belongs here rather than in a commit
 * nobody reads. This first keyed on everything a rule carries, which made
 * Washington its own shape and gave it its own journey — 336 seconds, more than
 * half the file, and over its own timeout. That conflated two different things.
 * WA's RULE differs; WA's JOURNEY does not. Its difference is DATES —
 * commencement ordinal 2, weekday 1, offset 2, and a cycle referenced to 2024
 * rather than 2026 — and dates are a pure function of the rule, asserted
 * exactly by `termDatesAfterElection` and the office calendar in its own
 * per-state case, in milliseconds. Arriving at those dates by simulating three
 * extra years observed them less precisely than stating them does.
 *
 * So the key is the MECHANISM: how a term commences and how its election day is
 * found. A state that differs only in WHEN its cycle lands rides the one
 * journey and has its dates asserted directly. A state whose commencement
 * worked a different WAY would not fit the journeyed path, so it splits out and
 * gets its own — automatically, without anybody remembering to add it.
 */
function ruleShapes(): ReadonlyMap<string, readonly string[]> {
  const shapes = new Map<string, string[]>();
  for (const usps of US_STATE_USPS) {
    const rule = stateExecutiveTermRule(usps)!;
    const key = JSON.stringify({
      commencement: rule.commencement.kind,
      election: rule.election.day,
    });
    shapes.set(key, [...(shapes.get(key) ?? []), usps]);
  }
  return shapes;
}

/** One state per mechanism: the whole journey is run for each of these. */
function journeyStates(): readonly string[] {
  return [...ruleShapes().values()].map((states) => states[0]!);
}

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
      outcomes[usps] =
        `in office ${planned.startsAt} (${rule.basis.commencement}); ` +
        (outcome!.tags.find((tag) => tag.startsWith("implementation:")) ?? "");
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
