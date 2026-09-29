import { ageOnDate } from "../dates";
import { evaluateDecision } from "../decisions";
import { officesHeldBy } from "../governing/office-consequence";
import {
  ensureOfficeholderPrinciples,
  principledLeaning,
} from "../governing/officeholder-principles";
import {
  courtsForJurisdiction,
  seatHolderAt,
  seatsForCourt,
} from "../judiciary/courts";
import {
  currentLifeCutoff,
  householdMembershipsAt,
  kinshipRelationshipsAt,
} from "../life-queries";
import { chiefExecutiveJurisdiction } from "../nationwide-world/government-jurisdiction";
import { ensurePeopleTraits } from "../people-traits";
import { deriveRelationshipSummary } from "../queries";
import { SeededRng } from "../rng";
import { registeredTraitConsiderations } from "../trait-readings";
import { traitRegistryFor } from "../trait-registry";
import type {
  DecisionConsideration,
  DecisionEvaluation,
  EntityId,
  World,
} from "../types";
import { isPersonAliveAt } from "../vitality";
import { JURY_VOTE_DECISION, PLEA_DECISION } from "./court-decisions";
import { sentencesOf } from "./jail-terms";

/**
 * How the people in a criminal case decide, through the shared decision
 * engine. lamontae, 2026-09-29 (Rule 0 of the overnight orders): no case goes
 * a way because a seeded number fell under a chance. The defendant chooses
 * between the plea and a trial, each juror votes, and the judge chooses the
 * sentence, each from their own traits, principles and the case in front of
 * them. The real rates of pleas, convictions and jail terms are checks on the
 * totals, never the mechanism.
 *
 * The engine's close-choice randomness is off ("none") throughout. An exact
 * tie falls to the first option key, and the keys are chosen so that it falls
 * the way the law leans: to the plea on offer, to acquittal, and to the lesser
 * sentence.
 */

export type EvidenceStrength = "documentary" | "testimony" | "circumstantial";

export const PLEA = "plead" as const;
export const TRIAL = "trial" as const;
export const ACQUIT = "acquit" as const;
export const CONVICT = "convict" as const;
/** Probation. Sorts before jail, so a tied judge gives the lesser sentence. */
export const SENTENCE_SUPERVISION = "court:community-supervision" as const;
export const SENTENCE_JAIL = "court:jail" as const;

/** Offenses with violence against a person. */
const VIOLENT_OFFENSES = new Set(["crime:assault", "crime:robbery"]);
/** Offenses that abuse a public office or a campaign's trust. */
const PUBLIC_TRUST_OFFENSES = new Set(["campaign-funds-personal-use"]);

/** The case as every decider in it sees it. */
export interface CourtCase {
  readonly caseKey: string;
  readonly defendantId: EntityId;
  readonly offenseKey: string;
  readonly offenseLabel: string;
  readonly evidence: EvidenceStrength;
  readonly standingFindings: number;
  /** The place the case is tried: the defendant's home when it was referred. */
  readonly venueJurisdictionId: EntityId | null;
  /** The state whose courts hear the case, as "US-XX". */
  readonly stateKey: string | null;
}

// ---------------------------------------------------------------------------
// The defendant: plead or go to trial.

function evidenceForPlea(
  key: string,
  evidence: EvidenceStrength,
): DecisionConsideration {
  switch (evidence) {
    case "documentary":
      return {
        stableKey: `${key}:evidence`,
        optionKey: PLEA,
        sourceType: "context:evidence",
        direction: "supports",
        importance: "strong",
        confidence: "high",
        explanation: "The records show what they did.",
        sourceRefs: [],
      };
    case "testimony":
      return {
        stableKey: `${key}:evidence`,
        optionKey: PLEA,
        sourceType: "context:evidence",
        direction: "supports",
        importance: "slight",
        confidence: "medium",
        explanation: "A witness will say what they did.",
        sourceRefs: [],
      };
    case "circumstantial":
      return {
        stableKey: `${key}:evidence`,
        optionKey: TRIAL,
        sourceType: "context:evidence",
        direction: "supports",
        importance: "moderate",
        confidence: "medium",
        explanation: "The case against them rests on inference.",
        sourceRefs: [],
      };
  }
}

/** The considerations a defendant brings to the plea. */
export function pleaConsiderations(
  world: World,
  courtCase: CourtCase,
): readonly DecisionConsideration[] {
  const key = `${courtCase.caseKey}:plea`;
  const out: DecisionConsideration[] = [
    evidenceForPlea(key, courtCase.evidence),
    {
      // U.S.S.G. § 3E1.1 and state practice: a plea that accepts
      // responsibility earns a lighter sentence. The judge weighs the same
      // fact below, so the defendant's expectation is the court's own rule.
      stableKey: `${key}:lighter-sentence`,
      optionKey: PLEA,
      sourceType: "context:plea-offer",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: "A guilty plea brings a lighter sentence.",
      sourceRefs: [],
    },
  ];
  if (officesHeldBy(world, courtCase.defendantId).length > 0)
    out.push({
      stableKey: `${key}:public-life`,
      optionKey: TRIAL,
      sourceType: "context:office",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation: "Pleading guilty would end their career in public life.",
      sourceRefs: [],
    });
  out.push(
    ...registeredTraitConsiderations(
      world,
      traitRegistryFor(world),
      courtCase.defendantId,
      key,
      PLEA_DECISION.id,
    ),
  );
  return out;
}

/** The defendant's choice. Traits must already be drawn. Pure. */
export function evaluatePlea(
  world: World,
  courtCase: CourtCase,
): DecisionEvaluation {
  return evaluateDecision(world, {
    stableKey: `${courtCase.caseKey}:plea`,
    decisionType: "justice.plea",
    actorPersonId: courtCase.defendantId,
    cutoff: currentLifeCutoff(world),
    subject: {
      kind: "context:criminal-case",
      key: courtCase.caseKey,
      entityId: null,
    },
    options: [
      {
        key: PLEA,
        label: "Plead guilty",
        description: `Plead guilty to ${courtCase.offenseLabel}.`,
      },
      {
        key: TRIAL,
        label: "Go to trial",
        description: "Plead not guilty and let a jury decide.",
      },
    ],
    constraints: [],
    considerations: pleaConsiderations(world, courtCase),
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
}

// ---------------------------------------------------------------------------
// The jury.

/**
 * Who may sit: living adults of the place the case is tried, and none who
 * know the defendant. Voir dire excuses the defendant's family, household and
 * anyone who has dealt with them, so no juror is somebody the record shows
 * they know.
 */
export function juryPool(world: World, courtCase: CourtCase): EntityId[] {
  const excused = new Set<EntityId>([courtCase.defendantId]);
  for (const kin of kinshipRelationshipsAt(world, courtCase.defendantId))
    for (const id of kin.personIds) excused.add(id);
  const homes = new Set(
    householdMembershipsAt(world, courtCase.defendantId).map(
      (entry) => entry.household.id,
    ),
  );
  for (const record of world.history.householdMemberships)
    if (homes.has(record.householdId)) excused.add(record.personId);
  const pool: EntityId[] = [];
  const cutoff = currentLifeCutoff(world);
  for (const person of Object.values(world.people)) {
    if (person.homeJurisdictionId !== courtCase.venueJurisdictionId) continue;
    if (excused.has(person.id)) continue;
    if (world.control.kind === "person" && world.control.personId === person.id)
      continue;
    if (ageOnDate(person.birthDate, world.currentDate) < 18) continue;
    if (!isPersonAliveAt(world, person.id, cutoff)) continue;
    if (
      deriveRelationshipSummary(world, person.id, courtCase.defendantId)
        .closeness !== "none"
    )
      continue;
    pool.push(person.id);
  }
  return pool.sort();
}

/**
 * The twelve who hear the case, drawn from the pool at random. This is the one
 * draw here, and the law prescribes it: jurors are "selected at random from a
 * fair cross section of the community" (28 U.S.C. § 1861), and every state's
 * jury statute draws its panels by lot. The draw picks who sits; it decides
 * nothing any of them does.
 */
export function empanelJury(
  world: World,
  courtCase: CourtCase,
  trialNumber: number,
): readonly EntityId[] {
  const pool = juryPool(world, courtCase);
  const rng = new SeededRng(
    `${world.seed}:jury-panel-v1:${courtCase.caseKey}:${trialNumber}`,
  );
  const drawn: EntityId[] = [];
  const remaining = [...pool];
  while (drawn.length < 12 && remaining.length > 0)
    drawn.push(remaining.splice(rng.integer(0, remaining.length), 1)[0]!);
  return drawn;
}

function evidenceForJuror(
  key: string,
  evidence: EvidenceStrength,
): DecisionConsideration {
  const row = {
    documentary: {
      importance: "strong",
      confidence: "high",
      explanation: "The records showed what the defendant did.",
    },
    testimony: {
      importance: "strong",
      confidence: "medium",
      explanation: "A witness testified to what the defendant did.",
    },
    circumstantial: {
      importance: "moderate",
      confidence: "medium",
      explanation: "The prosecution's case rested on inference.",
    },
  }[evidence] as Pick<
    DecisionConsideration,
    "importance" | "confidence" | "explanation"
  >;
  return {
    stableKey: `${key}:evidence`,
    optionKey: CONVICT,
    sourceType: "context:evidence",
    direction: "supports",
    ...row,
    sourceRefs: [],
  };
}

/** What the rest of the jury thinks, once a first ballot is taken. */
export interface JuryRoom {
  readonly ballot: number;
  readonly convictVotes: number;
  readonly acquitVotes: number;
}

/** The considerations one juror brings to one ballot. */
export function jurorConsiderations(
  world: World,
  courtCase: CourtCase,
  jurorId: EntityId,
  ballotKey: string,
  room: JuryRoom | null,
  ownFirstVote: typeof ACQUIT | typeof CONVICT | null,
): readonly DecisionConsideration[] {
  const out: DecisionConsideration[] = [
    evidenceForJuror(ballotKey, courtCase.evidence),
    {
      stableKey: `${ballotKey}:reasonable-doubt`,
      optionKey: ACQUIT,
      sourceType: "context:burden-of-proof",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: "The law asks for proof beyond a reasonable doubt.",
      sourceRefs: [],
    },
  ];
  if (room && ownFirstVote) {
    // The first ballot's majority usually becomes the verdict: jurors in the
    // minority come around once they hear the others (Kalven and Zeisel, The
    // American Jury, 1966). A lone holdout faces a stronger pull than one of
    // five.
    const others =
      ownFirstVote === CONVICT
        ? { same: room.convictVotes - 1, other: room.acquitVotes }
        : { same: room.acquitVotes - 1, other: room.convictVotes };
    const total = room.convictVotes + room.acquitVotes;
    if (others.other > others.same) {
      const share = others.other / Math.max(1, total - 1);
      out.push({
        stableKey: `${ballotKey}:the-room`,
        optionKey: ownFirstVote === CONVICT ? ACQUIT : CONVICT,
        sourceType: "context:jury-room",
        direction: "supports",
        importance: share >= 10 / 11 ? "strong" : "moderate",
        confidence: "high",
        explanation:
          ownFirstVote === CONVICT
            ? "Most of the jury has doubts they cannot answer."
            : "Most of the jury is convinced, and they cannot argue it away.",
        sourceRefs: [],
      });
    }
  }
  out.push(
    ...registeredTraitConsiderations(
      world,
      traitRegistryFor(world),
      jurorId,
      ballotKey,
      JURY_VOTE_DECISION.id,
    ),
  );
  return out;
}

/** One juror's vote on one ballot. Traits must already be drawn. Pure. */
export function evaluateJurorVote(
  world: World,
  courtCase: CourtCase,
  jurorId: EntityId,
  ballotKey: string,
  room: JuryRoom | null,
  ownFirstVote: typeof ACQUIT | typeof CONVICT | null,
): DecisionEvaluation {
  return evaluateDecision(world, {
    stableKey: ballotKey,
    decisionType: "justice.jury-vote",
    actorPersonId: jurorId,
    cutoff: currentLifeCutoff(world),
    subject: {
      kind: "context:criminal-case",
      key: courtCase.caseKey,
      entityId: null,
    },
    options: [
      { key: ACQUIT, label: "Not guilty", description: "Vote to acquit." },
      { key: CONVICT, label: "Guilty", description: "Vote to convict." },
    ],
    constraints: [],
    considerations: jurorConsiderations(
      world,
      courtCase,
      jurorId,
      ballotKey,
      room,
      ownFirstVote,
    ),
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
}

/** Draws the traits every juror needs before they vote. */
export function prepareJurors(
  world: World,
  jurors: readonly EntityId[],
): World {
  return ensurePeopleTraits(world, [...jurors]);
}

// ---------------------------------------------------------------------------
// The judge.

/**
 * The judge who sentences: a sitting judge of the state's general trial
 * court, in turn by seat, skipping any judge who knows the defendant (a judge
 * with a personal tie steps aside; 28 U.S.C. § 455 and each state's code of
 * judicial conduct). `turn` is how many cases that state's courts have
 * already sentenced, so the docket rotates rather than falling to one judge.
 * Null when the state's courts have no sitting judge in this world.
 */
export function sentencingJudge(
  world: World,
  courtCase: CourtCase,
  turn: number,
): EntityId | null {
  const usps = courtCase.stateKey?.slice(3) ?? null;
  const state = usps ? chiefExecutiveJurisdiction(usps) : null;
  if (!state) return null;
  const judges: EntityId[] = [];
  const courts = courtsForJurisdiction(world, state.id)
    .filter((court) => court.level === "local-general-trial")
    .sort((a, b) => a.courtId.localeCompare(b.courtId));
  for (const court of courts)
    for (const seat of seatsForCourt(world, court.courtId)) {
      const holder = seatHolderAt(world, seat.seatId);
      if (!holder || judges.includes(holder.personId)) continue;
      if (holder.personId === courtCase.defendantId) continue;
      if (
        deriveRelationshipSummary(world, holder.personId, courtCase.defendantId)
          .closeness !== "none"
      )
        continue;
      judges.push(holder.personId);
    }
  if (judges.length === 0) return null;
  return judges[turn % judges.length]!;
}

function propositionIdByKey(world: World, suffix: string): EntityId | null {
  for (const [id, proposition] of Object.entries(
    world.policyCatalog.propositions,
  ))
    if (proposition.stableKey.endsWith(suffix)) return id as EntityId;
  return null;
}

/** The judge's own view of fixed minimum sentences, when they hold one. */
function judgePrincipleConsideration(
  world: World,
  judgeId: EntityId,
  key: string,
): DecisionConsideration | null {
  const propositionId = propositionIdByKey(
    world,
    "justice-public-safety.mandatory-minimum-sentences",
  );
  if (!propositionId) return null;
  const leaning = principledLeaning(world, judgeId, propositionId);
  if (leaning.score === 0) return null;
  const size = Math.abs(leaning.score);
  return {
    stableKey: `${key}:principle:${leaning.score > 0 ? "firm" : "fitted"}`,
    optionKey: leaning.score > 0 ? SENTENCE_JAIL : SENTENCE_SUPERVISION,
    sourceType: "belief:political-principle",
    direction: "supports",
    importance: size >= 4 ? "strong" : size >= 2 ? "moderate" : "slight",
    confidence: "high",
    explanation:
      leaning.score > 0
        ? "They believe the law should set firm sentences for crimes."
        : "They believe a sentence should fit the person in front of them.",
    sourceRefs: leaning.recordIds.map((principleRecordId) => ({
      kind: "political-principle" as const,
      principleRecordId,
    })),
  };
}

/** The considerations a judge brings to one sentence. */
export function sentencingConsiderations(
  world: World,
  judgeId: EntityId,
  courtCase: CourtCase,
  pleaded: boolean,
): readonly DecisionConsideration[] {
  const key = `${courtCase.caseKey}:sentence`;
  const earlier = sentencesOf(world, courtCase.defendantId).length;
  const out: DecisionConsideration[] = [
    {
      // 18 U.S.C. § 3553(a): "sufficient, but not greater than necessary".
      stableKey: `${key}:parsimony`,
      optionKey: SENTENCE_SUPERVISION,
      sourceType: "context:sentencing-law",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "The law asks for a sentence no greater than necessary.",
      sourceRefs: [],
    },
  ];
  if (pleaded)
    out.push({
      // U.S.S.G. § 3E1.1, acceptance of responsibility.
      stableKey: `${key}:accepted-responsibility`,
      optionKey: SENTENCE_SUPERVISION,
      sourceType: "context:sentencing-law",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: "They accepted responsibility by pleading guilty.",
      sourceRefs: [],
    });
  if (earlier > 0)
    out.push({
      stableKey: `${key}:earlier-sentence`,
      optionKey: SENTENCE_JAIL,
      sourceType: "context:criminal-record",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation: "They had been sentenced before.",
      sourceRefs: [],
    });
  else if (courtCase.standingFindings <= 1)
    out.push({
      stableKey: `${key}:first-offense`,
      optionKey: SENTENCE_SUPERVISION,
      sourceType: "context:criminal-record",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "It is their first offense.",
      sourceRefs: [],
    });
  if (courtCase.standingFindings >= 2)
    out.push({
      stableKey: `${key}:findings`,
      optionKey: SENTENCE_JAIL,
      sourceType: "context:criminal-record",
      direction: "supports",
      importance: courtCase.standingFindings >= 3 ? "strong" : "moderate",
      confidence: "high",
      explanation: "They had been found at fault for the same thing before.",
      sourceRefs: [],
    });
  if (VIOLENT_OFFENSES.has(courtCase.offenseKey))
    out.push({
      stableKey: `${key}:violent`,
      optionKey: SENTENCE_JAIL,
      sourceType: "context:offense",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation: "The offense was violent.",
      sourceRefs: [],
    });
  if (PUBLIC_TRUST_OFFENSES.has(courtCase.offenseKey))
    out.push({
      // U.S.S.G. § 3B1.3, abuse of a position of trust.
      stableKey: `${key}:public-trust`,
      optionKey: SENTENCE_JAIL,
      sourceType: "context:sentencing-law",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: "They abused a position of public trust.",
      sourceRefs: [],
    });
  const principle = judgePrincipleConsideration(world, judgeId, key);
  if (principle) out.push(principle);
  return out;
}

/** Draws the judge's principles if they hold none yet. */
export function prepareJudge(world: World, judgeId: EntityId): World {
  return ensureOfficeholderPrinciples(world, [judgeId]);
}

/** The judge's sentence. Principles must already be drawn. Pure. */
export function evaluateSentence(
  world: World,
  judgeId: EntityId,
  courtCase: CourtCase,
  pleaded: boolean,
): DecisionEvaluation {
  return evaluateDecision(world, {
    stableKey: `${courtCase.caseKey}:sentence`,
    decisionType: "justice.sentence",
    actorPersonId: judgeId,
    cutoff: currentLifeCutoff(world),
    subject: {
      kind: "context:criminal-case",
      key: courtCase.caseKey,
      entityId: null,
    },
    options: [
      {
        key: SENTENCE_SUPERVISION,
        label: "Probation",
        description: "Sentence them to probation.",
      },
      {
        key: SENTENCE_JAIL,
        label: "Jail",
        description: "Sentence them to a term in jail.",
      },
    ],
    constraints: [],
    considerations: sentencingConsiderations(
      world,
      judgeId,
      courtCase,
      pleaded,
    ),
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
}

/** The explanations behind the option a decider chose, in plain words. */
export function chosenReasons(evaluation: DecisionEvaluation): string {
  const chosen = evaluation.selectedOptionKey;
  return evaluation.context.considerations
    .filter((row) => row.optionKey === chosen && row.direction === "supports")
    .map((row) => row.explanation)
    .join(" ");
}
