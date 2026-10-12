/** KEEP issue judgment with complete standings, last-vote, belief chronology and eligible-age closure. Office/residence and vitality are separately owned upstream dated receipts. */
import type {
  EntityId,
  IsoDate,
  World,
  LegislativeMeasureRecord,
  LegislativeVotePurpose,
  PoliticalSalience,
  PrivateBeliefRecord,
} from "../../simulation/types";
import type { VoteBundlePart } from "../../simulation/vote-bundle";
import type { governingOfficeForPerson } from "../../simulation/governing/state-governing";
import { ageOnDate } from "../offices/calendar";
import { sectionsBefore, type BillAnswerFacts } from "./bill-answers";
export interface IssueFacts extends BillAnswerFacts {
  readonly onDate: IsoDate;
  readonly people: World["people"];
  readonly personOrder: World["personOrder"];
  readonly jurisdictions: World["jurisdictions"];
  readonly legislativeVotes: NonNullable<World["history"]["legislativeVotes"]>;
  readonly executiveDispositions: NonNullable<
    World["history"]["executiveDispositions"]
  >;
  readonly privateBeliefs: World["history"]["privateBeliefs"];
  readonly offices: ReadonlyMap<
    EntityId,
    ReturnType<typeof governingOfficeForPerson>
  >;
  readonly stateKeys: ReadonlyMap<EntityId, string | null>;
  readonly alive: ReadonlyMap<string, boolean>;
  readonly stateResidence: ReadonlyMap<string, IsoDate | null>;
  readonly homeResidence: ReadonlyMap<string, IsoDate | null>;
}
// stopgapId: "laws.issue-record-magnitudes"
export const UNRESEARCHED_ISSUE_RECORD = {
  version: "issue-record-unresearched-v1",
  provenance: "unresearched-blanket-rule",
  salienceWeight: {
    low: 1,
    moderate: 2,
    high: 3,
    central: 4,
  } satisfies Record<PoliticalSalience, number>,
  weightPerNetAgreement: 150,
  maxAbsoluteWeight: 150,
  votingAge: 18,
} as const;

export type PropositionAnswer = "yes" | "no";

export type IssueRecordAct = "voted-yea" | "voted-nay" | "signed" | "vetoed";

export interface IssueRecordEntry {
  readonly propositionId: EntityId;
  readonly measureId: EntityId;
  readonly designation: string;
  readonly act: IssueRecordAct;
  readonly at: IsoDate;
  readonly stance: "for" | "against";
}

export interface IssueStanding {
  readonly propositionId: EntityId;
  readonly entries: readonly IssueRecordEntry[];
  readonly stance: "for" | "against" | "mixed";
}

export interface IssueVerdict {
  readonly propositionId: EntityId;
  readonly stance: "for" | "against" | "mixed";
  readonly agreeing: number;
  readonly agreeingWeight: number;
  readonly disagreeing: number;
  readonly disagreeingWeight: number;
}

export interface IssueRecordJudgment {
  readonly jurisdictionId: EntityId;
  readonly asOf: IsoDate;
  readonly eligibleVoters: number;
  readonly issues: readonly IssueVerdict[];
  readonly weight: number;
}

const BILL_VOTE_PURPOSES: ReadonlySet<LegislativeVotePurpose> = new Set([
  "committee-report",
  "floor-stage",
  "concurrence",
  "veto-override",
]);

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
  facts: IssueFacts,
  measure: LegislativeMeasureRecord,
  sequence: number,
  act: IssueRecordAct,
  at: IsoDate,
): readonly IssueRecordEntry[] {
  const backed = act === "voted-yea" || act === "signed";
  const seen = new Set<string>();
  const entries: IssueRecordEntry[] = [];
  for (const part of billPartsBefore(facts, measure.id, sequence)) {
    if (!part.answers) continue;
    const { propositionId, answer } = part.answers;
    if (
      part.source === "filed-question" &&
      !(measure.propositionIds ?? []).includes(propositionId)
    )
      continue;
    const stance = stanceFor(answer, backed);
    const key = `${propositionId}:${stance}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      propositionId,
      measureId: measure.id,
      designation: measure.designation,
      act,
      at,
      stance,
    });
  }
  return entries;
}

export function issueRecordFor(
  facts: IssueFacts,
  personId: EntityId,
  asOf: IsoDate = facts.onDate,
): readonly IssueRecordEntry[] {
  const lastVote = new Map<
    EntityId,
    {
      readonly at: IsoDate;
      readonly yea: boolean;
      readonly sequence: number;
    }
  >();
  for (const vote of facts.legislativeVotes ?? []) {
    if (vote.takenAt > asOf || !BILL_VOTE_PURPOSES.has(vote.purpose)) continue;
    const mine = vote.dispositions.find((row) => row.personId === personId);
    if (!mine || (mine.disposition !== "yea" && mine.disposition !== "nay"))
      continue;
    const previous = lastVote.get(vote.measureId);
    if (previous && previous.at > vote.takenAt) continue;
    lastVote.set(vote.measureId, {
      at: vote.takenAt,
      yea: mine.disposition === "yea",
      sequence: vote.sequence,
    });
  }
  const entries: IssueRecordEntry[] = [];
  for (const [measureId, vote] of lastVote) {
    const measure = facts.measures.find((row) => row.id === measureId);
    if (!measure) continue;
    entries.push(
      ...entriesForMeasure(
        facts,
        measure,
        vote.sequence,
        vote.yea ? "voted-yea" : "voted-nay",
        vote.at,
      ),
    );
  }
  for (const action of facts.executiveDispositions ?? []) {
    if (action.actedAt > asOf) continue;
    if (action.action !== "signed" && action.action !== "vetoed") continue;
    const measure = facts.measures.find((row) => row.id === action.measureId);
    if (
      !measure ||
      !heldExecutiveOffice(facts, personId, measure, action.actedAt)
    )
      continue;
    entries.push(
      ...entriesForMeasure(
        facts,
        measure,
        action.sequence,
        action.action,
        action.actedAt,
      ),
    );
  }
  return entries.sort(
    (a, b) =>
      a.at.localeCompare(b.at) ||
      a.measureId.localeCompare(b.measureId) ||
      a.propositionId.localeCompare(b.propositionId),
  );
}

// stopgapId: "laws.former-executive-record-gap"
function heldExecutiveOffice(
  facts: IssueFacts,
  personId: EntityId,
  measure: LegislativeMeasureRecord,
  actedAt: IsoDate,
): boolean {
  const office = facts.offices.get(personId) ?? null;
  return (
    office !== null &&
    office.jurisdictionId === measure.jurisdictionId &&
    office.termStartedAt !== null &&
    office.termStartedAt <= actedAt
  );
}

export function issueStandingsFor(
  facts: IssueFacts,
  personId: EntityId,
  asOf: IsoDate = facts.onDate,
): readonly IssueStanding[] {
  const byQuestion = new Map<EntityId, IssueRecordEntry[]>();
  for (const entry of issueRecordFor(facts, personId, asOf)) {
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

export function heldBeliefOn(
  facts: IssueFacts,
  personId: EntityId,
  propositionId: EntityId,
  asOf: IsoDate,
): PrivateBeliefRecord | null {
  let latest: PrivateBeliefRecord | null = null;
  for (const belief of facts.privateBeliefs) {
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

// stopgapId: "laws.issue-voter-qualification-gap"
export function isEligibleVoterIn(
  facts: IssueFacts,
  personId: EntityId,
  jurisdictionId: EntityId,
  asOf: IsoDate,
): boolean {
  const person = facts.people[personId];
  if (!person) return false;
  if (ageOnDate(person.birthDate, asOf) < UNRESEARCHED_ISSUE_RECORD.votingAge)
    return false;
  if (!facts.alive.get(JSON.stringify([personId, asOf]))) return false;
  return residesForVoting(facts, personId, jurisdictionId, asOf);
}

export function residesForVoting(
  facts: IssueFacts,
  personId: EntityId,
  jurisdictionId: EntityId,
  asOf: IsoDate,
): boolean {
  const jurisdiction = facts.jurisdictions[jurisdictionId];
  if (!jurisdiction) return false;
  const stateKey = facts.stateKeys.get(jurisdictionId) ?? null;
  return (
    (stateKey
      ? (facts.stateResidence.get(JSON.stringify([personId, stateKey, asOf])) ??
        null)
      : (facts.homeResidence.get(
          JSON.stringify([personId, jurisdictionId, asOf]),
        ) ?? null)) !== null
  );
}

export function judgeIssueRecord(
  facts: IssueFacts,
  personId: EntityId,
  jurisdictionId: EntityId,
  asOf: IsoDate = facts.onDate,
): IssueRecordJudgment | null {
  const standings = issueStandingsFor(facts, personId, asOf);
  if (standings.length === 0) return null;
  const voters = facts.personOrder.filter(
    (voterId) =>
      voterId !== personId &&
      isEligibleVoterIn(facts, voterId, jurisdictionId, asOf),
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
          facts,
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
export function billPartsBefore(
  facts: IssueFacts,
  measureId: EntityId,
  sequence: number,
): readonly VoteBundlePart[] {
  const measure = facts.measures.find((row) => row.id === measureId);
  if (!measure) return [];
  const filed: VoteBundlePart[] = (measure.propositionAnswers ?? []).map(
    (row) => ({
      source: "filed-question",
      provisionId: null,
      provisionKey: null,
      heading: null,
      answers: { propositionId: row.propositionId, answer: row.answer },
    }),
  );
  const sections: VoteBundlePart[] = sectionsBefore(
    facts,
    measureId,
    sequence,
  ).map((record) => ({
    source: "section",
    provisionId: record.id,
    provisionKey: record.provisionKey,
    heading: record.heading,
    answers: record.answers ?? null,
  }));
  return [...filed, ...sections];
}
