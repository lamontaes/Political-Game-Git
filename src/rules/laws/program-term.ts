export function programEndedAtDate(
  currentDate: string,
  lastDay: string | null,
): boolean {
  return lastDay !== null && currentDate > lastDay;
}
