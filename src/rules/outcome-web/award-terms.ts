/** Preserve final adopted term admission without looking up or inventing a law. */
export function operativeAwardTermsFromFacts<
  Law extends { readonly answer: string },
>(facts: {
  readonly law: Law | null;
  readonly cap: {
    readonly value: number;
    readonly sourceRecordIds: readonly string[];
  } | null;
  readonly disclosures: {
    readonly values: readonly string[];
    readonly sourceRecordIds: readonly string[];
  } | null;
}) {
  const { law, cap, disclosures } = facts;
  if (!law || law.answer !== "yes") return null;
  if (
    !cap ||
    !Number.isSafeInteger(cap.value) ||
    cap.value < 0 ||
    !Number.isSafeInteger(cap.value * 100) ||
    !disclosures ||
    new Set(disclosures.values).size !== disclosures.values.length
  )
    return null;
  return {
    law,
    capDollars: cap.value,
    capSourceRecordIds: cap.sourceRecordIds,
    requiredDisclosureFields: disclosures.values,
    disclosureSourceRecordIds: disclosures.sourceRecordIds,
  };
}
