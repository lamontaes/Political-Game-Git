// Lifted unchanged from src/simulation/civil-personnel-actions.ts; RULES-3, 2026-10-11.
import type { PersonnelProcedure } from "../../simulation/civil-personnel-contract";
import type { IsoDate } from "../../simulation/types";

export function procedureApplicability(
  procedure: PersonnelProcedure,
  onDate: IsoDate,
  jurisdictionApplicable?: boolean,
):
  | { readonly state: "SUPPORTED" }
  | { readonly state: "UNKNOWN"; readonly reason: string } {
  if (
    jurisdictionApplicable !== undefined
      ? !jurisdictionApplicable
      : onDate < procedure.validity.observedOn
  )
    return {
      state: "UNKNOWN",
      reason: `${procedure.citation.citation} was observed in current text on ${procedure.validity.observedOn}; that does not establish it on ${onDate}.`,
    };
  return { state: "SUPPORTED" };
}
