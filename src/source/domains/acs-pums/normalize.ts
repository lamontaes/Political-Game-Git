/**
 * PUMS cells into sourced values.
 *
 * This is the module the ACS audit's three findings land in, and each is fixed
 * by consulting the dictionary rather than by widening a hard-coded list:
 *
 *  - a variable is numeric because the dictionary declares its type `N`, not
 *    because its name is one of eleven the compiler happened to know;
 *  - a blank cell becomes NOT_APPLICABLE carrying the Census Bureau's own
 *    reason ("N/A (less than 15 years old)"), never `0` and never `""`;
 *  - a negative income is KNOWN, because the dictionary declares a loss range
 *    for it. Treating every `-1` as missing turns a real loss into a gap.
 *
 * A value the dictionary labels as suppressed becomes SUPPRESSED with that
 * label as the provider flag — the provider holds the number and withheld it,
 * which is a different fact from nobody knowing it.
 */

import { known, notApplicable, suppressed, unknown } from "../../core/index";
import type { DelimitedRow, Evidence } from "../../core/index";
import type { PumsDictionary } from "./dictionary";
import { isSuppressionRange, rangeFor } from "./dictionary";
import type { PumsValue } from "./types";

/** Read one cell into the state the dictionary implies for it. */
export function readPumsCell(
  dictionary: PumsDictionary,
  variableName: string,
  raw: string,
  artifactId: string,
  line: number,
  asOf: string,
): PumsValue {
  const evidence: Evidence = {
    artifactId,
    locator: { kind: "delimited-row", artifactId, line, column: variableName },
  };

  const variable = dictionary.get(variableName);
  if (!variable) {
    return unknown(
      `The 2023 PUMS data dictionary declares no variable "${variableName}", so what this cell means is not established.`,
      [evidence],
    );
  }

  const range = rangeFor(variable, raw);

  if (raw === "") {
    return range
      ? notApplicable([evidence], `${variable.name}: ${range.label}`)
      : unknown(
          `${variable.name} is blank and the dictionary declares no not-applicable fill for it, so why the cell is empty is not established.`,
          [evidence],
        );
  }

  if (range && isSuppressionRange(range)) {
    return suppressed([evidence], `${variable.name}=${raw}: ${range.label}`);
  }

  if (variable.dataType === "N") {
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      return unknown(
        `${variable.name} is declared numeric but reads "${raw}", which is not a number.`,
        [evidence],
      );
    }
    return known(value, [evidence], "FINAL", asOf);
  }

  return known(raw, [evidence], "FINAL", asOf);
}

/** Read a whole row into the declared variable projection. */
export function readPumsRow(
  dictionary: PumsDictionary,
  header: readonly string[],
  row: DelimitedRow,
  projection: readonly string[],
  artifactId: string,
  asOf: string,
): Readonly<Record<string, PumsValue>> {
  const values: Record<string, PumsValue> = {};
  for (const name of projection) {
    const index = header.indexOf(name);
    const raw = index === -1 ? "" : (row.fields[index] ?? "");
    values[name] = readPumsCell(
      dictionary,
      name,
      raw,
      artifactId,
      row.line,
      asOf,
    );
  }
  return values;
}
