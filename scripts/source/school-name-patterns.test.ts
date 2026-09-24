import { describe, expect, it } from "vitest";

import COMMITTED from "../../src/simulation/school-name-patterns.json" with { type: "json" };
import { measureSchoolNamePatterns } from "./school-name-patterns";

describe("the measured school-name counts", () => {
  it("are what the script measures from the shipped directory", () => {
    expect(COMMITTED).toStrictEqual(
      JSON.parse(JSON.stringify(measureSchoolNamePatterns())),
    );
  }, 120_000);
});
