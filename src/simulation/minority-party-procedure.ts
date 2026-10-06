import {
  knownRule,
  notApplicableRule,
  type ChamberRule,
  type LegislativeRulePack,
  type MinorityPartyProcedureRow,
  type MinorityProcedureMotion,
  type RuleSourceRef,
  type VoteThresholdRule,
} from "./legislature-rules";

/** Procedural tools a member may use against a pending measure. */
export type ProceduralMotion = MinorityProcedureMotion;
export type MinorityPartyProcedureRules = MinorityPartyProcedureRow;

const PROFILE_SOURCE: RuleSourceRef = {
  authority: "game-profile",
  citation: "minority-party-procedure-profile/v1",
  sourceTitle: "Our Civic Duty minority-party procedure profile",
  sourceUrl: null,
  retrievedAt: null,
  verification: "game-profile",
  note: "A disclosed game-profile estimate used until a chamber's motion, debate and attendance rules have been entered from its own instruments. It is not a claim about an unread body's law.",
};

const ESTIMATED_MOTIONS: readonly ProceduralMotion[] = [
  "table",
  "postpone",
  "recommit",
  "recorded-vote",
  "full-reading",
  "suspend-rules",
];

/**
 * Resolve one complete minority-procedure row for every chamber. The
 * chamber's existing quorum and any recorded cloture floor stage are the
 * authoritative inputs; unread procedural permissions come from the marked
 * shared profile and can later be replaced by a sourced row without changing
 * the decision path.
 */
export function minorityPartyProcedureForChamber(
  pack: LegislativeRulePack,
  chamberKey: string,
): MinorityPartyProcedureRules {
  const chamber = pack.chambers.find(
    (candidate) => candidate.chamberKey === chamberKey,
  );
  if (!chamber)
    throw new Error(
      `Rule pack '${pack.packId}' has no chamber '${chamberKey}'.`,
    );

  const clotureStage = chamber.floorStages.find(
    (stage) => stage.stageKey === "cloture",
  );
  const hasCloture = clotureStage !== undefined;
  const clotureBar = hasCloture
    ? clotureStage.vote
    : notApplicableRule<VoteThresholdRule>(
        "This chamber's rules do not provide unlimited debate with a cloture vote.",
      );

  return {
    packId: pack.packId,
    chamberKey,
    motions: knownRule(ESTIMATED_MOTIONS, PROFILE_SOURCE),
    suspendRulesBar: knownRule(
      {
        numerator: 1,
        denominatorParts: 2,
        countedAgainst: "members-present",
        rounding: "strictly-greater-than-fraction",
        label: "a majority of members present",
        source: PROFILE_SOURCE,
      },
      PROFILE_SOURCE,
    ),
    unlimitedDebate: knownRule(
      hasCloture,
      hasCloture ? clotureStage.source : PROFILE_SOURCE,
    ),
    clotureBar,
    quorum: chamber.quorum,
    mayCompelAttendance: knownRule(true, PROFILE_SOURCE),
    absencePenalty: knownRule("chamber-prescribed", PROFILE_SOURCE),
  };
}

/** All resolved body rows in a pack, in the pack's own chamber order. */
export function minorityPartyProcedureRows(
  pack: LegislativeRulePack,
): readonly MinorityPartyProcedureRules[] {
  return (
    pack.minorityPartyProcedureRows ??
    pack.chambers.map((chamber: ChamberRule) =>
      minorityPartyProcedureForChamber(pack, chamber.chamberKey),
    )
  );
}

/** Attach one explicit, versioned procedure row to every chamber in a pack. */
export function withMinorityPartyProcedureRows(
  pack: LegislativeRulePack,
): LegislativeRulePack {
  return {
    ...pack,
    minorityPartyProcedureRows: pack.chambers.map((chamber) =>
      minorityPartyProcedureForChamber(pack, chamber.chamberKey),
    ),
  };
}
