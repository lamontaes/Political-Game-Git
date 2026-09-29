import {
  ARTICLE_V_CONVENTION_BODY,
  ARTICLE_V_STATE_KEYS,
  constitutionalPosition,
  proposeConstitutionalMeasure,
  recordArticleVRatification,
  constitutionalActions,
  recordConstitutionalProposalVote,
} from "../constitutional-process";
import { hasStableKey } from "../history-index";
import { addDays, makeIsoDate } from "../dates";
import { evaluateDecision } from "../decisions";
import { currentHistoricalCutoff } from "../queries";
import { scheduleFutureDueItem } from "../future-transitions";
import { stateCandidacyPack } from "../candidacy-packs";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../national-election-geography";
import {
  stateLegislatureEstablished,
  stateLegislators,
} from "../nationwide-world/state-legislature-opening";
import { constitutionalPolicyProvisions } from "../policy-provisions";
import { SeededRng } from "../rng";
import type {
  DecisionConsideration,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  LegislativeVoteDisposition,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import { seatedCongressChamber } from "./congress-chambers";
import { lawInForce } from "./law-in-force";
import {
  ensureOfficeholderPrinciples,
  principleAnswersConsideration,
  principledLeaning,
} from "./officeholder-principles";

/**
 * ARTICLE V ON ANY SUBJECT — amending the U.S. Constitution by either of the
 * two routes Article V gives, on any question the national government
 * decides, driven by what the people in office believe.
 *
 * What is law here:
 * 1. Congress proposes when two-thirds of the members present in each house
 *    vote for it (Article V; National Prohibition Cases, 253 U.S. 350).
 * 2. On the applications of the legislatures of two-thirds of the states, 34
 *    of 50, Congress "shall call a Convention for proposing Amendments". The
 *    convention proposes; it does not ratify.
 * 3. Either way, three-fourths of the states, 38 of 50, ratify
 *    (`constitutional-process.ts` counts them).
 * 4. What an amendment on a policy question does: it writes the policy into
 *    the Constitution, and the law in force then answers that question "yes"
 *    everywhere, above every statute (`policy-provisions.ts`,
 *    `law-in-force.ts`). Whatever reads the law in force follows it.
 *
 * Who moves, and why. No draw decides any of this:
 * 1. A member of Congress votes on a proposal by their own principles
 *    (`officeholder-principles.ts`), weighed against the higher bar of
 *    changing the Constitution rather than passing a law.
 * 2. Congress takes up the question most of both houses already lean toward,
 *    and only when at least two-thirds of each house's sitting members lean
 *    that way; otherwise nobody brings a proposal that cannot pass.
 * 3. A state's legislature applies for a convention on a question when most
 *    of its sitting members lean toward it and federal law in force does not
 *    already answer it "yes". It ratifies when most of its sitting members
 *    lean toward the amendment. ESTIMATED where the state's legislature is
 *    not seated in the world: the state's own members of Congress, whose
 *    principles are drawn the same way, stand in for it.
 *
 * NOT MODELED, with the blanket rule applied meanwhile: an amendment that
 * writes a "no" (a prohibition); a legislature rescinding an application or
 * a ratification; limiting a convention to one subject beyond the one its
 * applications name; ratification by state conventions (legislatures ratify,
 * as for 26 of the 27 amendments); a player in Congress or a legislature
 * casting their own vote (they are recorded absent, or counted out).
 */

export const ARTICLE_V_VERSION = "article-v/v1";
export const ARTICLE_V_REVIEW = "governing:article-v-review" as const;
export const ARTICLE_V_CONVENTION = "governing:article-v-convention" as const;
export const ARTICLE_V_STATE_ACTION =
  "governing:article-v-state-action" as const;
export const CONVENTION_APPLICATION_EVENT =
  "governing.article-v-convention-application" as const;
export const CONVENTION_RESCISSION_EVENT =
  "governing.article-v-convention-rescission" as const;
export const CONVENTION_CALL_EVENT =
  "governing.article-v-convention-called" as const;

export const ARTICLE_V_PROFILE = {
  /**
   * PLACEHOLDER: the day each year Congress and the legislatures take stock,
   * once most legislative sessions have opened. Affects only when a proposal
   * or an application is recorded.
   */
  reviewMonthDay: "04-01",
  /** LAW (Article V): two-thirds of the state legislatures, 34 of 50. */
  applicationsToCall: 34,
  /**
   * LAW BY CUSTOM: the seven years Congress has set for ratification on most
   * amendments since the Eighteenth (1917).
   */
  ratificationYears: 7,
  /**
   * PLACEHOLDER: each state legislature takes up a proposal on its own day
   * within this many days, spread by the World's seed. Timing only; it
   * decides nothing about how a state votes.
   */
  stateActionWindowDays: 730,
  /**
   * PLACEHOLDER: days from Congress calling a convention to the convention's
   * vote. Affects only when the vote is recorded.
   */
  conventionDays: 180,
} as const;

const CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;

const VOTE_OPTIONS = [
  { key: "vote-yea", label: "Vote yes", description: "Propose it." },
  { key: "vote-nay", label: "Vote no", description: "Leave it out." },
] as const;

function done(world: World, context: string): FutureTransitionHandlerResult {
  return {
    world,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId: null,
  };
}

function reviewKey(year: number): string {
  return `${ARTICLE_V_VERSION}:US:${year}:review`;
}

function reviewDateFor(year: number): IsoDate {
  return makeIsoDate(`${year}-${ARTICLE_V_PROFILE.reviewMonthDay}`);
}

function scheduleNextReview(world: World, after: IsoDate): World {
  let year = Number(after.slice(0, 4));
  if (reviewDateFor(year) <= after) year += 1;
  const stableKey = reviewKey(year);
  if (world.history.futureDueItems.some((due) => due.stableKey === stableKey))
    return world;
  const registered = ensureNationalElectionJurisdiction(world);
  return scheduleFutureDueItem(registered, {
    stableKey,
    dueAt: reviewDateFor(year),
    transitionKey: ARTICLE_V_REVIEW,
    entityIds: [NATIONAL_ELECTION_JURISDICTION.id],
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    provenance: {
      kind: "authored",
      note: "Congress and the state legislatures take stock of proposed amendments once a year (the day is a placeholder).",
    },
  });
}

/** Called whenever the clock moves; puts the next yearly review on the calendar. */
export function applyArticleV(before: IsoDate, world: World): World {
  if (world.currentDate <= before) return world;
  const year = Number(world.currentDate.slice(0, 4));
  // The cheap calendar check first: seating the Senate reads every record.
  const scheduled = world.history.futureDueItems.some(
    (due) =>
      due.transitionKey === ARTICLE_V_REVIEW &&
      (due.stableKey === reviewKey(year + 1) ||
        (due.stableKey === reviewKey(year) &&
          reviewDateFor(year) > world.currentDate)),
  );
  if (scheduled || !seatedCongressChamber(world, "senate")) return world;
  return scheduleNextReview(world, world.currentDate);
}

function controlledPersonId(world: World): EntityId | null {
  return world.control.kind === "person" ? world.control.personId : null;
}

/** The questions the national government decides, by the catalog. */
function federalQuestions(world: World): readonly EntityId[] {
  const catalog = world.policyCatalog;
  return catalog.propositionOrder.filter((id) => {
    const proposition = catalog.propositions[id];
    return (
      proposition !== undefined &&
      (catalog.issues[proposition.issueId]?.levels ?? []).includes("federal")
    );
  });
}

/** Whether the U.S. Constitution already holds the policy, or a proposal on it is open. */
function settledOrPending(world: World, propositionId: EntityId): boolean {
  if (
    constitutionalPolicyProvisions(world, "US").some(
      (row) => row.propositionId === propositionId && row.stance === "adopt",
    )
  )
    return true;
  return (world.history.constitutionalMeasures ?? []).some(
    (measure) =>
      measure.jurisdictionKey === "US" &&
      measure.ruleDelta.kind === "policy-provision" &&
      measure.ruleDelta.propositionId === propositionId &&
      ["consideration", "ratification"].includes(
        constitutionalPosition(world, measure.id).phase,
      ),
  );
}

interface Voter {
  readonly memberKey: string;
  readonly personId: EntityId;
}

function congressVoters(
  world: World,
  chamberKey: "house" | "senate",
): readonly Voter[] {
  const chamber = seatedCongressChamber(world, chamberKey);
  return (chamber?.body.members ?? []).flatMap((member) =>
    member.personId
      ? [{ memberKey: member.memberKey, personId: member.personId }]
      : [],
  );
}

/**
 * The people whose principles speak for a state's legislature: its sitting
 * members where the legislature is seated, otherwise (ESTIMATED) the state's
 * own members of Congress.
 */
function stateVoice(
  world: World,
  stateUsps: string,
): { readonly personIds: readonly EntityId[]; readonly estimated: boolean } {
  const pack = stateCandidacyPack(`US-${stateUsps}`);
  if (pack && stateLegislatureEstablished(world, pack.packId))
    return {
      personIds: stateLegislators(world, pack.packId).map((m) => m.personId),
      estimated: false,
    };
  const delegation = [
    ...congressVoters(world, "house"),
    ...congressVoters(world, "senate"),
  ]
    .filter(
      (voter) =>
        voter.memberKey.includes(`:us-senate:${stateUsps}:`) ||
        voter.memberKey.includes(`:us-house:${stateUsps}-`),
    )
    .map((voter) => voter.personId);
  return { personIds: delegation, estimated: true };
}

/** Whether most of these people, the player aside, lean toward the policy. */
function mostLeanYes(
  world: World,
  personIds: readonly EntityId[],
  propositionId: EntityId,
): boolean {
  const player = controlledPersonId(world);
  const counted = personIds.filter((id) => id !== player);
  if (counted.length === 0) return false;
  const yes = counted.filter(
    (id) => principledLeaning(world, id, propositionId).score > 0,
  ).length;
  return yes * 2 > counted.length;
}

function mostLeanNo(
  world: World,
  personIds: readonly EntityId[],
  propositionId: EntityId,
): boolean {
  const player = controlledPersonId(world);
  const counted = personIds.filter((id) => id !== player);
  if (counted.length === 0) return false;
  const no = counted.filter(
    (id) => principledLeaning(world, id, propositionId).score < 0,
  ).length;
  return no * 2 > counted.length;
}

function leanShare(
  world: World,
  voters: readonly Voter[],
  propositionId: EntityId,
): number {
  const player = controlledPersonId(world);
  const counted = voters.filter((voter) => voter.personId !== player);
  if (counted.length === 0) return 0;
  return (
    counted.filter(
      (voter) =>
        principledLeaning(world, voter.personId, propositionId).score > 0,
    ).length / counted.length
  );
}

/** A member's vote on writing a policy into the Constitution. */
function memberBallot(
  world: World,
  stableKey: string,
  personId: EntityId,
  propositionId: EntityId,
): { readonly ballot: "yea" | "nay"; readonly reason: string } {
  const principle = principleAnswersConsideration(world, personId, [
    { propositionId, answer: "yes" },
  ]);
  const considerations: DecisionConsideration[] = [
    ...(principle
      ? [
          {
            ...principle,
            explanation:
              principle.optionKey === "vote-yea"
                ? "The amendment writes in what the member's principles call for."
                : "The amendment cuts against the member's principles.",
          },
        ]
      : []),
    {
      // PLACEHOLDER weight: changing the Constitution is a higher bar than
      // passing a law, and a member needs more than a slight reason to clear it.
      stableKey: "member:constitutional-bar",
      optionKey: "vote-nay",
      sourceType: "context:constitutional-bar",
      direction: "supports",
      importance: "moderate",
      confidence: "medium",
      explanation:
        "Changing the Constitution asks more than passing a law does.",
      sourceRefs: [],
    },
  ];
  const evaluation = evaluateDecision(world, {
    stableKey,
    decisionType: "governing.constitutional-amendment-vote",
    actorPersonId: personId,
    cutoff: currentHistoricalCutoff(world),
    subject: {
      kind: "context:constitutional-amendment",
      key: stableKey,
      entityId: null,
    },
    options: [...VOTE_OPTIONS],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  const ballot = evaluation.selectedOptionKey === "vote-yea" ? "yea" : "nay";
  const reason =
    considerations.find(
      (consideration) => consideration.optionKey === `vote-${ballot}`,
    )?.stableKey ?? "member:no-reason";
  return { ballot, reason };
}

function proposalText(world: World, propositionId: EntityId): string {
  const name = world.policyCatalog.propositions[propositionId]?.name ?? "";
  return `The policy "${name}" shall be the law of the United States.`;
}

/** Puts a proposed amendment before each state's legislature, each on its own day. */
function scheduleStateActions(world: World, measureKey: string): World {
  let next = world;
  for (const stateKey of ARTICLE_V_STATE_KEYS) {
    const days =
      1 +
      new SeededRng(world.seed)
        .fork(`${measureKey}:${stateKey}:day`)
        .integer(0, ARTICLE_V_PROFILE.stateActionWindowDays);
    next = scheduleFutureDueItem(next, {
      stableKey: `${measureKey}:state:${stateKey}`,
      dueAt: addDays(next.currentDate, days),
      transitionKey: ARTICLE_V_STATE_ACTION,
      entityIds: [NATIONAL_ELECTION_JURISDICTION.id],
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      provenance: {
        kind: "authored",
        note: "A state legislature takes up a proposed amendment (its day is a placeholder spread).",
      },
    });
  }
  return next;
}

function yearsLater(date: IsoDate, years: number): IsoDate {
  const year = Number(date.slice(0, 4)) + years;
  const monthDay = date.slice(5) === "02-29" ? "02-28" : date.slice(5);
  return makeIsoDate(`${year}-${monthDay}`);
}

function propose(
  world: World,
  input: {
    readonly measureKey: string;
    readonly propositionId: EntityId;
    readonly byConvention: boolean;
  },
): { readonly world: World; readonly measureId: EntityId } {
  const name =
    world.policyCatalog.propositions[input.propositionId]?.name ?? "";
  const year = world.currentDate.slice(0, 4);
  const next = proposeConstitutionalMeasure(
    ensureNationalElectionJurisdiction(world),
    {
      stableKey: input.measureKey,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      jurisdictionKey: "US",
      processKind: "federal-amendment",
      designation: `Proposed Amendment to the Constitution (${year}): ${name}`,
      shortTitle: name,
      text: proposalText(world, input.propositionId),
      textVersion: "v1",
      sponsoringAuthority: input.byConvention
        ? "A convention called on the applications of two-thirds of the states"
        : "The Congress of the United States",
      sponsorPersonId: null,
      ratificationMode: "state-legislatures",
      deadlineAt: yearsLater(
        world.currentDate,
        ARTICLE_V_PROFILE.ratificationYears,
      ),
      delayedOperativeAt: null,
      ruleDelta: {
        kind: "policy-provision",
        propositionId: input.propositionId,
        stance: "adopt",
      },
      ordinaryMeasureId: null,
      ...(input.byConvention ? { proposedBy: "convention" as const } : {}),
    },
  );
  return {
    world: next,
    measureId: next.history.constitutionalMeasures!.at(-1)!.id,
  };
}

/** Congress's route: the question most of both houses lean toward, if two-thirds do. */
function congressRoute(world: World, year: number): World {
  const house = congressVoters(world, "house");
  const senate = congressVoters(world, "senate");
  if (house.length === 0 || senate.length === 0) return world;
  const measureKey = `${ARTICLE_V_VERSION}:US:${year}:congress`;
  const ranked: { readonly id: EntityId; readonly share: number }[] = [];
  for (const id of federalQuestions(world)) {
    if (settledOrPending(world, id)) continue;
    const share = Math.min(
      leanShare(world, house, id),
      leanShare(world, senate, id),
    );
    if (share * 3 < 2) continue;
    ranked.push({ id, share });
  }
  ranked.sort((a, b) => b.share - a.share);
  // A member proposes again only when something has changed since Congress
  // last turned the question down: the members, or how any of them would
  // vote now. The same Congress voting the same way would only repeat the
  // rejection.
  const best =
    ranked.find(
      (row) =>
        !repeatsLastRejection(world, row.id, measureKey, { house, senate }),
    ) ?? null;
  if (!best) return world;
  const proposed = propose(world, {
    measureKey,
    propositionId: best.id,
    byConvention: false,
  });
  const measureId = proposed.measureId;
  let next = proposed.world;
  const player = controlledPersonId(next);
  for (const [bodyKey, voters] of [
    ["house", house],
    ["senate", senate],
  ] as const) {
    const dispositions: LegislativeVoteDisposition[] = voters.map((voter) => {
      if (voter.personId === player)
        return {
          memberKey: voter.memberKey,
          personId: voter.personId,
          disposition: "absent" as const,
        };
      const { ballot, reason } = memberBallot(
        next,
        `${measureKey}:${voter.memberKey}`,
        voter.personId,
        best!.id,
      );
      return {
        memberKey: voter.memberKey,
        personId: voter.personId,
        disposition: ballot,
        reason,
      };
    });
    next = recordConstitutionalProposalVote(
      next,
      measureId,
      bodyKey,
      dispositions,
      voters.length,
      {
        method: "member-decisions",
        note: "Each member voted by their own principles against the bar of amending the Constitution.",
        sourceEntityIds: [],
      },
    );
    if (constitutionalPosition(next, measureId).phase === "rejected")
      return next;
  }
  return scheduleStateActions(next, measureKey);
}

/**
 * Whether Congress last rejected this question and every member who voted
 * then would cast the same ballot now, with no member added or gone.
 */
function repeatsLastRejection(
  world: World,
  propositionId: EntityId,
  measureKey: string,
  voters: {
    readonly house: readonly Voter[];
    readonly senate: readonly Voter[];
  },
): boolean {
  const last = (world.history.constitutionalMeasures ?? [])
    .filter(
      (measure) =>
        measure.jurisdictionKey === "US" &&
        measure.proposedBy !== "convention" &&
        measure.ruleDelta.kind === "policy-provision" &&
        measure.ruleDelta.propositionId === propositionId,
    )
    .at(-1);
  if (!last || constitutionalPosition(world, last.id).phase !== "rejected")
    return false;
  const player = controlledPersonId(world);
  for (const action of constitutionalActions(world, last.id)) {
    if (action.detail.kind !== "proposal-vote") continue;
    const bodyKey = action.detail.bodyKey;
    const now = bodyKey === "house" ? voters.house : voters.senate;
    const then = new Map(
      action.detail.vote.dispositions.map((row) => [
        row.personId,
        row.disposition,
      ]),
    );
    if (then.size !== now.length) return false;
    for (const voter of now) {
      const before = then.get(voter.personId);
      if (before === undefined) return false;
      const ballot =
        voter.personId === player
          ? "absent"
          : memberBallot(
              world,
              `${measureKey}:${voter.memberKey}`,
              voter.personId,
              propositionId,
            ).ballot;
      if (ballot !== before) return false;
    }
  }
  return true;
}

function applicationKey(stateKey: string, propositionId: EntityId): string {
  return `${ARTICLE_V_VERSION}:application:${stateKey}:${propositionId}`;
}

function callKey(propositionId: EntityId): string {
  return `${ARTICLE_V_VERSION}:call:${propositionId}`;
}

/**
 * The states whose application for a convention on this question stands.
 * An application stands until the state's legislature votes to rescind it,
 * as real legislatures have done; a state may apply again afterward.
 */
export function conventionApplications(
  world: World,
  propositionId: EntityId,
): readonly string[] {
  const standing = new Map<string, boolean>();
  for (const event of world.history.events) {
    if (
      event.type !== CONVENTION_APPLICATION_EVENT &&
      event.type !== CONVENTION_RESCISSION_EVENT
    )
      continue;
    if (!event.tags.includes(`proposition:${propositionId}`)) continue;
    for (const tag of event.tags)
      if (tag.startsWith("state:"))
        standing.set(
          tag.slice("state:".length),
          event.type === CONVENTION_APPLICATION_EVENT,
        );
  }
  return [...standing].flatMap(([state, stands]) => (stands ? [state] : []));
}

/** The states' route: applications, and a convention once 34 name one question. */
function conventionRoute(world: World): World {
  const federalId = NATIONAL_ELECTION_JURISDICTION.id;
  let next = world;
  const questions = federalQuestions(next);
  for (const stateKey of ARTICLE_V_STATE_KEYS) {
    const usps = stateKey.slice(3);
    const voice = stateVoice(next, usps);
    if (voice.personIds.length === 0) continue;
    next = ensureOfficeholderPrinciples(next, voice.personIds);
    for (const id of questions) {
      const first = applicationKey(stateKey, id);
      const stands =
        hasStableKey(next.history.events, first) &&
        conventionApplications(next, id).includes(stateKey);
      if (stands) {
        // The legislature rescinds once most of its members have come to
        // lean against the question (their own principles, read today).
        if (!mostLeanNo(next, voice.personIds, id)) continue;
        const name = next.policyCatalog.propositions[id]?.name ?? "";
        next = recordWorldEvent(next, {
          stableKey: `${ARTICLE_V_VERSION}:rescission:${stateKey}:${id}:${next.currentDate}`,
          type: CONVENTION_RESCISSION_EVENT,
          occurredAt: next.currentDate,
          recordedAt: next.currentDate,
          jurisdictionId: federalId,
          involvedEntityIds: [federalId],
          participants: [],
          personFactConstraints: [],
          visibility: "public",
          tags: [
            ARTICLE_V_VERSION,
            `state:${stateKey}`,
            `proposition:${id}`,
            ...(voice.estimated ? ["estimated:congress-delegation"] : []),
          ],
          summary: `The ${usps} legislature rescinded its application for a convention to propose an amendment: "${name}".`,
          context: CONTEXT,
        });
        continue;
      }
      const key = hasStableKey(next.history.events, first)
        ? `${first}:${next.currentDate}`
        : first;
      if (hasStableKey(next.history.events, key)) continue;
      if (settledOrPending(next, id)) continue;
      if (lawInForce(next, federalId, id)?.answer === "yes") continue;
      if (!mostLeanYes(next, voice.personIds, id)) continue;
      const name = next.policyCatalog.propositions[id]?.name ?? "";
      next = recordWorldEvent(next, {
        stableKey: key,
        type: CONVENTION_APPLICATION_EVENT,
        occurredAt: next.currentDate,
        recordedAt: next.currentDate,
        jurisdictionId: federalId,
        involvedEntityIds: [federalId],
        participants: [],
        personFactConstraints: [],
        visibility: "public",
        tags: [
          ARTICLE_V_VERSION,
          `state:${stateKey}`,
          `proposition:${id}`,
          ...(voice.estimated ? ["estimated:congress-delegation"] : []),
        ],
        summary: `The ${usps} legislature applied to Congress for a convention to propose an amendment: "${name}".`,
        context: CONTEXT,
      });
    }
  }
  for (const id of questions) {
    if (next.history.events.some((event) => event.stableKey === callKey(id)))
      continue;
    const states = conventionApplications(next, id);
    if (states.length < ARTICLE_V_PROFILE.applicationsToCall) continue;
    const name = next.policyCatalog.propositions[id]?.name ?? "";
    next = recordWorldEvent(next, {
      stableKey: callKey(id),
      type: CONVENTION_CALL_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: federalId,
      involvedEntityIds: [federalId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        ARTICLE_V_VERSION,
        `proposition:${id}`,
        `applications:${states.length}`,
      ],
      summary: `With ${states.length} of 50 state legislatures applying, Congress called a convention to propose an amendment: "${name}".`,
      context: CONTEXT,
    });
    next = scheduleFutureDueItem(next, {
      stableKey: `${callKey(id)}:vote`,
      dueAt: addDays(next.currentDate, ARTICLE_V_PROFILE.conventionDays),
      transitionKey: ARTICLE_V_CONVENTION,
      entityIds: [federalId],
      jurisdictionId: federalId,
      provenance: {
        kind: "authored",
        note: "The convention Congress called votes on its proposal (the interval is a placeholder).",
      },
    });
  }
  return next;
}

/** The yearly review: Congress may propose, and legislatures may apply. */
export function articleVReviewHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const match = /:US:(\d{4}):review$/.exec(due.stableKey);
  if (!match) return done(world, "No year matches this review.");
  const year = Number(match[1]);
  let next = scheduleNextReview(world, world.currentDate);
  const members = [
    ...congressVoters(next, "house"),
    ...congressVoters(next, "senate"),
  ].map((voter) => voter.personId);
  next = ensureOfficeholderPrinciples(next, members);
  const before = (next.history.constitutionalMeasures ?? []).length;
  next = congressRoute(next, year);
  next = conventionRoute(next);
  const proposed = (next.history.constitutionalMeasures ?? []).length > before;
  return done(
    next,
    proposed
      ? "Congress voted on a proposed amendment."
      : "No amendment had the support to be proposed this year.",
  );
}

/** The convention Congress called votes, one vote per state. */
export function articleVConventionHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const call = world.history.events.find(
    (event) => `${event.stableKey}:vote` === due.stableKey,
  );
  const propositionId = call?.tags
    .find((tag) => tag.startsWith("proposition:"))
    ?.slice("proposition:".length) as EntityId | undefined;
  if (!call || !propositionId)
    return done(world, "No convention call matches this vote.");
  if (settledOrPending(world, propositionId))
    return done(
      world,
      "The question was already settled or before the states.",
    );
  const measureKey = `${ARTICLE_V_VERSION}:US:convention:${propositionId}`;
  const proposed = propose(world, {
    measureKey,
    propositionId,
    byConvention: true,
  });
  const measureId = proposed.measureId;
  let next = proposed.world;
  // Members seated since the review hold principles of their own before they
  // vote; unknown is never counted as no.
  for (const stateKey of ARTICLE_V_STATE_KEYS)
    next = ensureOfficeholderPrinciples(
      next,
      stateVoice(next, stateKey.slice(3)).personIds,
    );
  const dispositions: LegislativeVoteDisposition[] = ARTICLE_V_STATE_KEYS.map(
    (stateKey) => {
      const voice = stateVoice(next, stateKey.slice(3));
      return {
        memberKey: `${ARTICLE_V_CONVENTION_BODY}:${stateKey}`,
        personId: null,
        disposition: mostLeanYes(next, voice.personIds, propositionId)
          ? ("yea" as const)
          : ("nay" as const),
      };
    },
  );
  next = recordConstitutionalProposalVote(
    next,
    measureId,
    ARTICLE_V_CONVENTION_BODY,
    dispositions,
    ARTICLE_V_STATE_KEYS.length,
    {
      method: "member-decisions",
      note: "Each state's delegation voted as most of its legislature's members lean (ESTIMATED from the state's members of Congress where the legislature is not seated).",
      sourceEntityIds: [],
    },
  );
  if (constitutionalPosition(next, measureId).phase === "rejected")
    return done(next, "The convention did not propose the amendment.");
  return done(
    scheduleStateActions(next, measureKey),
    "The convention proposed the amendment to the states.",
  );
}

/** One state legislature acts on a proposed amendment. */
export function articleVStateActionHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  const match = /^(.+):state:(US-[A-Z]{2})$/.exec(due.stableKey);
  const measure = match
    ? (world.history.constitutionalMeasures ?? []).find(
        (candidate) => candidate.stableKey === match[1],
      )
    : undefined;
  if (!match || !measure || measure.ruleDelta.kind !== "policy-provision")
    return done(world, "No amendment matches this state action.");
  if (constitutionalPosition(world, measure.id).phase !== "ratification")
    return done(world, "The amendment is no longer before the states.");
  const stateKey = match[2]!;
  const voice = stateVoice(world, stateKey.slice(3));
  let next = ensureOfficeholderPrinciples(world, voice.personIds);
  const approved = mostLeanYes(
    next,
    voice.personIds,
    measure.ruleDelta.propositionId,
  );
  next = recordArticleVRatification(next, measure.id, {
    kind: "state-ratification",
    stateKey,
    body: "state-legislature",
    approved,
    authenticationKey: `${measure.stableKey}:${stateKey}:${next.currentDate}`,
  });
  const after = constitutionalPosition(next, measure.id);
  return done(
    next,
    after.phase === "operative" || after.phase === "ratified"
      ? `${stateKey.slice(3)} ratified ${measure.designation}, the ${after.ratifiedStates.length}th state; it is now part of the Constitution.`
      : approved
        ? `${stateKey.slice(3)} ratified ${measure.designation}.`
        : `${stateKey.slice(3)} declined to ratify ${measure.designation}.`,
  );
}

export const ARTICLE_V_HANDLERS = [
  [ARTICLE_V_REVIEW, articleVReviewHandler],
  [ARTICLE_V_CONVENTION, articleVConventionHandler],
  [ARTICLE_V_STATE_ACTION, articleVStateActionHandler],
] as const;
