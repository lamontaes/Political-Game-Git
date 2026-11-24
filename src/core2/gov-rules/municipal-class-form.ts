/**
 * The council a municipality has by its state's law for its class (playtest
 * sitting C9, N8-P17): a New Jersey borough's six members and Mayor, a
 * Wisconsin village's six trustees and Village President. The middle of three
 * tiers, read where the town's own charter has not been read and before the
 * national typical council (`typical-council-size.ts`):
 *
 * 1. the town's own reading (`municipal-governments.json`);
 * 2. its class's form in its state's law
 *    (`data/research/local-government/municipal-class-forms.json`);
 * 3. the national typical council.
 *
 * The class is the kind the Census Government Units listing names the
 * government by: "BOROUGH OF BLOOMSBURY" is a borough, "VILLAGE OF EOLIA" a
 * village. One rule for every state and class; a class not yet read has no
 * form and falls to the typical council.
 */
import forms from "../../../data/research/local-government/municipal-class-forms.json" with { type: "json" };
import {
  governmentUnitsForPlace,
  type GovernmentUnitIdentity,
} from "../reference/government-units";
import type { MunicipalElectionTiming } from "./municipal-election-rules";

export interface MunicipalClassForm {
  /** The state and class the form was read for. */
  readonly stateUsps: string;
  readonly municipalClass: string;
  readonly seats: number;
  /**
   * The statute's term for a member; absent where it gives none, and the
   * term falls to the typical council's.
   */
  readonly termYears?: number;
  /**
   * Whether the seats take turns, some up at each regular election; absent
   * where the statute does not say, and the seats take turns.
   */
  readonly staggered?: boolean;
  /**
   * Whether every seat is elected by the whole town; absent where the
   * statute does not say, and the method stays the national estimate.
   */
  readonly atLarge?: boolean;
  /** When the class votes, where its statute sets it; else its state's timing. */
  readonly timing?: MunicipalElectionTiming;
  readonly chief: {
    readonly title: string;
    readonly directlyElected: boolean;
    /** Absent where the statute's term for the chief was not read. */
    readonly termYears?: number;
  };
  readonly citation: string;
  readonly url: string;
}

type FormRow = Omit<MunicipalClassForm, "stateUsps" | "municipalClass">;

const STATES = forms.states as unknown as Readonly<
  Record<string, Readonly<Record<string, FormRow>>>
>;

/**
 * The class the listing names a municipality by ("borough" for "BOROUGH OF
 * BLOOMSBURY"), or null where its name gives none.
 */
export function municipalClassOf(unit: GovernmentUnitIdentity): string | null {
  const words = unit.name.trim().split(/\s+/);
  return words[1] === "OF" && words[0] ? words[0].toLowerCase() : null;
}

/**
 * The form its state's law gives a municipality of its class, or null for a
 * government that is not a municipality or a class not yet read.
 */
export function municipalClassForm(
  unit: GovernmentUnitIdentity,
): MunicipalClassForm | null {
  if (unit.unitType !== "municipality" || !unit.functionalActive) return null;
  const municipalClass = municipalClassOf(unit);
  const row = municipalClass
    ? STATES[unit.stateUsps]?.[municipalClass]
    : undefined;
  return row && municipalClass
    ? { ...row, stateUsps: unit.stateUsps, municipalClass }
    : null;
}

/** The record a value taken from the class form cites. */
export function municipalClassSource(form: MunicipalClassForm): string {
  return `The ${form.stateUsps} ${form.municipalClass} form in state law: ${form.citation} (${form.url})`;
}

/**
 * When the municipality governing a place votes, where its class's form sets
 * it; undefined where the place has no such municipality or the form is
 * silent, and the state's timing applies.
 */
export function municipalClassTimingForPlace(
  placeGeoid: string,
): MunicipalElectionTiming | undefined {
  for (const unit of governmentUnitsForPlace(placeGeoid)) {
    const timing = municipalClassForm(unit)?.timing;
    if (timing) return timing;
  }
  return undefined;
}
