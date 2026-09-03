/**
 * The PUMS data dictionary, read as data.
 *
 * The dictionary is the reason this domain can tell a loss from a gap. For each
 * variable it declares a data type and a set of value ranges with the Census
 * Bureau's own labels, and those labels carry the semantics:
 *
 *   SEMP  N  bbbbbb..bbbbbb  "N/A (less than 15 years old)"
 *   SEMP  N  -10000..-4      "Loss of $4 to $10000 (Rounded and bottom-coded)"
 *   JWMNP N  888..888        "Suppressed for data year 2023 for select PUMAs"
 *
 * #65 hard-coded a list of eleven numeric variables and treated every `-1` as
 * missing. Both are fixed here by reading the dictionary instead: numeric type
 * comes from the declared type, a blank maps to the N/A the dictionary names,
 * and a negative income is a loss because the dictionary says it is one.
 */

import { parseDelimited } from "../../core/index";

export type PumsDataType = "C" | "N";

export interface PumsValueRange {
  /** Lower bound as published; `bbb…` means the blank/not-applicable fill. */
  readonly low: string;
  readonly high: string;
  /** The Census Bureau's own label for the range. */
  readonly label: string;
}

export interface PumsVariable {
  readonly name: string;
  readonly dataType: PumsDataType;
  readonly length: number;
  readonly description: string;
  readonly ranges: readonly PumsValueRange[];
}

export type PumsDictionary = ReadonlyMap<string, PumsVariable>;

/** True for the b-fill the dictionary uses to mean "not applicable". */
export function isNotApplicableFill(value: string): boolean {
  return value.length > 0 && /^b+$/.test(value);
}

/** The range a raw cell falls in, or null when the dictionary declares none. */
export function rangeFor(
  variable: PumsVariable,
  raw: string,
): PumsValueRange | null {
  for (const range of variable.ranges) {
    if (isNotApplicableFill(range.low)) {
      if (raw === "") return range;
      continue;
    }
    if (variable.dataType === "N") {
      const value = Number(raw);
      const low = Number(range.low);
      const high = Number(range.high);
      if (
        Number.isFinite(value) &&
        Number.isFinite(low) &&
        Number.isFinite(high) &&
        value >= low &&
        value <= high
      ) {
        return range;
      }
    } else if (raw >= range.low && raw <= range.high) {
      return range;
    }
  }
  return null;
}

/** A range the Census Bureau labels as a suppression. */
export function isSuppressionRange(range: PumsValueRange): boolean {
  return /suppress/i.test(range.label);
}

/**
 * Parse the dictionary CSV.
 *
 * Rows are `NAME,<var>,<type>,<len>,"description"` and
 * `VAL,<var>,<type>,<len>,<low>,<high>,"label"`. Labels are quoted and contain
 * commas, so this goes through the RFC 4180 reader rather than a comma split.
 */
export function parsePumsDictionary(bytes: Uint8Array): PumsDictionary {
  const parsed = parseDelimited(bytes, { delimiter: ",", trimFields: true });
  const variables = new Map<string, {
    name: string;
    dataType: PumsDataType;
    length: number;
    description: string;
    ranges: PumsValueRange[];
  }>();

  for (const row of parsed.rows) {
    const kind = row.fields[0];
    const name = row.fields[1];
    if (!name) continue;

    if (kind === "NAME") {
      variables.set(name, {
        name,
        dataType: (row.fields[2] === "N" ? "N" : "C") as PumsDataType,
        length: Number(row.fields[3] ?? "0"),
        description: row.fields[4] ?? "",
        ranges: [],
      });
      continue;
    }
    if (kind === "VAL") {
      const variable = variables.get(name);
      if (!variable) continue;
      variable.ranges.push({
        low: row.fields[4] ?? "",
        high: row.fields[5] ?? "",
        label: row.fields[6] ?? "",
      });
    }
  }

  return new Map(
    [...variables].map(([name, variable]) => [
      name,
      {
        name: variable.name,
        dataType: variable.dataType,
        length: variable.length,
        description: variable.description,
        ranges: variable.ranges,
      } satisfies PumsVariable,
    ]),
  );
}
