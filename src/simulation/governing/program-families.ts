import { SERVICE_FAMILIES } from "../legislation-service-families";
import { FISCAL_INSTRUMENT_FAMILIES } from "../legislation-fiscal-families";
import { PUBLIC_ADMINISTRATION_FAMILIES } from "../legislation-administration-families";

/** The program subjects a governing office can act on, from the drafting families. */
export const PROGRAM_FAMILIES = [
  ...SERVICE_FAMILIES,
  ...FISCAL_INSTRUMENT_FAMILIES,
  ...PUBLIC_ADMINISTRATION_FAMILIES,
];

export function programFamilyTitle(familyKey: string): string | null {
  return (
    PROGRAM_FAMILIES.find((family) => family.familyKey === familyKey)?.title ??
    null
  );
}
