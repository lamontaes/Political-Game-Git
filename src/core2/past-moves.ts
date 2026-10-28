/**
 * Where a full person lived in the years before the start (owner, Oct 28,
 * 2026: "simulate to the birth year... general to make the game flow"). One
 * reader for every engine that runs the past by place: the school engine (the
 * district a child attended), the people engine (where partners set up home,
 * where a child was born). It reads the person's own records: their recorded
 * birthplace until their recorded move into the county, then where they live
 * now. Someone with neither lived where they live now (the opening's own
 * locality, as the town's records give it).
 *
 * The move's date is still the opening kin builder's (SG-HIST-moves-from-kin-line);
 * history-past-moves replaces it with the moves engine's run, read here.
 */
import { stopgap } from "./stopgaps";
import type { PersonState } from "./types";

export const MOVED_INTO_COUNTY = "life:moved-into-county";

export interface Residence {
  placeId: string;
  /** The record that says so: the birthplace or move fact, else the person. */
  recordId: string;
}

/** The place a person lived on a date before the start, and the record that places them. */
export function residenceOn(
  person: Readonly<PersonState>,
  date: string,
): Residence {
  const facts = person.pastFacts ?? [];
  const born = facts.find((fact) => fact.kind === "birthplace");
  const bornIn = born?.facts?.placeId;
  if (!born || !bornIn || bornIn === person.placeId)
    return { placeId: person.placeId, recordId: born?.id ?? person.id };
  const moved = facts.find((fact) => fact.kind === MOVED_INTO_COUNTY);
  if (!moved) return { placeId: person.placeId, recordId: person.id };
  stopgap("SG-HIST-moves-from-kin-line");
  return date < moved.date
    ? { placeId: bornIn, recordId: born.id }
    : { placeId: person.placeId, recordId: moved.id };
}
