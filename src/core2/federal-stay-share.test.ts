import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { PARAMETERS } from "./parameters";
import {
  CATEGORY_MISMATCH,
  GROUPS,
  parameterRows,
  stayShares,
} from "../../scripts/justice/derive-federal-stay-share";

/**
 * The federal prison's stay share per offense group is derived, never typed
 * (scripts/justice/derive-federal-stay-share.ts): the Bureau of Prisons stock
 * over the Sentencing Commission's admissions times mean sentence. The rows in
 * the parameter table must be exactly what the derivation gives from the two
 * research files, and each must be below the statutory good-time ceiling
 * (54 days a year, 85.2 percent of the sentence, 18 U.S.C. 3624(b)).
 */
const read = (file: string) => JSON.parse(readFileSync(file, "utf8"));

it("the stay-share rows equal what the Bureau and Commission tables give, and sit under the good-time ceiling", () => {
  const shares = stayShares(
    read("data/research/justice/bop-federal-offenses-2026.json"),
    read("data/research/justice/ussc-federal-sentencing-fy2025.json"),
  );
  const rows = parameterRows(shares) as Record<string, { value: number }>;
  expect(Object.keys(rows).length).toBe(Object.keys(GROUPS).length);
  for (const [key, row] of Object.entries(rows)) {
    expect(PARAMETERS[key]?.value, `${key} in the parameter table`).toBe(
      row.value,
    );
    // A group whose two sources count different cases is named in
    // CATEGORY_MISMATCH with the reason; every other group is a stay.
    const name = key.replace("federalStayShare", "");
    if (!(name in CATEGORY_MISMATCH))
      expect(row.value, `${key} is under the ceiling`).toBeLessThan(0.852);
    expect(row.value, `${key} is a share`).toBeGreaterThan(0);
  }
});
