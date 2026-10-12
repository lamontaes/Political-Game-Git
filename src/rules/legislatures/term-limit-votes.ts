import type {
  EntityId,
  IsoDate,
  DecisionConsideration,
} from "../../simulation/types";
import type { ConstitutionalMeasureRecord } from "../../simulation/constitutional-types";
import type { SeatedBody } from "../../simulation/legislation-scenarios";
import type { Voter } from "../../simulation/governing/article-v";
import type {
  FederalReformCause,
  TermLimitHolder,
} from "../../simulation/living-world/federal-reform";
import type { readRelationshipStanding } from "../../simulation/relationship-standing";
import { decideChamberVote, type ChamberDecisionFacts } from "./chamber-vote";
import { relationshipConsiderations } from "./relationship-reasons";
import { yearsLater, FEDERAL_REFORM_PROFILE } from "./president-reform";
import type { InstitutionCommand } from "./institution-context";
export interface TermLimitVoteFacts {
  readonly onDate: IsoDate;
  readonly playerPersonId: EntityId | null;
  readonly parties: ReadonlyMap<EntityId, string | null>;
  readonly relationships: ReadonlyMap<
    string,
    ReturnType<typeof readRelationshipStanding>
  >;
  readonly measures: readonly ConstitutionalMeasureRecord[];
  readonly bodies: ReadonlyMap<string, SeatedBody | null>;
  readonly votes: ReadonlyMap<string, ChamberDecisionFacts>;
  readonly federalJurisdictionId: EntityId;
  readonly proposalText: string;
}
export const CONSTITUTIONAL_BAR: DecisionConsideration = {
  stableKey: "member:constitutional-bar",
  optionKey: "vote-nay",
  sourceType: "context:constitutional-bar",
  direction: "supports",
  importance: "moderate",
  confidence: "medium",
  explanation: "Changing the Constitution asks more than passing a law does.",
  sourceRefs: [],
};
const PRESIDENT: TermLimitHolder = {
  title: "President",
  decisionType: "governing.presidential-term-limit-vote",
  keyWord: "president",
};

export function termLimitConsiderations(
  facts: TermLimitVoteFacts,
  voter: Voter,
  cause: {
    readonly direction: "extend" | "restore";
    readonly holderPersonId: EntityId;
  },
  holder: TermLimitHolder = PRESIDENT,
  extra: readonly DecisionConsideration[] = [],
): readonly DecisionConsideration[] {
  const forPresident = cause.direction === "extend" ? "vote-yea" : "vote-nay";
  const againstPresident =
    forPresident === "vote-yea" ? "vote-nay" : "vote-yea";
  const party = facts.parties.get(voter.personId) ?? null;
  const presidentParty = facts.parties.get(cause.holderPersonId) ?? null;
  const considerations: DecisionConsideration[] = [
    CONSTITUTIONAL_BAR,
    ...extra,
  ];
  if (party && presidentParty)
    considerations.push({
      stableKey:
        party === presidentParty
          ? `member:${holder.keyWord}s-party`
          : "member:other-party",
      optionKey: party === presidentParty ? forPresident : againstPresident,
      sourceType: `context:${holder.keyWord}s-party`,
      direction: "supports",
      importance: "strong",
      confidence: "high",
      explanation:
        party === presidentParty
          ? `The ${holder.title} is of the member's own party.`
          : `The ${holder.title} is of the other party.`,
      sourceRefs: [],
    });
  for (const reason of relationshipConsiderations(
    facts.relationships.get(`${voter.personId}:${cause.holderPersonId}`)!,
    voter.personId,
    cause.holderPersonId,
    {
      optionKey: forPresident,
      fond: {
        stableKey: `member:${holder.keyWord}-relationship`,
        explanation: `The member thinks well of the ${holder.title}.`,
      },
      strain: {
        stableKey: `member:${holder.keyWord}-strain`,
        explanation: `The member has a strained history with the ${holder.title}.`,
      },
    },
  ))
    considerations.push(
      reason.direction === "opposes"
        ? { ...reason, optionKey: againstPresident, direction: "supports" }
        : reason,
    );
  return considerations;
}
export function termLimitCount(
  facts: TermLimitVoteFacts,
  year: number,
  cause: FederalReformCause,
) {
  const key = `federal-reform/v1:US:${year}`;
  const measure = facts.measures.find((row) => row.stableKey === key);
  if (!measure) {
    const proposal = {
      stableKey: key,
      jurisdictionId: facts.federalJurisdictionId,
      jurisdictionKey: "US",
      processKind: "federal-amendment",
      designation: `Proposed Amendment to the Constitution (${year})`,
      shortTitle: "The President's term limit",
      text: facts.proposalText,
      sponsoringAuthority: "The Congress of the United States",
      ratificationMode: "state-legislatures",
      deadlineAt: yearsLater(
        facts.onDate,
        FEDERAL_REFORM_PROFILE.ratificationYears,
      ),
      ruleDelta: {
        kind: "rule-field",
        officeKey: "us-president",
        field: "executive.term.limit",
        value: cause.value,
        applicability:
          cause.direction === "extend"
            ? { appliesTo: "immediately", countsPriorService: true }
            : { appliesTo: "terms-beginning-after", countsPriorService: false },
      },
    };
    return {
      kind: "prepare" as const,
      commands: [
        { command: "proposeAmendment", input: proposal },
      ] satisfies readonly InstitutionCommand[],
    };
  }
  const houses = (["house", "senate"] as const).map((bodyKey) => {
    const members = (facts.bodies.get(bodyKey)?.members ?? []).filter(
      (member) => member.personId !== null,
    );
    const voters: Voter[] = members.flatMap((member) =>
      member.personId
        ? [{ memberKey: member.memberKey, personId: member.personId }]
        : [],
    );
    const dispositions = decideChamberVote(facts.votes.get(bodyKey)!, {
      kind: "constitutional",
      stableKey: `${measure.stableKey}:${bodyKey}`,
      constitutionalMeasureId: measure.id,
      bodyKey,
      purpose: "proposal",
      members,
      playerPersonId: facts.playerPersonId,
      considerationsByMember: new Map(
        voters.map((voter) => [
          voter.memberKey,
          termLimitConsiderations(facts, voter, cause),
        ]),
      ),
    });
    return {
      bodyKey,
      rows: dispositions.map((row) => ({
        voter: { memberKey: row.memberKey, personId: row.personId! },
        ballot: row.disposition,
        reason: row.reason ?? "member:no-reason",
      })),
    };
  });
  const carries = houses.every(({ rows }) => {
    const cast = rows.filter((row) => row.ballot !== "absent");
    return (
      cast.length > 0 &&
      cast.filter((row) => row.ballot === "yea").length * 3 >= cast.length * 2
    );
  });
  return { kind: "counted" as const, measureId: measure.id, houses, carries };
}

// stopgapId: "SG-P14-legislatures-term-limit-present-denominator"
