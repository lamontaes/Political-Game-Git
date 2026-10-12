import type {
  EntityId,
  DecisionConsideration,
  LegislativeMemberDisposition,
  RelationshipInteraction,
  DecisionEvaluation,
  LegislativeVoteDisposition,
} from "../../simulation/types";
import type {
  StandingBand,
  readRelationshipStanding,
} from "../../simulation/relationship-standing";
import type { SeatedMember } from "../../simulation/legislation-scenarios";
import type {
  ChamberVoteInput,
  ChamberVoteOptions,
  ChamberVoteMemberEvaluation,
} from "../../simulation/governing/chamber-votes";
import type { ChamberVoteContext } from "./nomination-context";
import { considerationScore } from "./reason-ranking";
export interface ChamberDecisionFacts {
  readonly context: ChamberVoteContext;
  readonly interactions: readonly RelationshipInteraction[];
  readonly trustReadings: ReadonlyMap<
    string,
    ReturnType<typeof readRelationshipStanding>["readings"]["trust"]
  >;
  readonly memberEvaluations: ReadonlyMap<
    string,
    {
      readonly evaluation: DecisionEvaluation;
      readonly disposition: LegislativeMemberDisposition;
    }
  >;
}
export function decideChamberVote(
  facts: ChamberDecisionFacts,
  input: ChamberVoteInput,
  options: ChamberVoteOptions = {},
): readonly LegislativeVoteDisposition[] {
  const context = facts.context;
  const first = input.members.map((member) => {
    if (member.personId === null)
      return {
        member,
        settled: {
          memberKey: member.memberKey,
          personId: null,
          disposition: "absent",
        } satisfies LegislativeVoteDisposition,
      };
    if (member.personId === input.playerPersonId)
      return {
        member,
        settled: (input.playerBallot
          ? {
              memberKey: member.memberKey,
              personId: member.personId,
              disposition: input.playerBallot,
              reason: "member:own-ballot",
            }
          : {
              memberKey: member.memberKey,
              personId: member.personId,
              disposition: "absent",
              reason: "member:player-not-present",
            }) satisfies LegislativeVoteDisposition,
      };
    const memberInputs = context.memberInputs(member);
    return {
      member,
      get views() {
        return memberInputs.views;
      },
      cues: memberInputs.cues,
      settled: null,
    };
  });
  const byView = new Map<SeatedMember, ChamberVoteMemberEvaluation>();
  const decideByView = (row: (typeof first)[number]) => {
    if (row.settled)
      return {
        disposition: row.settled,
        evaluation: null,
        sourceRefs: [],
      } satisfies ChamberVoteMemberEvaluation;
    if (!row.views || row.views.length === 0) return null;
    let settled = byView.get(row.member);
    if (!settled) {
      settled = decideMember(row.member, [...row.views, ...(row.cues ?? [])]);
      byView.set(row.member, settled);
    }
    return settled;
  };
  const deciding = input.only
    ? first.filter((row) => input.only!.has(row.member.memberKey))
    : first;
  const committee = context.committee;
  const hasViews = (row: (typeof first)[number]): boolean =>
    !row.settled && row.views !== undefined && row.views.length > 0;
  const rowsOf = new Map<EntityId, (typeof first)[number][]>();
  for (const row of first)
    if (row.member.personId !== null)
      rowsOf.set(row.member.personId, [
        ...(rowsOf.get(row.member.personId) ?? []),
        row,
      ]);
  const trusted = trustAmong(
    facts,
    deciding.flatMap((row) =>
      !row.settled && row.views?.length === 0 && row.member.personId
        ? [row.member.personId]
        : [],
    ),
    (personId) => (rowsOf.get(personId) ?? []).some(hasViews),
  );
  const colleagues = new Set(
    [...trusted.values()].flatMap((row) => [...row.keys()]),
  );
  const decidedByView = new Map<EntityId, LegislativeMemberDisposition>();
  for (const row of first) {
    if (row.member.personId === null || !colleagues.has(row.member.personId))
      continue;
    if (!hasViews(row)) continue;
    const disposition = decideByView(row)?.disposition.disposition;
    if (disposition === "yea" || disposition === "nay")
      decidedByView.set(row.member.personId, disposition);
  }
  return deciding.map((row) => {
    const settled = decideByView(row);
    const decision =
      settled ??
      (() => {
        const personId = row.member.personId!;
        return decideMember(row.member, [
          ...(row.cues ?? []),
          ...(committee ? [committee] : []),
          ...trustedColleagueCues(trusted.get(personId), decidedByView),
        ]);
      })();
    options.onMemberEvaluation?.(decision);
    return decision.disposition;
  });
  function decideMember(
    member: SeatedMember,
    considerations: readonly DecisionConsideration[],
  ): ChamberVoteMemberEvaluation {
    if (considerations.length === 0)
      return {
        disposition: {
          memberKey: member.memberKey,
          personId: member.personId,
          disposition: "present-not-voting",
          reason: "member:no-reason",
        },
        evaluation: null,
        sourceRefs: [],
      };
    const { evaluation, disposition } = facts.memberEvaluations.get(
      `${input.stableKey}:${member.memberKey}:decision`,
    )!;
    input.onDecision?.(evaluation);
    const selected = evaluation.selectedOptionKey ?? "withhold";
    const decisive = evaluation.context.considerations
      .filter((consideration) => consideration.optionKey === selected)
      .sort(
        (l, r) =>
          Math.abs(considerationScore(r)) - Math.abs(considerationScore(l)),
      )[0];
    return {
      disposition: {
        memberKey: member.memberKey,
        personId: member.personId,
        disposition,
        reason: decisive
          ? decisive.sourceType === "belief:formed-position" &&
            decisive.sourceRefs[0]?.kind === "private-belief"
            ? `member:private-belief:${decisive.sourceRefs[0].beliefId}`
            : KEPT_REASON_PREFIXES.some((prefix) =>
                  decisive.stableKey.startsWith(prefix),
                )
              ? decisive.stableKey
              : decisive.stableKey.split(":").slice(0, 2).join(":")
          : "member:no-reason",
      },
      evaluation,
      sourceRefs: evaluation.sourceSnapshots.map(
        (snapshot) => snapshot.reference,
      ),
    };
  }
}

const KEPT_REASON_PREFIXES = [
  "member:party-cue:",
  "member:principle:",
  "member:spending:",
  "member:constituents:",
  "member:executive:",
  "member:trusted-colleague:",
  "senator:",
];

function trustAmong(
  facts: ChamberDecisionFacts,
  undecided: readonly EntityId[],
  decided: (personId: EntityId) => boolean,
): ReadonlyMap<EntityId, ReadonlyMap<EntityId, StandingBand>> {
  const out = new Map<EntityId, Map<EntityId, StandingBand>>();
  if (undecided.length === 0) return out;
  const undecidedSet = new Set(undecided);
  const decidedMemo = new Map<EntityId, boolean>();
  const isDecided = (personId: EntityId): boolean => {
    let known = decidedMemo.get(personId);
    if (known === undefined) {
      known = decided(personId);
      decidedMemo.set(personId, known);
    }
    return known;
  };
  const pairs = new Set<string>();
  for (const interaction of facts.interactions)
    for (const viewer of interaction.personIds)
      if (undecidedSet.has(viewer))
        for (const subject of interaction.personIds)
          if (subject !== viewer && isDecided(subject))
            pairs.add(`${viewer}\u0000${subject}`);
  for (const pair of pairs) {
    const [viewer, subject] = pair.split("\u0000") as [EntityId, EntityId];
    const trust = facts.trustReadings.get(`${viewer}\u0000${subject}`)!;
    if (trust.adverse || trust.band === "none") continue;
    const row = out.get(viewer) ?? new Map<EntityId, StandingBand>();
    row.set(subject, trust.band);
    out.set(viewer, row);
  }
  return out;
}

function trustedColleagueCues(
  trust: ReadonlyMap<EntityId, StandingBand> | undefined,
  decidedByView: ReadonlyMap<EntityId, LegislativeMemberDisposition>,
): readonly DecisionConsideration[] {
  if (!trust) return [];
  const rank = { none: 0, slight: 1, marked: 2, strong: 3 } as const;
  const best = new Map<"yea" | "nay", StandingBand>();
  for (const [colleague, band] of trust) {
    const side = decidedByView.get(colleague);
    if (side !== "yea" && side !== "nay") continue;
    const held = best.get(side);
    if (!held || rank[band] > rank[held]) best.set(side, band);
  }
  return [...best].map(([side, band]) => ({
    stableKey: `member:trusted-colleague:${side}`,
    optionKey: side === "yea" ? "vote-yea" : "vote-nay",
    sourceType: "context:trusted-colleague",
    direction: "supports",
    importance:
      band === "strong" ? "strong" : band === "marked" ? "moderate" : "slight",
    confidence: "medium",
    explanation: `Colleagues the member trusts voted ${side === "yea" ? "for" : "against"} it.`,
    sourceRefs: [],
  }));
}

// stopgapId: "SG-P14-legislatures-chamber-two-pass"
