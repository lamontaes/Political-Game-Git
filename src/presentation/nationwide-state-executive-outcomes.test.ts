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

/**
 * A campaign actually won on the shared clock — earned, never supplied.
 *
 * This used to try twelve seeds and keep whichever happened to win. That was
 * always a hunt rather than a construction, and once a recorded contest
 * decided the seat it stopped finding one at all: three afternoons do not beat
 * a real opponent, and `fileCampaign` refuses an uncontested filing outright
 * ("requires at least one distinct rival"), so there is no cheap way past it.
 *
 * So the win is built through the model's own arithmetic instead. A result is
 * support plus a seeded swing, and `evaluateCampaignAwareOutcome` reports who
 * WOULD win without resolving anything. The campaign works until that says the
 * player leads, and then the ORDINARY election handler resolves it on the
 * shared clock. Nothing is supplied; the win is earned, and it stops the
 * moment real work has earned it rather than after a fixed guess.
 */
function wonKentuckyCampaign() {
  const { world, personId } = adultLifeIn("KY", "nationwide-dated");
  let next = fileForStateExecutiveOffice(world, personId);
  const contest = next.history.electionContests!.at(-1)!;
  // Campaign in the run-up, not months out. A lead built early is not a lead
  // on election day: support moves on both sides while the clock runs, and an
  // earlier version of this worked until the projection said "winner", then
  // advanced ten months and lost. Work where the votes are counted.
  next = passUntil(next, addDays(contest.electionDate, -90));
  next = spendAnAfternoon(next, personId, "fundraising");
  // Work every remaining day rather than stopping the moment the projection
  // turns favourable. Stopping early leaves a gap for support to move back —
  // the first version of this stopped 45 days out with the projection saying
  // "winner" and lost the election, because the opponent kept running while
  // the player did not.
  let rounds = 0;
  while (next.currentDate < addDays(contest.electionDate, -1)) {
    rounds += 1;
    next = passOrdinaryDays(next);
    next = spendAnAfternoon(next, personId, "outreach");
  }
  if (
    evaluateCampaignAwareOutcome(next, contest.id).winnerPersonId !== personId
  )
    throw new Error(
      `Ninety days of real campaign work never made the player the projected winner in ${contest.electionDate}'s contest. That is a finding about the campaign model, not a seed to retry: either work no longer moves support enough to beat one opponent, or the swing band has outgrown what work can cover.`,
    );
  next = runToElection(next, personId);
  return { world: next, personId, rounds };
}

describe("GOVERNING state executive outcomes: won, lost, and a winner who dies", () => {
  it("a winner who dies before the term begins does not take office", () => {
    const usps = "MD";
    const { world, personId } = adultLifeIn(usps, `governing-entry-${usps}`);
    const filed = fileForStateExecutiveOffice(world, personId);
    const decided = runToElection(filed, personId, suppliedWin(personId));
    expect(projectCampaign(decided, personId).phase).toBe("won");
    const planned = stateExecutiveEntryStatus(decided, personId);
    expect(planned.kind).toBe("awaiting-qualification");
    if (planned.kind !== "awaiting-qualification") return;

    const qualified = qualifyForStateExecutiveTerm(decided, personId);

    // The death is CAUSED here rather than waited for. It was found because a
    // seed drifted into it once CRISIS mortality ran from the opening, but a
    // test that depends on another lane's producer only proves the rule on a
    // head where that lane is composed — and silently proves nothing
    // anywhere else. Recording it directly proves the rule on every head.
    const dying = passUntil(qualified, "2026-12-24");
    // On a head that composes a mortality producer the winner may ALREADY be
    // dead by now — that is how this rule was found. A second death record is
    // refused, so record one only if nobody has. Either way the rule under
    // test is the same, and it is tested on every head rather than only where
    // some other lane happens to kill somebody.
    const buried = isPersonAliveAt(dying, personId, {
      asOfDate: dying.currentDate,
      historySequenceExclusive: dying.history.nextSequence,
    })
      ? recordPersonDeath(dying, {
          stableKey: `${usps}:winner-dies-before-entry`,
          personId,
          diedAt: dying.currentDate,
          causeKey: "cause:external-fixture",
          sourceEntityIds: [dying.id],
          summary: "The governor-elect died before the term began.",
          provenance: {
            kind: "authored",
            note: "Authored entry-refusal fixture.",
          },
        })
      : dying;
    expect(buried.currentDate < planned.startsAt).toBe(true);

    const atStart = passUntil(buried, planned.startsAt);
    expect(atStart.currentDate).toBe(planned.startsAt);
    expect(
      isPersonAliveAt(atStart, personId, {
        asOfDate: planned.startsAt,
        historySequenceExclusive: atStart.history.nextSequence,
      }),
    ).toBe(false);

    // So the office is not taken up, and the refusal is recorded with a
    // reason rather than the term quietly failing to appear.
    expect(stateExecutiveEntryStatus(atStart, personId).kind).toBe(
      "term-over-or-not-entered",
    );
    expect(governingOfficeForPerson(atStart, personId)).toBeNull();
    const entry = atStart.history.futureDueItems.find(
      (item) => item.transitionKey === "election:executive-term-entry",
    );
    const state = (atStart.history.futureDueItemStates ?? [])
      .filter((row) => row.dueItemId === entry?.id)
      .at(-1);
    expect(state?.status).toBe("blocked");
    expect(state?.context).toMatch(/not alive/i);
  }, 240_000);

  /*
   * The file's runtime rests on there being few rule shapes. If the compiled
   * data ever fragments — a wave of states gaining verified rules, say — the
   * journey count rises with it and this file goes back over the shard's
   * budget. That should be somebody's decision, announced by a failure here,
   * rather than a timeout on a hosted runner nobody can read.
   */
});

describe("NATIONWIDE ordinary state executive entry once term facts are admitted (test fixture, not law)", () => {
  it("won contest -> dated term -> qualification -> entry -> governed action -> reopen", () => {
    bindRuleCapabilityResolver(FIXTURE_TERM_FACTS);
    const { world, personId, rounds } = wonKentuckyCampaign();
    console.info(
      `[nationwide-entry dated route] won after ${rounds} rounds of campaign work`,
    );
    // Earned on the ordinary path, not supplied by a fixture handler.
    expect(projectCampaign(world, personId).phase).toBe("won");
    const kentucky = stateExecutiveIdentity("KY")!;

    const planned = stateExecutiveEntryStatus(world, personId);
    expect(planned.kind).toBe("awaiting-qualification");
    if (planned.kind !== "awaiting-qualification") return;
    // The admitted fixture's reference start follows the regular election.
    expect(planned.startsAt).toBe("2027-01-15");
    expect(planned.endsAt).toBe("2031-01-15");
    expect(planned.qualificationBlocks).toEqual([]);
    expect(resolveExecutiveOffice(world)).toBeNull();

    // Control: without recorded qualification the term is not entered.
    const unqualified = passUntil(world, planned.startsAt);
    expect(resolveExecutiveOffice(unqualified)).toBeNull();
    expect(stateExecutiveEntryStatus(unqualified, personId).kind).toBe(
      "term-over-or-not-entered",
    );

    const qualified = qualifyForStateExecutiveTerm(world, personId);
    expect(stateExecutiveEntryStatus(qualified, personId).kind).toBe(
      "qualified-awaiting-entry",
    );
    expect(qualifyForStateExecutiveTerm(qualified, personId)).toBe(qualified);

    const entered = passUntil(qualified, planned.startsAt);
    expect(stateExecutiveEntryStatus(entered, personId).kind).toBe("in-office");
    const office = resolveExecutiveOffice(entered)!;
    expect(office.origin).toBe("elected-term");
    expect(office.pack.office.officeKey).toBe(kentucky.officeKey);
    expect(office.relationship.startedAt).toBe(planned.startsAt);
    const holder = currentPublicOfficeholders(entered).find(
      (record) => record.officeKey === kentucky.officeKey,
    )!;
    expect(holder.personId).toBe(personId);
    expect(holder.startedAt).toBe(planned.startsAt);

    // A governed action through the office the ordinary route produced.
    const reopened = deserializeWorld(serializeWorld(entered));
    expect(resolveExecutiveOffice(reopened)?.relationship.id).toBe(
      office.relationship.id,
    );
    const outcome = reopened.history.events.find(
      (event) =>
        event.type === "election.contest-resolved" &&
        event.jurisdictionId === office.jurisdictionId,
    )!;
    const governed = receiveExecutiveWork(
      reopened,
      outcome.id,
      "Transition briefing",
      outcome.summary,
    );
    const inboxKey = `executive-inbox:${office.relationship.id}:${outcome.id}`;
    expect(
      governed.history.workItems.filter((item) => item.stableKey === inboxKey),
    ).toHaveLength(1);
    // Receiving again is the same work, not a second item.
    expect(
      receiveExecutiveWork(
        governed,
        outcome.id,
        "Transition briefing",
        outcome.summary,
      ),
    ).toBe(governed);
    // Control: the same public event gives a non-holder nothing.
    expect(
      receiveExecutiveWorkIfCurrentOffice(
        unqualified,
        outcome.id,
        "Transition briefing",
        outcome.summary,
      ),
    ).toBe(unqualified);
  }, 240_000);

  it("a lost contest never produces a term for the loser", () => {
    bindRuleCapabilityResolver(FIXTURE_TERM_FACTS);
    // Losing needs no search: not campaigning is how a filing loses. One life,
    // one filing, no work, and the ordinary handler decides it.
    {
      const { world, personId } = adultLifeIn("KY", "nationwide-lost");
      const decided = runToElection(
        fileForStateExecutiveOffice(world, personId),
        personId,
      );
      expect(projectCampaign(decided, personId).phase).toBe("lost");
      expect(stateExecutiveEntryStatus(decided, personId).kind).toBe("lost");
      expect(() => qualifyForStateExecutiveTerm(decided, personId)).toThrow();
      expect(
        resolveExecutiveOffice(passUntil(decided, "2027-01-16")),
      ).toBeNull();
    }
  }, 240_000);
});
