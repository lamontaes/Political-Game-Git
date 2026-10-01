import { makeIsoDate } from "../dates";
import {
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "../congress-rule-pack";
import { currentPresidentOf } from "../crisis/offices";
import { scheduleFutureDueItem } from "../future-transitions";
import { introduceMeasure, measurePosition } from "../legislation";
import { chamberByKey } from "../legislature-rules";
import { livingWorldEstablished } from "../living-world/opening";
import { nextMeasureNumbering } from "../measure-numbering";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import { agendaCaucus, majorityAgendaChoice } from "./majority-agenda";
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
import { lawInForce, statuteAnswer } from "./law-in-force";
import { mayAnswerQuestion } from "./question-authority";
import {
  ensureOfficeholderPrinciples,
  principledLeaning,
} from "./officeholder-principles";
import {
  automaticLawQuestionOnCooldown,
  automaticLawMappingFor,
  introduceAutomaticLawMeasure,
} from "./automatic-legislation";
import { hasStableKey } from "../history-index";
import { openPresidentBillMatter } from "./state-governing";
import { recordDurableDecisionTrace } from "../decisions";
import {
  BILL_SIGN,
  BILL_RETURN,
  evaluateGovernorBill,
} from "./governor-bill-decision";

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
 * A Congress bill answers one federal question in the policy catalog, yes
 * or no. A question with a mapped operative configuration is filed with it
 * (see automatic-legislation.ts). A question without one is still filed, as a
 * bill that says only its yes or no answer, so mapping coverage never narrows
 * what Congress takes up.
 *
 * PLACEHOLDER, pending research question
 * `expand-effect-mapping-so-every-law-changes-the-world`: an enacted bill on
 * an unmapped question is federal law (law-in-force.ts) but changes nothing
 * else in the world yet.
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
 *   signs on from the same recorded principles.
 */
export const CONGRESS_LAWMAKING_PROFILE = {
  id: "ocd-congress-lawmaking/v1",
  intakeDayOfMonth: 1,
  filingThreshold: 3,
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
    if (!proposition) continue;
    const issue = catalog.issues[proposition.issueId];
    if (
      !issue?.stableKey.startsWith(FEDERAL_ISSUE_PREFIX) ||
      !mayAnswerQuestion(
        world,
        NATIONAL_ELECTION_JURISDICTION.id,
        propositionId,
      )
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

const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "of",
  "the",
  "for",
  "in",
  "on",
  "or",
  "to",
]);
function titleCase(name: string): string {
  return name
    .split(" ")
    .map((word, index) =>
      index > 0 && SMALL_WORDS.has(word)
        ? word
        : `${word.charAt(0).toUpperCase()}${word.slice(1)}`,
    )
    .join(" ");
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
 * The bill a member's principles move them to file: the question they lean
 * on hardest, past the filing threshold, that this House may start a bill on,
 * where federal law does not already say what they want and no federal bill
 * on it is moving. Support files a bill to enact unless the law already says
 * yes; opposition files only a repeal of a law that says yes. A mapped
 * question that just reached a final result waits out its cooldown. Null when
 * nothing moves them.
 */
function memberBillChoice(
  world: World,
  personId: EntityId,
  chamberKey: "house" | "senate",
  questions: readonly FederalQuestion[],
  lawAnswers: Map<EntityId, "yes" | "no" | null | "closed">,
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
        statuteAnswer(
          lawInForce(
            world,
            NATIONAL_ELECTION_JURISDICTION.id,
            question.propositionId,
          ),
        ),
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
    if (!answer || lawAnswer === "closed") continue;
    if (!pending.has(question.propositionId))
      pending.set(
        question.propositionId,
        pendingFederalBillOn(world, question.propositionId),
      );
    if (pending.get(question.propositionId)) continue;
    // The cooldown guards the mapped path only: an unmapped answer has no
    // operative configuration to thrash, so it is never held back.
    const proposition =
      world.policyCatalog.propositions[question.propositionId];
    if (
      proposition &&
      automaticLawMappingFor(proposition.stableKey, answer, "federal")
    ) {
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
    }
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
  const members = seated.body.members.filter((member) => member.personId);
  const caucus = agendaCaucus(members);
  const lawAnswers = new Map<EntityId, "yes" | "no" | null | "closed">();
  const pending = new Map<EntityId, boolean>();
  const coolingDown = new Map<EntityId, boolean>();
  const proposals = caucus.flatMap((candidate) => {
    if (candidate.personId === player) return [];
    const proposal = memberBillChoice(
      next,
      candidate.personId!,
      input.chamberKey,
      questions,
      lawAnswers,
      pending,
      coolingDown,
    );
    return proposal
      ? [{ sponsor: candidate, proposal, pressure: proposal.weight }]
      : [];
  });
  const selected = majorityAgendaChoice(
    members,
    caucus,
    proposals,
    (member, proposal) => {
      if (member.personId === player) return false;
      const score = principledLeaning(
        next,
        member.personId!,
        proposal.question.propositionId,
      ).score;
      return (proposal.answer === "yes" ? score : -score) > 0;
    },
  );
  if (!selected) return next;
  const sponsor = selected.sponsor;
  const choice = selected.proposal;

  const { question, answer } = choice;
  const proposition = next.policyCatalog.propositions[question.propositionId]!;
  const stableKey = `${CONGRESS_LAWMAKING_VERSION}:${question.issueKey}${intakeSuffix}`;
  next = ensureNationalElectionJurisdiction(next);
  const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
  const year = world.currentDate.slice(0, 4);
  const numbering = nextMeasureNumbering(next, {
    jurisdictionId,
    originChamber: chamber,
    rulePackId: US_CONGRESS_PACK_ID,
  });
  const designation = numbering.designation;
  let measure: LegislativeMeasureRecord | undefined;
  if (automaticLawMappingFor(proposition.stableKey, answer, "federal")) {
    const introduced = introduceAutomaticLawMeasure(next, {
      jurisdictionId,
      governmentLevel: "federal",
      propositionId: question.propositionId,
      answer,
      intakeKey: stableKey,
      stableKey,
      designation,
      numberingSession: numbering.numberingSession,
      sponsorPersonId: sponsor.personId!,
      originChamberKey: input.chamberKey,
      principleRecordIds: choice.principleRecordIds,
      principleScore: choice.principleScore,
    });
    if (!introduced) return world;
    next = introduced.world;
    measure = (next.history.legislativeMeasures ?? []).find(
      (candidate) => candidate.id === introduced.measureId,
    );
  } else {
    next = introduceMeasure(next, {
      stableKey,
      jurisdictionId,
      rulePackId: US_CONGRESS_PACK_ID,
      ...numbering,
      shortTitle:
        answer === "yes"
          ? `${titleCase(proposition.name)} Act of ${year}`
          : `${titleCase(proposition.name)} Repeal Act of ${year}`,
      summary:
        answer === "yes"
          ? `${proposition.question} This bill says yes.`
          : `${proposition.question} This bill repeals the law that says yes.`,
      origin: "member-introduction",
      subjectClass: subjectClassFor(question.issueKey),
      sponsorPersonId: sponsor.personId,
      originChamberKey: input.chamberKey,
      propositionIds: [question.propositionId],
      propositionAnswers: [{ propositionId: question.propositionId, answer }],
    });
    measure = next.history.legislativeMeasures!.at(-1);
  }
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
    return true;
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

/**
 * A Congress bill on the President's desk. A non-player President decides it
 * on the day it arrives. A player President receives the existing bound
 * governing matter. With no President recorded, the bill remains pending.
 */
export function presidentDesk(
  world: World,
  measure: LegislativeMeasureRecord,
): World {
  if (measurePosition(world, measure.id).phase !== "awaiting-executive")
    return world;
  const president = currentPresidentOf(world);
  if (!president) return world;
  if (president.personId === controlledPersonId(world))
    return openPresidentBillMatter(world, measure);
  const principled = ensureOfficeholderPrinciples(world, [president.personId]);
  const evaluation = evaluateGovernorBill(principled, {
    stableKey: `${measure.stableKey}:president-desk`,
    governorId: president.personId,
    executiveTitle: "President",
    measure,
    staff: null,
  });
  const traced = recordDurableDecisionTrace(principled, evaluation);
  if (
    evaluation.selectedOptionKey !== BILL_SIGN &&
    evaluation.selectedOptionKey !== BILL_RETURN
  )
    return traced;
  const action =
    evaluation.selectedOptionKey === BILL_SIGN ? "signed" : "vetoed";
  const rationale = evaluation.context.considerations
    .filter((reason) => reason.optionKey === evaluation.selectedOptionKey)
    .map((reason) => reason.explanation)
    .join(" ");
  return scheduleInstitutionStep(
    recordGovernorDecisionOnMeasure(
      traced,
      measure.id,
      action,
      rationale,
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
  if (hasStableKey(world.history.futureDueItems, stableKey)) return world;
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
