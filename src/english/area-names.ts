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
