import lawRows from "../../../data/laws/justice/lw17-person-landings.json" with { type: "json" };
import type { LawConsequenceRow } from "../law-consequence-types";

export const LW17_PERSON_LANDING_ROWS: Readonly<
  Record<string, readonly LawConsequenceRow[]>
> = lawRows.rows as Record<string, readonly LawConsequenceRow[]>;
