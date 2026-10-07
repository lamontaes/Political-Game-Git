import type { LawInForce } from "./governing/law-in-force";
import type { EntityId } from "./types";
import type { LawAmountUnit } from "./law-consequence-types";

/** A saved law exists, but the numeric term needed for this activity does not. */
export class MissingLawConsequenceTerm extends Error {
  constructor(
    readonly law: LawInForce,
    readonly questionKey: string,
    readonly rowId: string,
    readonly personId: EntityId,
    readonly jurisdictionId: EntityId,
    readonly termKey: string,
    readonly unit: LawAmountUnit,
  ) {
    super(`Missing final law term '${termKey}' (${unit}) for ${questionKey}`);
    this.name = "MissingLawConsequenceTerm";
  }
}
