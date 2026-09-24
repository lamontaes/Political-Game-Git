import { makeIsoDate } from "../dates";
import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import { currentPresidentOf } from "../crisis/offices";
import { scheduleFutureDueItem } from "../future-transitions";
import { measurePosition, measureVotes } from "../legislation";
import { chamberByKey } from "../legislature-rules";
import { publicPartyAffiliation } from "../living-world/congress";
import { livingWorldEstablished } from "../living-world/opening";
import { nextMeasureDesignation } from "../measure-numbering";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  CONGRESS_SITTING_TRANSITION,
  COSPONSOR_EVENT,
  isCongressMeasure,
  measureCosponsors,
  nationalPartyKeys,
  scheduleCongressSitting,
  seatedCongressChamber,
  withSittingSeating,
} from "./congress-chambers";
import {
  applyInstitutionStep,
  recordGovernorDecisionOnMeasure,
  scheduleInstitutionStep,
} from "./legislative-clock";
import type { SeatedMember } from "../legislation-scenarios";
import { lawInForce } from "./law-in-force";
import {
  ensureOfficeholderPrinciples,
  principledLeaning,
} from "./officeholder-principles";
import {
  automaticLawQuestionOnCooldown,
  automaticLawMappingFor,
  introduceAutomaticLawMeasure,
} from "./automatic-legislation";

/**
 * CONGRESS MAKES LAW — members of Congress file bills on the questions their
 * own principles press hardest, colleagues who lean the same way sign on, and the bill moves through
 * both Houses and to the President on the same clock that moves a state bill.
 *
 * Every step after filing belongs to the legislative clock
 * (`legislative-clock.ts`), which reads the Congress pack's rules and each
 * seated member's own decision. This file does the three things that clock
 * does not: it files bills, it gathers cosponsors, and it decides what the
 * President does with a bill on the desk.
 *
 * A Congress bill answers one federal question in the policy catalog. Only
 * questions with a mapped operative configuration are filed; other catalog
 * answers remain unsupported until their exact effects are implemented.
 */

export const CONGRESS_LAWMAKING_VERSION = "congress-intake/v1";
export const CONGRESS_INTAKE_TRANSITION = "congress:intake" as const;
export const SPONSOR_MOTIVE_EVENT = "legislation.sponsor-motive" as const;

/**
 * PLACEHOLDER, every number here, until research question
 * how-congress-moves-bills is answered.
 *
 * - One bill is filed in each House on the first day of every month. The
 *   real Congress files more than ten thousand bills in two years and enacts
 *   a few hundred; a save cannot carry ten thousand, so this is a trickle of
 *   the bills that get a hearing.
 * - A member files on the federal question their own principles press
 *   hardest, once the summed weight reaches the filing threshold: the same
 *   placeholder threshold a state legislator files at (member-agenda.ts).
 * - Every other member of the sponsor's party whose principles lean the same
 *   way that hard signs on. A member of the other party who leans that way
 *   signs on one time in ten.
 */
export const CONGRESS_LAWMAKING_PROFILE = {
  id: "ocd-congress-lawmaking/v1",
  intakeDayOfMonth: 1,
  filingThreshold: 3,
  crossPartyCosponsorOneIn: 10,
} as const;

/** A federal question in the catalog, with the federal issue it sits under. */
interface FederalQuestion {
  readonly propositionId: EntityId;
  /** The issue key inside the federal pack, such as `tax.income-tax`. */
  readonly issueKey: string;
}

const FEDERAL_ISSUE_PREFIX = "us-federal:";

/** The questions in the catalog that are decided at the federal level. */
function federalQuestions(world: World): readonly FederalQuestion[] {
  const catalog = world.policyCatalog;
  const questions: FederalQuestion[] = [];
  for (const propositionId of catalog.propositionOrder) {
    const proposition = catalog.propositions[propositionId];
    if (
      !proposition ||
      (!automaticLawMappingFor(proposition.stableKey, "yes", "federal") &&
        !automaticLawMappingFor(proposition.stableKey, "no", "federal"))
    )
      continue;
    const issue = catalog.issues[proposition.issueId];
    if (
      !issue?.levels?.includes("federal") ||
      !issue.stableKey.startsWith(FEDERAL_ISSUE_PREFIX)
    )
      continue;
    questions.push({
      propositionId,
      issueKey: issue.stableKey.slice(FEDERAL_ISSUE_PREFIX.length),
    });
  }
  return questions;
}

function subjectClassFor(
  issueKey: string,
): LegislativeMeasureRecord["subjectClass"] {
  if (issueKey.startsWith("tax.")) return "revenue";
  if (issueKey === "budget.appropriations") return "appropriation";
  return "general-policy";
}

function controlledPersonId(world: World): EntityId | null {
  return world.control.kind === "person" ? world.control.personId : null;
}

/** A federal bill still moving that answers the question. */
function pendingFederalBillOn(world: World, propositionId: EntityId): boolean {
  return (world.history.legislativeMeasures ?? []).some(
    (measure) =>
      isCongressMeasure(measure) &&
      (measure.propositionAnswers ?? []).some(
        (row) => row.propositionId === propositionId,
      ) &&
      !measurePosition(world, measure.id).terminal,
  );
}

/**
 * The bill a member's principles move them to file: the strongest eligible
 * mapped question this House may start, past the filing threshold, where
 * federal law does not already say what they want and no federal bill on it
 * is moving. An unsupported answer is skipped rather than filed without an
 * operative configuration. Null when nothing mapped moves them.
 */
function memberBillChoice(
  world: World,
  personId: EntityId,
  chamberKey: "house" | "senate",
  questions: readonly FederalQuestion[],
  lawAnswers: Map<EntityId, "yes" | "no" | null>,
  pending: Map<EntityId, boolean>,
  coolingDown: Map<EntityId, boolean>,
): {
  readonly question: FederalQuestion;
  readonly answer: "yes" | "no";
  readonly weight: number;
  readonly principleScore: number;
  readonly principleRecordIds: readonly EntityId[];
} | null {
  let best: {
    question: FederalQuestion;
    answer: "yes" | "no";
    weight: number;
    principleScore: number;
    principleRecordIds: readonly EntityId[];
  } | null = null;
  for (const question of questions) {
    if (
      chamberKey !== "house" &&
      subjectClassFor(question.issueKey) === "revenue"
    )
      continue;
    const leaning = principledLeaning(world, personId, question.propositionId);
    if (Math.abs(leaning.score) < CONGRESS_LAWMAKING_PROFILE.filingThreshold)
      continue;
    if (best && Math.abs(leaning.score) <= best.weight) continue;
    if (!lawAnswers.has(question.propositionId))
      lawAnswers.set(
        question.propositionId,
        lawInForce(
          world,
          NATIONAL_ELECTION_JURISDICTION.id,
          question.propositionId,
        )?.answer ?? null,
      );
    const lawAnswer = lawAnswers.get(question.propositionId);
    const answer: "yes" | "no" | null =
      leaning.score > 0
        ? lawAnswer === "yes"
          ? null
          : "yes"
        : lawAnswer === "yes"
          ? "no"
          : null;
    if (!answer) continue;
    const proposition =
      world.policyCatalog.propositions[question.propositionId];
    if (
      !proposition ||
      !automaticLawMappingFor(proposition.stableKey, answer, "federal")
    )
      continue;
    if (!pending.has(question.propositionId))
      pending.set(
        question.propositionId,
        pendingFederalBillOn(world, question.propositionId),
      );
    if (pending.get(question.propositionId)) continue;
    if (!coolingDown.has(question.propositionId))
      coolingDown.set(
        question.propositionId,
        automaticLawQuestionOnCooldown(world, {
          jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
          propositionId: question.propositionId,
          stableKeyPrefix: `${CONGRESS_LAWMAKING_VERSION}:`,
        }),
      );
    if (coolingDown.get(question.propositionId)) continue;
    best = {
      question,
      answer,
      weight: Math.abs(leaning.score),
      principleScore: leaning.score,
      principleRecordIds: leaning.recordIds,
    };
  }
  return best;
}

/**
 * One member of one House files a bill on the federal question their own
 * principles press hardest (see officeholder-principles.ts). Unchanged when
 * Congress is not seated, when no member leans hard enough on any open
 * question this House may start, or when this intake already ran.
 */
export function fileCongressBill(
  world: World,
  input: {
    readonly chamberKey: "house" | "senate";
    readonly intakeKey: string;
  },
): World {
  const seated = seatedCongressChamber(world, input.chamberKey);
  if (!seated) return world;
  const intakePrefix = `${CONGRESS_LAWMAKING_VERSION}:`;
  const intakeSuffix = `:${input.intakeKey}:${input.chamberKey}`;
  if (
    (world.history.legislativeMeasures ?? []).some(
      (measure) =>
        measure.stableKey.startsWith(intakePrefix) &&
        measure.stableKey.endsWith(intakeSuffix),
    )
  )
    return world;
  const player = controlledPersonId(world);
  const rng = new SeededRng(world.seed).fork(
    `${CONGRESS_LAWMAKING_VERSION}:${input.intakeKey}:${input.chamberKey}`,
  );
  // Every member who will vote on the bill holds principles, in both Houses.
  let next = ensureOfficeholderPrinciples(
    world,
    (["house", "senate"] as const).flatMap(
      (chamberKey) =>
        seatedCongressChamber(world, chamberKey)?.body.members.flatMap(
          (member) => (member.personId ? [member.personId] : []),
        ) ?? [],
    ),
  );
  const questions = federalQuestions(next);
  const chamber = chamberByKey(US_CONGRESS_RULE_PACK, input.chamberKey);
  // Draw sponsors until one is moved to file something.
  const order = seated.body.members.filter(
    (member) => member.personId && member.personId !== player,
  );
  const lawAnswers = new Map<EntityId, "yes" | "no" | null>();
  const pending = new Map<EntityId, boolean>();
  const coolingDown = new Map<EntityId, boolean>();
  let sponsor: SeatedMember | null = null;
  let choice: ReturnType<typeof memberBillChoice> = null;
  while (order.length > 0 && !choice) {
    const candidate = order.splice(rng.integer(0, order.length), 1)[0]!;
    choice = memberBillChoice(
      next,
      candidate.personId!,
      input.chamberKey,
      questions,
      lawAnswers,
      pending,
      coolingDown,
    );
    if (choice) sponsor = candidate;
  }
  if (!sponsor || !choice) return world;

  const { question, answer } = choice;
  const proposition = next.policyCatalog.propositions[question.propositionId]!;
  const stableKey = `${CONGRESS_LAWMAKING_VERSION}:${question.issueKey}${intakeSuffix}`;
  next = ensureNationalElectionJurisdiction(next);
  const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
  const designation = nextMeasureDesignation(next, {
    jurisdictionId,
    originChamber: chamber,
  });
  const introduced = introduceAutomaticLawMeasure(next, {
    jurisdictionId,
    governmentLevel: "federal",
    propositionId: question.propositionId,
    answer,
    intakeKey: stableKey,
    stableKey,
    designation,
    sponsorPersonId: sponsor.personId!,
    originChamberKey: input.chamberKey,
    principleRecordIds: choice.principleRecordIds,
    principleScore: choice.principleScore,
  });
  if (!introduced) return world;
  next = introduced.world;
  const measure = (next.history.legislativeMeasures ?? []).find(
    (candidate) => candidate.id === introduced.measureId,
  );
  if (!measure)
    throw new Error(`${designation} was not recorded after introduction.`);
  next = recordWorldEvent(next, {
    stableKey: `${stableKey}:motive`,
    type: SPONSOR_MOTIVE_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId,
    involvedEntityIds: [measure.id, sponsor.personId!].sort(),
    participants: [
      {
        personId: sponsor.personId!,
        role: "agency:sponsor",
        detail: `Sponsor of ${designation}`,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CONGRESS_LAWMAKING_VERSION,
      `issue:${question.issueKey}`,
      `proposition:${proposition.stableKey}`,
      "motive:principle",
    ],
    summary:
      answer === "yes"
        ? `${sponsor.name} filed ${designation} because their own principles call for it: ${proposition.question}`
        : `${sponsor.name} filed ${designation} to repeal a law their own principles oppose: ${proposition.question}`,
    context: emptyContext(),
  });
  next = gatherCosponsors(
    next,
    measure,
    sponsor,
    question,
    answer,
    seated.body.members,
    rng,
  );
  return scheduleInstitutionStep(next, measure.id);
}

function gatherCosponsors(
  world: World,
  measure: LegislativeMeasureRecord,
  sponsor: SeatedMember,
  question: FederalQuestion,
  answer: "yes" | "no",
  members: readonly SeatedMember[],
  rng: SeededRng,
): World {
  const player = controlledPersonId(world);
  const joining = members.filter((member) => {
    if (
      !member.personId ||
      member.personId === sponsor.personId ||
      member.personId === player
    )
      return false;
    const leaning = principledLeaning(
      world,
      member.personId,
      question.propositionId,
    ).score;
    if (
      (answer === "yes" ? leaning : -leaning) <
      CONGRESS_LAWMAKING_PROFILE.filingThreshold
    )
      return false;
    if (member.partyKey && member.partyKey === sponsor.partyKey) return true;
    return (
      rng
        .fork(`cosponsor:${member.personId}`)
        .integer(0, CONGRESS_LAWMAKING_PROFILE.crossPartyCosponsorOneIn) === 0
    );
  });
  if (joining.length === 0) return world;
  return recordWorldEvent(world, {
    stableKey: `${measure.stableKey}:cosponsors`,
    type: COSPONSOR_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: measure.jurisdictionId,
    involvedEntityIds: [
      measure.id,
      ...joining.map((member) => member.personId!),
    ].sort(),
    participants: joining.map((member) => ({
      personId: member.personId!,
      role: "agency:cosponsor",
      detail: `Cosponsor of ${measure.designation}`,
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [CONGRESS_LAWMAKING_VERSION, `issue:${question.issueKey}`],
    summary: `${joining.length === 1 ? "One member" : `${joining.length} members`} whose principles lean the same way signed on to ${measure.designation}: ${joining.map((member) => member.name).join(", ")}.`,
    context: emptyContext(),
  });
}

/* ------------------------------------------------------------------ *
 * The President's desk
 * ------------------------------------------------------------------ */

function partyKeyOf(world: World, personId: EntityId): string | null {
  const organizationId = publicPartyAffiliation(world, personId);
  return organizationId
    ? (nationalPartyKeys(world).get(organizationId) ?? null)
    : null;
}

/**
 * What a non-player President does with a bill.
 *
 * PLACEHOLDER until research question how-congress-moves-bills is
 * answered. The President signs a bill that carries the name of a member of
 * their own party. Otherwise they veto it when most of their own party's
 * members who voted on it in either House voted no, and sign it when their
 * party did not object.
 */
export function presidentialDecision(
  world: World,
  measure: LegislativeMeasureRecord,
  presidentPersonId: EntityId,
): { readonly action: "signed" | "vetoed"; readonly rationale: string } {
  const party = partyKeyOf(world, presidentPersonId);
  const backers = [
    ...(measure.sponsorPersonId ? [measure.sponsorPersonId] : []),
    ...measureCosponsors(world, measure.id),
  ];
  if (
    party &&
    backers.some((personId) => partyKeyOf(world, personId) === party)
  )
    return {
      action: "signed",
      rationale:
        "The bill carries the name of a member of the President's party.",
    };
  if (party) {
    const sameParty = new Set<EntityId>();
    for (const chamberKey of ["house", "senate"]) {
      for (const member of seatedCongressChamber(world, chamberKey)?.body
        .members ?? [])
        if (member.personId && member.partyKey === party)
          sameParty.add(member.personId);
    }
    for (const vote of measureVotes(world, measure.id)) {
      if (vote.purpose !== "floor-stage") continue;
      let yea = 0;
      let nay = 0;
      for (const entry of vote.dispositions) {
        if (!entry.personId || !sameParty.has(entry.personId)) continue;
        if (entry.disposition === "yea") yea += 1;
        if (entry.disposition === "nay") nay += 1;
      }
      if (nay > yea)
        return {
          action: "vetoed",
          rationale:
            "Most of the President's own party in Congress voted against the bill.",
        };
    }
  }
  return {
    action: "signed",
    rationale: "The President's party raised no objection to the bill.",
  };
}

/**
 * A Congress bill on the President's desk. A non-player President decides it
 * on the day it arrives. A player President's desk is not built yet, so the
 * bill waits there; with no President recorded at all, it waits too, and
 * nothing is invented.
 */
export function presidentDesk(
  world: World,
  measure: LegislativeMeasureRecord,
): World {
  if (measurePosition(world, measure.id).phase !== "awaiting-executive")
    return world;
  const president = currentPresidentOf(world);
  if (!president) return world;
  if (president.personId === controlledPersonId(world)) return world;
  const decision = presidentialDecision(world, measure, president.personId);
  return scheduleInstitutionStep(
    recordGovernorDecisionOnMeasure(
      world,
      measure.id,
      decision.action,
      decision.rationale,
      president.personId,
    ),
    measure.id,
  );
}

/* ------------------------------------------------------------------ *
 * Calendar
 * ------------------------------------------------------------------ */

function nextIntakeDate(after: IsoDate): IsoDate {
  const year = Number(after.slice(0, 4));
  const month = Number(after.slice(5, 7));
  const day = String(CONGRESS_LAWMAKING_PROFILE.intakeDayOfMonth).padStart(
    2,
    "0",
  );
  const thisMonth = makeIsoDate(
    `${year}-${String(month).padStart(2, "0")}-${day}`,
  );
  if (thisMonth > after) return thisMonth;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return makeIsoDate(
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-${day}`,
  );
}

function scheduleNextIntake(world: World): World {
  const dueAt = nextIntakeDate(world.currentDate);
  const stableKey = `${CONGRESS_LAWMAKING_VERSION}:intake:${dueAt}`;
  if (world.history.futureDueItems.some((due) => due.stableKey === stableKey))
    return world;
  const next = ensureNationalElectionJurisdiction(world);
  return scheduleFutureDueItem(next, {
    stableKey,
    dueAt,
    transitionKey: CONGRESS_INTAKE_TRANSITION,
    entityIds: [NATIONAL_ELECTION_JURISDICTION.id],
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    provenance: {
      kind: "authored",
      note: `${CONGRESS_LAWMAKING_PROFILE.id}: members of Congress file bills on the first of the month. The game's calendar, not Congress's.`,
    },
  });
}

/**
 * Called whenever the canonical clock moves. Keeps Congress's next filing day
 * on the calendar once the save has a seated Congress. Only writes a future
 * due item.
 */
export function applyCongressLawmaking(before: IsoDate, world: World): World {
  if (world.currentDate <= before) return world;
  if (!livingWorldEstablished(world)) return world;
  return scheduleNextIntake(world);
}

export function congressIntakeHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  let next = world;
  for (const chamberKey of ["house", "senate"] as const)
    next = fileCongressBill(next, { chamberKey, intakeKey: due.dueAt });
  next = scheduleNextIntake(next);
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: "Members of Congress filed their bills.",
    outcomeEventId: null,
  };
}

/**
 * A sitting of Congress: every open federal bill takes its next step, in the
 * order it was filed, and the next sitting goes on the calendar while any bill
 * is still open.
 */
export function congressSittingHandler(
  world: World,
): FutureTransitionHandlerResult {
  let next = world;
  let steps = 0;
  const open = (next.history.legislativeMeasures ?? []).filter(
    (measure) =>
      isCongressMeasure(measure) && !measurePosition(next, measure.id).terminal,
  );
  withSittingSeating(world, () => {
    for (const measure of open) {
      const result = applyInstitutionStep(next, measure.id, (w, m) =>
        presidentDesk(w, m),
      );
      if (result.kind === "applied" || result.kind === "executive") {
        next = result.world;
        steps += 1;
      } else if (result.kind === "wait-until" && result.world) {
        next = result.world;
      }
    }
  });
  const stillOpen = (next.history.legislativeMeasures ?? []).some(
    (measure) =>
      isCongressMeasure(measure) && !measurePosition(next, measure.id).terminal,
  );
  if (stillOpen) next = scheduleCongressSitting(next);
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: `Congress sat and took ${steps} step${steps === 1 ? "" : "s"} on its bills.`,
    outcomeEventId: null,
  };
}

export const CONGRESS_LAWMAKING_HANDLERS = [
  [CONGRESS_INTAKE_TRANSITION, congressIntakeHandler],
  [CONGRESS_SITTING_TRANSITION, congressSittingHandler],
] as const;

function emptyContext() {
  return {
    location: null,
    socialContext: null,
    pressure: null,
    choice: null,
    motivation: null,
    immediateReaction: null,
  };
}
