/*
 * Shared setup for the split state-executive suites (facts, journey,
 * outcomes).
 *
 * It lives in tests/fixtures rather than beside its callers for a reason worth
 * stating: tsconfig.node INCLUDES tests/fixtures/**\/*.ts, while BOTH projects
 * exclude src/presentation/**\/*.test.ts. Putting the shared logic here is the
 * difference between the gate typechecking it and not.
 */
import {
  US_STATE_USPS,
  createScenarioWorld,
  searchLifePlaces,
  unadmittedRuleCapabilityResolver,
  ELECTION_CONTEST_TRANSITION_KEY,
  campaignElectionTransitionHandler,
  createFutureTransitionHandlerRegistry,
  electionContestResult,
  resolveCampaignElectionFromRecordedInput,
  stateExecutiveTermRule,
} from "../../src/simulation";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  RuleCapabilityResolver,
  World,
} from "../../src/simulation";
import { projectCampaign } from "../../src/presentation/campaign-projection";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../../src/presentation/ordinary-life";

export function firstLocality(usps: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: `US-${usps}`,
    scope: "locality",
  })[0];
  if (!place) throw new Error(`No locality found for ${usps}.`);
  return place;
}

export function adultLifeIn(usps: string, seed: string) {
  return adultLifeAt(firstLocality(usps).key, seed);
}

/** A forty-year-old's ordinary life in one named place, by its place key. */
export function adultLifeAt(placeKey: string, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey,
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
export function residentIn(usps: string, seed: string) {
  const world = createScenarioWorld(seed, firstLocality(usps).context, {
    peopleCount: 4,
  });
  return { world, personId: world.personOrder[0]! };
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

export function runToElection(
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

export function passUntil(world: World, date: string): World {
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
export function suppliedWin(
  personId: EntityId,
): FutureTransitionHandlerRegistry {
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
export const FIXTURE_TERM_FACTS: RuleCapabilityResolver = (request) => ({
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
export function ruleShapes(): ReadonlyMap<string, readonly string[]> {
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
export function journeyStates(): readonly string[] {
  return [...ruleShapes().values()].map((states) => states[0]!);
}
