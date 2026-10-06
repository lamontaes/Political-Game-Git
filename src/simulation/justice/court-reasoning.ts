import { livesInJuryCatchment } from "./jury-catchment";
import { ageOnDate } from "../dates";
import { evaluateDecision } from "../decisions";
import { lawInForce } from "../governing/law-in-force";
import { officesHeldBy } from "../governing/office-consequence";
import {
  ensureOfficeholderPrinciples,
  principledLeaning,
} from "../governing/officeholder-principles";
import { seatHolderAt, seatsForCourt } from "../judiciary/courts";
import { courtFor } from "../judiciary/court-for";
import {
  currentLifeCutoff,
  householdMembershipsAt,
  kinshipRelationshipsAt,
} from "../life-queries";
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
import { custodyFloorAt } from "../law-consequences/legal-outcome";
import type { SentencingApplicability } from "./sentencing-applicability";

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
export const PRETRIAL_RELEASE = "court:release-before-trial" as const;
export const PRETRIAL_HOLD = "court:hold-before-trial" as const;

/** Offenses with violence against a person. */
const VIOLENT_OFFENSES = new Set(["crime:assault", "crime:robbery"]);
/** Offenses that abuse a public office or a campaign's trust. */
const PUBLIC_TRUST_OFFENSES = new Set([
  "campaign-funds-personal-use",
  "honest-services-contract-steering",
  "public-bribery",
  "public-kickback",
  "protected-job-patronage",
  "public-funds-embezzlement",
  "theft-of-public-money",
  "extortion-under-color-of-official-right",
  "unreported-official-gift",
]);

/** The case as every decider in it sees it. */
export interface CourtCase {
  readonly sentencingApplicability?: SentencingApplicability;
  readonly caseKey: string;
  readonly defendantId: EntityId;
  readonly offenseKey: string;
  readonly offenseLabel: string;
  readonly evidence: EvidenceStrength;
  readonly standingFindings: number;
  /** The case's saved venue, independent of the defendant's residence. */
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
 * Who may sit: living adults of the estimated county catchment, and none who
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
    if (
      !courtCase.venueJurisdictionId ||
      !livesInJuryCatchment(
        person.homeJurisdictionId,
        courtCase.venueJurisdictionId,
      )
    )
      continue;
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
/**
 * ESTIMATED FROM AVERAGE: the most common legal size of a felony jury. Twelve
 * is the federal rule (Fed. R. Crim. P. 23(b)) and the rule in most states;
 * the Constitution allows as few as six (Williams v. Florida, 399 U.S. 78
 * (1970)) and forbids five (Ballew v. Georgia, 435 U.S. 223 (1978)), and a
 * few states seat six or eight for some offenses. Each state's own size is
 * not read yet, so every place starts from the common rule.
 */
export const JURY_PANEL_ESTIMATE = {
  size: 12,
  provenance: "estimated-from-average",
  estimated: true,
  estimatedFrom:
    "Fed. R. Crim. P. 23(b) and the common state felony rule of twelve; floor of six from Williams v. Florida, 399 U.S. 78 (1970) and Ballew v. Georgia, 435 U.S. 223 (1978)",
} as const;

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
  while (drawn.length < JURY_PANEL_ESTIMATE.size && remaining.length > 0)
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
  if (!courtCase.venueJurisdictionId) return null;
  const court = courtFor(
    world,
    courtCase.venueJurisdictionId,
    "local-general-trial",
    "criminal",
  );
  if (!court) return null;
  const judges: EntityId[] = [];
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

const MANDATORY_MINIMUM_QUESTION =
  "justice-public-safety.mandatory-minimum-sentences";

/**
 * Why the law in force where the case is tried takes probation off the table,
 * or null when it leaves the sentence to the judge. The question asks whether
 * the law sets "minimum sentences that a judge may not go below", and the
 * real laws that do so reach violent offenses and people sentenced before:
 * Florida's 10-20-Life (Fla. Stat. § 775.087), Georgia's "seven deadly sins"
 * (O.C.G.A. § 17-10-6.1), California's three strikes (Penal Code § 667) and
 * Washington's persistent offender law (RCW 9.94A.570). So a law answering
 * yes binds those cases and leaves every other case to the judge. The term's
 * length stays the court's usual one until each state's minimums are read.
 */
export function mandatoryJailUnderLaw(
  world: World,
  courtCase: CourtCase,
  floor: ReturnType<typeof custodyFloorAt> = custodyFloorAt(world, courtCase),
): string | null {
  if (floor)
    return floor.months > 0
      ? `The law requires at least ${floor.months} months in custody for this offense.`
      : null;
  if (!courtCase.venueJurisdictionId) return null;
  const violent = VIOLENT_OFFENSES.has(courtCase.offenseKey);
  const repeat = sentencesOf(world, courtCase.defendantId).length > 0;
  if (!violent && !repeat) return null;
  const propositionId = propositionIdByKey(world, MANDATORY_MINIMUM_QUESTION);
  if (!propositionId) return null;
  const law = lawInForce(world, courtCase.venueJurisdictionId, propositionId);
  if (law?.answer !== "yes") return null;
  return violent
    ? "The law here sets a jail term for a violent offense that a judge may not go below."
    : "The law here sets a jail term for someone sentenced before that a judge may not go below.";
}

/** The judge's own view of fixed minimum sentences, when they hold one. */
export function judgePrincipleConsideration(
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

// ---------------------------------------------------------------------------
// The judge, before trial, where the law allows no money bail.

/**
 * Where release before trial is decided without money bail, a judge may
 * still hold a defendant, but only one charged with a violent offense, and
 * the law presumes release. Illinois' Pretrial Fairness Act is the enacted
 * example: "All persons charged with an offense shall be eligible for pretrial
 * release before conviction" (725 ILCS 5/110-2(a)), and detention is open only
 * for listed offenses, forcible felonies among them (725 ILCS 5/110-6.1(a)).
 * New Jersey's Criminal Justice Reform Act works the same way (N.J.S.A.
 * 2A:162-15 to -26). Pure; the judge's principles must already be drawn.
 */
export function evaluateDetention(
  world: World,
  judgeId: EntityId,
  courtCase: CourtCase,
): DecisionEvaluation {
  const key = `${courtCase.caseKey}:before-trial`;
  const violent = VIOLENT_OFFENSES.has(courtCase.offenseKey);
  const earlier = sentencesOf(world, courtCase.defendantId).length;
  const considerations: DecisionConsideration[] = [
    {
      stableKey: `${key}:presumption`,
      optionKey: PRETRIAL_RELEASE,
      sourceType: "context:pretrial-law",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation: "The law presumes release before trial.",
      sourceRefs: [],
    },
  ];
  if (violent)
    considerations.push({
      stableKey: `${key}:violent`,
      optionKey: PRETRIAL_HOLD,
      sourceType: "context:offense",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: "The charge is a violent offense.",
      sourceRefs: [],
    });
  if (earlier > 0)
    considerations.push({
      stableKey: `${key}:earlier-sentence`,
      optionKey: PRETRIAL_HOLD,
      sourceType: "context:criminal-record",
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation: "They had been sentenced before.",
      sourceRefs: [],
    });
  if (courtCase.standingFindings >= 2)
    considerations.push({
      stableKey: `${key}:findings`,
      optionKey: PRETRIAL_HOLD,
      sourceType: "context:criminal-record",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: "They had been found at fault for the same thing before.",
      sourceRefs: [],
    });
  return evaluateDecision(world, {
    stableKey: key,
    decisionType: "justice.pretrial-detention",
    actorPersonId: judgeId,
    cutoff: currentLifeCutoff(world),
    subject: {
      kind: "context:criminal-case",
      key: courtCase.caseKey,
      entityId: null,
    },
    options: [
      {
        key: PRETRIAL_RELEASE,
        label: "Release",
        description: "Let them go home until the case is heard.",
      },
      {
        key: PRETRIAL_HOLD,
        label: "Hold",
        description: "Hold them in jail until the case is heard.",
      },
    ],
    constraints: violent
      ? []
      : [
          {
            stableKey: `${key}:not-detainable`,
            optionKey: PRETRIAL_HOLD,
            kind: "law:pretrial-detention",
            explanation:
              "The law allows holding someone before trial only for a violent offense.",
            sourceRefs: [],
          },
        ],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
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
  floor: ReturnType<typeof custodyFloorAt> = custodyFloorAt(world, courtCase),
): DecisionEvaluation {
  const key = `${courtCase.caseKey}:sentence`;
  const bound = mandatoryJailUnderLaw(world, courtCase, floor);
  return evaluateDecision(world, {
    stableKey: key,
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
    constraints: bound
      ? [
          {
            stableKey: `${key}:mandatory-minimum`,
            optionKey: SENTENCE_SUPERVISION,
            kind: "law:mandatory-minimum",
            explanation: bound,
            sourceRefs: [],
          },
        ]
      : [],
    considerations: [
      ...sentencingConsiderations(world, judgeId, courtCase, pleaded),
      ...(bound
        ? [
            {
              stableKey: `${key}:mandatory-minimum-law`,
              optionKey: SENTENCE_JAIL,
              sourceType: "context:sentencing-law" as const,
              direction: "supports" as const,
              importance: "decisive" as const,
              confidence: "high" as const,
              explanation: bound,
              sourceRefs: [],
            },
          ]
        : []),
    ],
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
