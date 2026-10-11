import type {
  LegislativeRulePack,
  ChamberRule,
  RuleSourceRef,
} from "../../simulation/legislature-rules";
import { makeIsoDate, type IsoDate } from "../elections/calendar";
function chamberSequenceFrom(
  pack: LegislativeRulePack,
  originChamberKey: string,
): readonly string[] {
  if (!pack.chamberOrder.includes(originChamberKey)) {
    throw new Error(
      `Chamber '${originChamberKey}' is not in the order for '${pack.packId}'.`,
    );
  }
  return [
    originChamberKey,
    ...pack.chamberOrder.filter((key) => key !== originChamberKey),
  ];
}
export function nextChamberKey(
  pack: LegislativeRulePack,
  chamberKey: string,
  originChamberKey: string,
): string | null {
  const sequence = chamberSequenceFrom(pack, originChamberKey);
  const index = sequence.indexOf(chamberKey);
  if (index < 0) {
    throw new Error(
      `Chamber '${chamberKey}' is not in the order for '${pack.packId}'.`,
    );
  }
  return sequence[index + 1] ?? null;
}

export function nextFloorStageKey(
  chamber: ChamberRule,
  stageKey: string,
): string | null {
  const index = chamber.floorStages.findIndex(
    (candidate) => candidate.stageKey === stageKey,
  );
  if (index < 0) {
    throw new Error(
      `Chamber '${chamber.chamberKey}' has no floor stage '${stageKey}'.`,
    );
  }
  return chamber.floorStages[index + 1]?.stageKey ?? null;
}
export function regularSessionDateStatus(
  pack: LegislativeRulePack,
  onDate: IsoDate,
):
  | {
      readonly kind: "unresolved";
    }
  | {
      readonly kind: "outside-regular-session-year";
      readonly source: RuleSourceRef;
    }
  | {
      readonly kind: "within-outer-limit" | "past-outer-limit";
      readonly deadline: IsoDate;
      readonly source: RuleSourceRef;
    } {
  const year = Number(onDate.slice(0, 4));
  const cadence = pack.session.regularSessionYears;
  if (
    cadence &&
    cadence.value !== "annual" &&
    (year % 2 === 0 ? "even" : "odd") !== cadence.value
  ) {
    return { kind: "outside-regular-session-year", source: cadence.source };
  }
  const limit = pack.session.regularSessionLatestAdjournment;
  if (!limit) return { kind: "unresolved" };
  const boundary = year % 2 ? limit.value.oddYear : limit.value.evenYear;
  const deadline = makeIsoDate(
    `${year}-${String(boundary.month).padStart(2, "0")}-${String(boundary.day).padStart(2, "0")}`,
  );
  return {
    kind: onDate > deadline ? "past-outer-limit" : "within-outer-limit",
    deadline,
    source: limit.source,
  };
}
