import {
  knownRule,
  majorityOf,
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
  authority: "research-reference",
  citation: "b12-comparable-chamber-profile/v1",
  sourceTitle: "B12 comparable-chamber estimate",
  sourceUrl: null,
  retrievedAt: null,
  verification: "partial",
  note: "Estimated from the shared comparable-chamber profile; this is not a claim about an unread body's law.",
};

const ESTIMATED_MOTIONS: readonly ProceduralMotion[] = [
  "table",
  "postpone",
  "recommit",
  "recorded-vote",
  "full-reading",
  "suspend-rules",
];

/** Resolve one complete, explicitly sourced or estimated row per chamber. */
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
  const clotureBar = clotureStage
    ? clotureStage.vote
    : notApplicableRule<VoteThresholdRule>(
        "No cloture vote is recorded for this chamber.",
      );

  return {
    packId: pack.packId,
    chamberKey,
    motions: knownRule(ESTIMATED_MOTIONS, PROFILE_SOURCE),
    motionBar: knownRule(
      majorityOf(
        "members-present",
        "a majority of members present",
        PROFILE_SOURCE,
      ),
      PROFILE_SOURCE,
    ),
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
    unlimitedDebate: clotureStage
      ? knownRule(true, clotureStage.source)
      : knownRule(false, PROFILE_SOURCE),
    clotureBar,
    quorum: chamber.quorum,
    mayCompelAttendance: knownRule(true, PROFILE_SOURCE),
    absencePenalty: knownRule("chamber-prescribed", PROFILE_SOURCE),
  };
}

/** All chamber rows in pack order. */
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

/** Attach a complete row to every chamber before the pack enters play. */
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
