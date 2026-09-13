/**
 * Player-facing labels for catalog family ids.
 *
 * The catalog identity stays the kebab/underscore id. This is presentation
 * only: diagnostic ids remain on developer evidence; the select shows words.
 */

export function catalogFamilyLabel(familyId: string): string {
  const parts = familyId.split(/[-_]+/).filter(Boolean);
  if (parts.length === 0) return familyId;
  return parts
    .map((part, index) =>
      index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part,
    )
    .join(" ");
}

export function catalogFamilyLabels(
  familyIds: Iterable<string>,
): Readonly<Record<string, string>> {
  const labels: Record<string, string> = {};
  for (const id of familyIds) {
    if (id) labels[id] = catalogFamilyLabel(id);
  }
  return labels;
}
