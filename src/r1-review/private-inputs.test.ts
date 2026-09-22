import fs from "node:fs";
import { it, expect } from "vitest";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY } from "../presentation/engine-people29-review";
const required = process.env.MODULAR_REQUIRE_PRIVATE === "1";
it("reports private coverage explicitly and refuses missing required inputs", () => {
  const files = [
    "art/manifest/character_candidate_modular45_registry.json",
    "art/authoring/modular47-r1/calibration.json",
    "art/authoring/modular47-r1/pose-pack.json",
  ];
  const missing = files.filter((path) => !fs.existsSync(path));
  console.info(
    JSON.stringify({
      privateCoverage: missing.length ? "NOT_TESTED" : "INPUTS_PRESENT",
      required,
      missing,
    }),
  );
  if (required) {
    expect(missing).toEqual([]);
    expect(
      ENGINE_PEOPLE29_CHARACTER_LIBRARY.catalogGeneration,
    ).toBeGreaterThanOrEqual(16);
  }
});
