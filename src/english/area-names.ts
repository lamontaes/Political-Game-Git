/**
 * The spoken names of the term read's areas (`data/english/area-names.json`):
 * one noun phrase that reads after "about" or "on". An area with no name here
 * is not offered as a subject of a speech.
 */
import data from "../../data/english/area-names.json" with { type: "json" };

const NAMES = data.names as Readonly<Record<string, string>>;

/** The area as a noun phrase ("our schools"), or null when it has no spoken name. */
export function areaName(area: string): string | null {
  return NAMES[area] ?? null;
}

const MEASURES = (
  data as unknown as {
    measures: Readonly<Record<string, { said: string; share: boolean }>>;
  }
).measures;

/** A term-read measure as a speech names it ("rents here"), and whether it is a share said by where it stood; null when it has no words. */
export function measureWords(
  measure: string,
): { readonly said: string; readonly share: boolean } | null {
  return MEASURES[measure] ?? null;
}
