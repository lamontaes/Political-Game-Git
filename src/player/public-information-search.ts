import type { PublicInformationPanelItem } from "../presentation/public-information-adapters";

function containsLiteral(value: string, normalizedQuery: string): boolean {
  return value.toLowerCase().includes(normalizedQuery);
}

function itemMatchesQuery(
  item: PublicInformationPanelItem,
  normalizedQuery: string,
): boolean {
  if (containsLiteral(item.headline, normalizedQuery)) return true;
  if (containsLiteral(item.body, normalizedQuery)) return true;
  if (
    item.jurisdictionName &&
    containsLiteral(item.jurisdictionName, normalizedQuery)
  ) {
    return true;
  }
  for (const person of item.people) {
    if (containsLiteral(person.label, normalizedQuery)) return true;
  }
  for (const correction of item.corrections) {
    if (containsLiteral(correction.note, normalizedQuery)) return true;
    if (containsLiteral(correction.body, normalizedQuery)) return true;
  }
  return false;
}

/** Trimmed, case-insensitive literal substring filter over displayed panel fields. */
export function filterPublishedNewsItems(
  items: readonly PublicInformationPanelItem[],
  rawQuery: string,
): readonly PublicInformationPanelItem[] {
  const normalizedQuery = rawQuery.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return items;
  }
  return items.filter((item) => itemMatchesQuery(item, normalizedQuery));
}
