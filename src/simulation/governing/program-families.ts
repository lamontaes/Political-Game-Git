import type { ProgramFamily } from "../legislation-program-families";
import { programFamilies } from "../legislation-program-families";

/**
 * The program subjects a governing office can act on: every drafting family.
 *
 * This used to hand-pick three of the five banks (service, fiscal and
 * administration) and leave out infrastructure and resilience, with no record
 * saying why; the legislature's list already had all five when it was
 * written. So a governor's first-year agenda and budget season could never
 * name transit, bridges, broadband, water service lines, disaster recovery,
 * utility resilience or critical infrastructure, and an adopted appropriation
 * for one of them reached the office titled "public work". One list, read
 * from the canonical one, so a bank added for legislators reaches governors
 * too.
 */
export const PROGRAM_FAMILIES: readonly ProgramFamily[] = programFamilies();

export function programFamilyTitle(familyKey: string): string | null {
  return (
    PROGRAM_FAMILIES.find((family) => family.familyKey === familyKey)?.title ??
    null
  );
}
