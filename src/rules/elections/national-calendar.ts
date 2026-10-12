import { ELECTION_PARAMETERS } from "./parameters";
export function isNationalElectionCycle(year: number): boolean {
  return (
    Number.isSafeInteger(year) &&
    year >= ELECTION_PARAMETERS.firstNationalCycle.value &&
    year % 4 === 0
  );
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function utcDay(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function presidentialElectionDay(year: number): string {
  const firstMonday = 1 + ((8 - utcDay(year, 11, 1)) % 7);
  return `${year}-11-${pad(firstMonday + 1)}`;
}

export function electorMeetingDay(year: number): string {
  const firstWednesday = 1 + ((10 - utcDay(year, 12, 1)) % 7);
  return `${year}-12-${pad(firstWednesday + 7 + 6)}`;
}
