import type {
  ChamberRule,
  RuleValue,
} from "../../simulation/legislature-rules";
function requireKnown<T>(value: RuleValue<T>, label: string): T {
  if (value.kind === "known") return value.value;
  if (value.kind === "unknown") {
    throw new Error(`${label} is unknown in this legislature: ${value.note}`);
  }
  throw new Error(`${label} does not apply in this legislature: ${value.note}`);
}

function requireFormalSeatCount(chamber: ChamberRule): number {
  return requireKnown(
    chamber.seats,
    `formal seat count for the ${chamber.name}`,
  );
}
export function electedMembersFor(
  chamber: ChamberRule,
  electedMembers?: number,
): number {
  if (electedMembers === undefined) return requireFormalSeatCount(chamber);
  if (!Number.isSafeInteger(electedMembers) || electedMembers <= 0) {
    throw new Error(
      `The ${chamber.name} needs a positive count of elected officials.`,
    );
  }
  if (
    chamber.seats.kind === "known" &&
    electedMembers > chamber.seats.value + (chamber.seatsMayGrowBy ?? 0)
  ) {
    throw new Error(
      `The ${chamber.name} cannot have more members elected than its ${chamber.seats.value} formal seats.`,
    );
  }
  return electedMembers;
}
