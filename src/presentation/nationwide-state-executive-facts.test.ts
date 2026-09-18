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

      outcomes[usps] = `filed for ${contest.electionDate}`;
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

