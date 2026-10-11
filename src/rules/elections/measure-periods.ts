import { ELECTION_PARAMETERS as P } from "./parameters";
export function councilOpeningNumber(startedAt: string): number {
  const date = new Date(`${startedAt.slice(0, 10)}T00:00:00Z`);
  const january = Date.UTC(date.getUTCFullYear(), 0, 1);
  return (
    1 +
    Math.floor(
      (date.getTime() - january) / (P.ordinancePaceDays.value * 86400000),
    )
  );
}

export function congressNumberForYear(year: number): number {
  return Math.floor((year - P.congressPeriodAnchor.value) / 2) + 1;
}

export function councilPeriodForYear(
  year: number,
  referenceYear: number,
  cycleYears: number,
): number {
  return Math.floor((year - referenceYear) / cycleYears) + 1;
}
