import { ageOnDate } from "./dates";
import { governingOfficeForPerson } from "./governing/state-governing";
import { stateKeyForJurisdiction } from "./life-places";
import { measureById } from "./legislation";
import {
  homeJurisdictionResidenceSince,
  stateResidenceSince,
} from "./nationwide-world/residence-duration";
import { isPersonAliveAt } from "./vitality-integrity";
import type {
  EntityId,
  IsoDate,
  LegislativeMeasureRecord,
  LegislativeVotePurpose,
  PoliticalSalience,
  PrivateBeliefRecord,
  World,
} from "./types";

/**
 * Voters weighing what an officeholder actually did, one policy question at a
 * time.
 *
 * lamontae, 2026-09-22 4:22 p.m. ET: voters weigh an officeholder's actual
 * votes and actions issue by issue, and support is won or lost on that record.
 * `record-in-office.ts` already judges a governor on the economy; this judges
 * anyone on the questions they voted on.
 *
 * Three recorded things have to meet before anybody's support moves, and each
 * is honest about being missing:
 *
 * 1. A recorded act by the officeholder: a yea or nay in a roll call
 *    (`LegislativeVoteRecord`, where the member is a canonical person), or a
 *    governor signing or vetoing a bill during their own term.
 * 2. Which way the bill answers the question. A measure's `propositionIds`
 *    say only what it is ABOUT; `propositionAnswers` says whether enacting it
 *    does what the question proposes. A bill that does not say is unknown, and
 *    an unknown direction moves nobody: a yea on it is not a yes to anything.
 * 3. A voter's own view on that question (`PrivateBeliefRecord`), held on the
 *    date being judged. Somebody with no view, or an uncertain or conflicted
 *    one, is not moved by the record either way, but still counts in the
 *    electorate: most of a real electorate has no view on most bills.
 *
 * The magnitudes below are UNRESEARCHED blanket rules, filed with the research
 * queue as `issue-record-electoral-magnitudes`.
 */
export const UNRESEARCHED_ISSUE_RECORD = {
  version: "issue-record-unresearched-v1",
  provenance: "unresearched-blanket-rule",
  /**
   * How much each voter's view counts, by how much the question matters to
   * them. Ordered only; the ratios are not a finding.
   */
  salienceWeight: {
    low: 1,
    moderate: 2,
    high: 3,
    central: 4,
  } satisfies Record<PoliticalSalience, number>,
  /**
   * Starting weight per unit of net agreement: the salience-weighted count of
   * voters who agree minus those who disagree, over every eligible voter who
   * lives there. A whole electorate agreeing at "central" salience would be
   * 4 x this before the cap.
   */
  weightPerNetAgreement: 150,
  /** The same cap `record-in-office.ts` puts on the economy. */
  maxAbsoluteWeight: 150,
  /**
   * Adult voting age under the Twenty-Sixth Amendment. Citizenship, felony
   * disenfranchisement and registration are not modeled here; the owner's
   * ruling is that registration is automatic at 18 for anyone eligible.
   */
  votingAge: 18,
} as const;

/** Enacting the bill does what the question proposes ("yes"), or the reverse. */
export type PropositionAnswer = "yes" | "no";

export type IssueRecordAct = "voted-yea" | "voted-nay" | "signed" | "vetoed";

/** One thing an officeholder did on one question. */
export interface IssueRecordEntry {
  readonly propositionId: EntityId;
  readonly measureId: EntityId;
  readonly designation: string;
  readonly act: IssueRecordAct;
  readonly at: IsoDate;
  /** Whether the act was for or against what the question proposes. */
  readonly stance: "for" | "against";
}

/** The officeholder's net position on one question, from their acts. */
export interface IssueStanding {
  readonly propositionId: EntityId;
  readonly entries: readonly IssueRecordEntry[];
  /** "mixed" when as many acts went one way as the other. */
  readonly stance: "for" | "against" | "mixed";
}

/** How the electorate weighed one question on the record. */
export interface IssueVerdict {
  readonly propositionId: EntityId;
  readonly stance: "for" | "against" | "mixed";
  /** Voters whose view matched the record, and the salience-weighted sum. */
  readonly agreeing: number;
  readonly agreeingWeight: number;
  readonly disagreeing: number;
  readonly disagreeingWeight: number;
}

export interface IssueRecordJudgment {
  readonly jurisdictionId: EntityId;
  readonly asOf: IsoDate;
  /** Adults living in the jurisdiction on `asOf`: the denominator. */
  readonly eligibleVoters: number;
  readonly issues: readonly IssueVerdict[];
  /** Positive helps the officeholder, negative hurts them. */
  readonly weight: number;
}

/**
 * Roll calls that decide the bill itself. An amendment vote is about the
 * amendment, which says nothing about the bill's own answer.
 */
const BILL_VOTE_PURPOSES: ReadonlySet<LegislativeVotePurpose> = new Set([
  "committee-report",
  "floor-stage",
  "concurrence",
  "veto-override",
]);

/** Which way this measure answers this question, or null if it does not say. */
export function measurePropositionAnswer(
  measure: LegislativeMeasureRecord,
  propositionId: EntityId,
): PropositionAnswer | null {
  if (!(measure.propositionIds ?? []).includes(propositionId)) return null;
  return (
    (measure.propositionAnswers ?? []).find(
      (row) => row.propositionId === propositionId,
    )?.answer ?? null
  );
}

function stanceFor(
  answer: PropositionAnswer,
  backedTheBill: boolean,
): "for" | "against" {
  return (answer === "yes") === backedTheBill ? "for" : "against";
}

function entriesForMeasure(
  measure: LegislativeMeasureRecord,
  act: IssueRecordAct,
  at: IsoDate,
): readonly IssueRecordEntry[] {
  const backed = act === "voted-yea" || act === "signed";
  return (measure.propositionIds ?? []).flatMap((propositionId) => {
    const answer = measurePropositionAnswer(measure, propositionId);
    if (!answer) return [];
    return [
      {
        propositionId,
        measureId: measure.id,
        designation: measure.designation,
        act,
        at,
        stance: stanceFor(answer, backed),
      },
    ];
  });
}

/**
 * Everything on a person's record that answers a question, up to `asOf`.
 *
 * Their LAST recorded yea or nay on each bill is the one that counts, so a
 * member who backed a bill in committee and voted it down on the floor is on
 * the record against it. An executive action records an office, not a person,
 * so a governor's signature or veto is theirs only while they still hold that
 * state's executive office and acted after their term began. A former
 * governor's signatures drop off their record: a known gap, not a finding.
 */
export function issueRecordFor(
  world: World,
  personId: EntityId,
  asOf: IsoDate = world.currentDate,
): readonly IssueRecordEntry[] {
  const lastVote = new Map<
    EntityId,
    { readonly at: IsoDate; readonly yea: boolean }
  >();
  for (const vote of world.history.legislativeVotes ?? []) {
    if (vote.takenAt > asOf || !BILL_VOTE_PURPOSES.has(vote.purpose)) continue;
    const mine = vote.dispositions.find((row) => row.personId === personId);
    if (!mine || (mine.disposition !== "yea" && mine.disposition !== "nay"))
      continue;
    const previous = lastVote.get(vote.measureId);
    if (previous && previous.at > vote.takenAt) continue;
    lastVote.set(vote.measureId, {
      at: vote.takenAt,
      yea: mine.disposition === "yea",
    });
  }

  const entries: IssueRecordEntry[] = [];
  for (const [measureId, vote] of lastVote) {
    const measure = measureById(world, measureId);
    if (!measure) continue;
    entries.push(
      ...entriesForMeasure(
        measure,
        vote.yea ? "voted-yea" : "voted-nay",
        vote.at,
      ),
    );
  }

  for (const action of world.history.executiveDispositions ?? []) {
    if (action.actedAt > asOf) continue;
    if (action.action !== "signed" && action.action !== "vetoed") continue;
    const measure = measureById(world, action.measureId);
    if (
      !measure ||
      !heldExecutiveOffice(world, personId, measure, action.actedAt)
    )
      continue;
    entries.push(...entriesForMeasure(measure, action.action, action.actedAt));
  }

  return entries.sort(
    (a, b) =>
      a.at.localeCompare(b.at) ||
      a.measureId.localeCompare(b.measureId) ||
      a.propositionId.localeCompare(b.propositionId),
  );
}

function heldExecutiveOffice(
  world: World,
  personId: EntityId,
  measure: LegislativeMeasureRecord,
  actedAt: IsoDate,
): boolean {
  const office = governingOfficeForPerson(world, personId);
  return (
    office !== null &&
    office.jurisdictionId === measure.jurisdictionId &&
    office.termStartedAt !== null &&
    office.termStartedAt <= actedAt
  );
}

/** The officeholder's net position on each question they have acted on. */
export function issueStandingsFor(
  world: World,
  personId: EntityId,
  asOf: IsoDate = world.currentDate,
): readonly IssueStanding[] {
  const byQuestion = new Map<EntityId, IssueRecordEntry[]>();
  for (const entry of issueRecordFor(world, personId, asOf)) {
    const list = byQuestion.get(entry.propositionId) ?? [];
    list.push(entry);
    byQuestion.set(entry.propositionId, list);
  }
  return [...byQuestion.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([propositionId, entries]) => {
      const net = entries.reduce(
        (sum, entry) => sum + (entry.stance === "for" ? 1 : -1),
        0,
      );
      return {
        propositionId,
        entries,
        stance: net > 0 ? "for" : net < 0 ? "against" : "mixed",
      };
    });
}

/** A voter's view on a question as it stood on `asOf`, or null. */
export function heldBeliefOn(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
  asOf: IsoDate,
): PrivateBeliefRecord | null {
  let latest: PrivateBeliefRecord | null = null;
  for (const belief of world.history.privateBeliefs) {
    if (
      belief.personId !== personId ||
      belief.propositionId !== propositionId ||
      belief.formedAt > asOf
    )
      continue;
    if (
      !latest ||
      belief.formedAt > latest.formedAt ||
      (belief.formedAt === latest.formedAt && belief.sequence > latest.sequence)
    )
      latest = belief;
  }
  return latest;
}

/**
 * Whether this person could vote in a contest for this jurisdiction on this
 * date: alive, of voting age, and living there by the same records a
 * residence qualification reads.
 */
export function isEligibleVoterIn(
  world: World,
  personId: EntityId,
  jurisdictionId: EntityId,
  asOf: IsoDate,
): boolean {
  const person = world.people[personId];
  if (!person) return false;
  if (ageOnDate(person.birthDate, asOf) < UNRESEARCHED_ISSUE_RECORD.votingAge)
    return false;
  if (
    !isPersonAliveAt(world, personId, {
      asOfDate: asOf,
      historySequenceExclusive: world.history.nextSequence,
    })
  )
    return false;
  const jurisdiction = world.jurisdictions[jurisdictionId];
  if (!jurisdiction) return false;
  const stateKey = stateKeyForJurisdiction(jurisdiction);
  return (
    (stateKey
      ? stateResidenceSince(world, personId, stateKey, asOf)
      : homeJurisdictionResidenceSince(
          world,
          personId,
          jurisdictionId,
          asOf,
        )) !== null
  );
}

/**
 * How the voters of `jurisdictionId` weigh this person's record on `asOf`.
 *
 * Read-only. Null when there is nothing to weigh: no act on the record that
 * answers a question, or nobody eligible to vote there. An empty record is not
 * a neutral one being reported as zero; it is no record.
 */
export function judgeIssueRecord(
  world: World,
  personId: EntityId,
  jurisdictionId: EntityId,
  asOf: IsoDate = world.currentDate,
): IssueRecordJudgment | null {
  const standings = issueStandingsFor(world, personId, asOf);
  if (standings.length === 0) return null;

  const voters = world.personOrder.filter(
    (voterId) =>
      voterId !== personId &&
      isEligibleVoterIn(world, voterId, jurisdictionId, asOf),
  );
  if (voters.length === 0) return null;

  const rule = UNRESEARCHED_ISSUE_RECORD;
  let net = 0;
  const issues = standings.map((standing): IssueVerdict => {
    let agreeing = 0;
    let agreeingWeight = 0;
    let disagreeing = 0;
    let disagreeingWeight = 0;
    if (standing.stance !== "mixed") {
      for (const voterId of voters) {
        const belief = heldBeliefOn(
          world,
          voterId,
          standing.propositionId,
          asOf,
        );
        if (
          !belief ||
          (belief.position !== "support" && belief.position !== "oppose")
        )
          continue;
        const weight = rule.salienceWeight[belief.salience];
        const agrees =
          (belief.position === "support") === (standing.stance === "for");
        if (agrees) {
          agreeing += 1;
          agreeingWeight += weight;
        } else {
          disagreeing += 1;
          disagreeingWeight += weight;
        }
      }
    }
    net += agreeingWeight - disagreeingWeight;
    return {
      propositionId: standing.propositionId,
      stance: standing.stance,
      agreeing,
      agreeingWeight,
      disagreeing,
      disagreeingWeight,
    };
  });

  const raw = Math.round((net / voters.length) * rule.weightPerNetAgreement);
  return {
    jurisdictionId,
    asOf,
    eligibleVoters: voters.length,
    issues,
    weight: Math.max(
      -rule.maxAbsoluteWeight,
      Math.min(rule.maxAbsoluteWeight, raw),
    ),
  };
}
