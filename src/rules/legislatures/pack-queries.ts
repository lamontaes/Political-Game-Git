import type {
  LegislativeRulePack,
  ChamberRule,
  CommitteeRule,
  FloorStageRule,
  RuleValue,
  KnownRuleValue,
  RuleSourceRef,
} from "../../simulation/legislature-rules";
import type { LegislativeSubjectClass } from "../../simulation/types";
export function knownRule<T>(
  value: T,
  source: RuleSourceRef,
): KnownRuleValue<T> {
  return { kind: "known", value, source };
}

export function chamberByKey(
  pack: LegislativeRulePack,
  chamberKey: string,
): ChamberRule {
  const chamber = pack.chambers.find(
    (candidate) => candidate.chamberKey === chamberKey,
  );
  if (!chamber) {
    throw new Error(
      `Rule pack '${pack.packId}' has no chamber '${chamberKey}'.`,
    );
  }
  return chamber;
}

export function permittedOriginChambers(
  pack: LegislativeRulePack,
  subjectClass: LegislativeSubjectClass,
): RuleValue<readonly string[]> {
  const restriction = pack.origination.subjectRestrictions.find(
    (candidate) => candidate.subjectClass === subjectClass,
  );
  if (restriction) {
    return knownRule(restriction.chamberKeys, restriction.source);
  }
  return pack.origination.generalOrigination;
}

export function assertOriginationPermitted(
  pack: LegislativeRulePack,
  subjectClass: LegislativeSubjectClass,
  chamberKey: string,
): void {
  const permitted = permittedOriginChambers(pack, subjectClass);
  if (permitted.kind !== "known") return;
  if (!permitted.value.includes(chamberKey)) {
    const chamber = chamberByKey(pack, chamberKey);
    throw new Error(
      `A ${subjectClass} measure cannot originate in the ${chamber.name}: ${permitted.source.citation} confines it to ${permitted.value.join(", ")}.`,
    );
  }
}

export function committeeByKey(
  chamber: ChamberRule,
  committeeKey: string,
): CommitteeRule {
  const committee = chamber.committees.find(
    (candidate) => candidate.committeeKey === committeeKey,
  );
  if (!committee) {
    throw new Error(
      `Chamber '${chamber.chamberKey}' has no committee '${committeeKey}'.`,
    );
  }
  return committee;
}

export function floorStageByKey(
  chamber: ChamberRule,
  stageKey: string,
): FloorStageRule {
  const stage = chamber.floorStages.find(
    (candidate) => candidate.stageKey === stageKey,
  );
  if (!stage) {
    throw new Error(
      `Chamber '${chamber.chamberKey}' has no floor stage '${stageKey}'.`,
    );
  }
  return stage;
}
