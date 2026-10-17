/**
 * The jurisdiction a state's or the nation's government is recorded under,
 * so an employer of that government (a state office in town, the post office)
 * and the treasury that pays it name the same one.
 */
import departments from "./data/opening/department-governments.json" with { type: "json" };
import { createStableId } from "./kernel/ids";
import { coreStateJurisdiction } from "./place-lookup";

/** The nation's jurisdiction id. */
export function federalJurisdictionId(): string {
  return createStableId("jurisdiction", departments.federalJurisdictionKey);
}

/** A state's jurisdiction id, from its key (for example the key a place carries). */
export function stateJurisdictionId(stateKey: string): string | undefined {
  return coreStateJurisdiction(stateKey)?.id;
}
