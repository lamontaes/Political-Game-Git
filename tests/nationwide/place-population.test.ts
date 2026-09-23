import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { renderPlacePopulationModule } from "../../scripts/world/compile-place-population";

const ROOT = resolve(import.meta.dirname, "../..");

describe("town populations", () => {
  it("are exactly what the compiler writes from the verified Census file", () => {
    const csv = readFileSync(
      resolve(
        ROOT,
        "docs/research/chatgpt-answers/2026-09-23-cto-handoff-2230/DATA-Census-Vintage-2025-places-50-states-DC.csv",
      ),
    );
    const committed = readFileSync(
      resolve(
        ROOT,
        "src/simulation/nationwide-world/place-population.generated.ts",
      ),
      "utf-8",
    );
    expect(renderPlacePopulationModule(csv)).toBe(committed);
  });
});
