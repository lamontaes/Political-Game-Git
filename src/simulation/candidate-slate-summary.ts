export function candidateSlateSummary(
  count: number,
  officeTitle: string,
): string {
  const people = count === 1 ? "person" : "people";
  return `${count} ${people} entered the race for ${officeTitle}.`;
}
