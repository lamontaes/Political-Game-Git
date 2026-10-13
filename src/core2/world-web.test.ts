/** The economy's read of the outcome web's factor: 1 without the web or for a measure it doesn't keep; the latest month's value over its base otherwise. */
import { describe, expect, it } from "vitest";
import { webFactor } from "./world-web";
import type { CoreAPI } from "./types";

function api(rows: unknown[] | undefined): CoreAPI {
  return {
    state: { modules: new Map(rows ? [["core2-outcome-web-v1", {}]] : []) },
    moduleState: () => ({
      table: () => ({ query: () => rows ?? [] }),
    }),
  } as unknown as CoreAPI;
}

describe("the outcome web's factor on an economy measure", () => {
  it("is 1 when the web isn't running or doesn't keep the measure", () => {
    expect(webFactor(api(undefined), "place", "crime.burglary")).toBe(1);
    expect(webFactor(api([]), "place", "labor.not-a-kept-measure")).toBe(1);
  });

  it("is the latest month's value over its base for a kept measure", () => {
    const rows = [
      {
        month: "2021-02",
        values: { "crime.burglary": 9 },
        bases: { "crime.burglary": 8 },
      },
      {
        month: "2021-03",
        values: { "crime.burglary": 10 },
        bases: { "crime.burglary": 8 },
      },
    ];
    expect(webFactor(api(rows), "place", "crime.burglary")).toBe(10 / 8);
  });
});
