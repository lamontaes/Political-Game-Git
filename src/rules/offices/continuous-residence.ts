import { addDays, type IsoDate } from "./calendar";
export interface ResidenceFacts {
  readonly personExists: boolean;
  readonly residences: readonly {
    readonly kind: string;
    readonly endedAt: string | null;
    readonly occurredAt: string;
    readonly covered: boolean;
  }[];
  readonly homeCoverage: ReadonlySet<string>;
  readonly changeDates: readonly string[];
}
export function continuousResidenceSince(
  facts: ResidenceFacts,
  onDate: IsoDate,
): IsoDate | null {
  if (!facts.personExists) return null;
  const factStart =
    facts.residences
      .filter(
        (fact) =>
          fact.kind === "residence" &&
          fact.endedAt === null &&
          fact.occurredAt <= onDate &&
          fact.covered,
      )
      .map((fact) => fact.occurredAt)
      .sort()[0] ?? null;
  let householdStart: IsoDate | null = null;
  if (facts.homeCoverage.has(onDate)) {
    const changes = facts.changeDates.filter((date) => date < onDate);
    householdStart = onDate;
    for (let index = changes.length - 1; index >= 0; index -= 1) {
      const change = changes[index]!;
      if (facts.homeCoverage.has(change)) {
        householdStart = change;
        continue;
      }
      const oneDayMove =
        addDays(change, 1) >= householdStart &&
        facts.homeCoverage.has(addDays(change, -1));
      if (!oneDayMove) break;
    }
  }
  if (factStart === null) return householdStart;
  if (householdStart === null) return factStart;
  return householdStart < factStart ? householdStart : factStart;
}
