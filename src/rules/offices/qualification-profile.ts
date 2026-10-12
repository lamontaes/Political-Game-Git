/** P11 KEEP: modalQualification and qualificationRange; caller owns corpus selection. */
import type {
  QualificationFieldName,
  QualificationOfficeFamily,
  SourcedQualification,
} from "../../simulation/office-qualification-rules";
import type { QualificationRange } from "../../simulation/office-qualification-profile";
export function modalQualification(
  field: QualificationFieldName,
  officeFamily: QualificationOfficeFamily,
  rows: readonly SourcedQualification[],
): number | null {
  const statesByValue = new Map<number, Set<string>>();
  for (const row of rows) {
    if (
      row.field !== field ||
      row.officeFamily !== officeFamily ||
      row.sourceState !== "KNOWN" ||
      typeof row.value !== "number"
    )
      continue;
    const states = statesByValue.get(row.value) ?? new Set<string>();
    states.add(row.stateUsps);
    statesByValue.set(row.value, states);
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const [value, states] of [...statesByValue.entries()].sort(
    (left, right) => left[0] - right[0],
  )) {
    if (states.size > bestCount) {
      best = value;
      bestCount = states.size;
    }
  }
  return best;
}

export function qualificationRange(
  field: QualificationFieldName,
  officeFamily: QualificationOfficeFamily,
  rows: readonly SourcedQualification[],
): QualificationRange | null {
  const matching = rows.filter(
    (row) =>
      row.field === field &&
      row.officeFamily === officeFamily &&
      row.sourceState === "KNOWN" &&
      typeof row.value === "number",
  );
  if (matching.length === 0) return null;
  const enactedValues = [
    ...new Set(matching.map((row) => row.value as number)),
  ].sort((left, right) => left - right);
  return {
    field,
    officeFamily,
    enactedValues,
    lowest: enactedValues[0]!,
    highest: enactedValues[enactedValues.length - 1]!,
    states: [...new Set(matching.map((row) => row.stateUsps))].sort(),
  };
}
