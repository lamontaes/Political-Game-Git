import { describe, expect, it } from "vitest";

import { ANGER_ESTIMATE_PROVENANCE } from "./anger";
import { POLITICAL_VIOLENCE_ESTIMATE } from "./ladder";

describe("pressure anger and ladder values say where they come from", () => {
  for (const [name, table] of [
    ["ladder", POLITICAL_VIOLENCE_ESTIMATE],
    ["anger", ANGER_ESTIMATE_PROVENANCE],
  ] as const)
    it(`the ${name} sizes are marked estimated with a source`, () => {
      expect(table.provenance).toBe("estimated-from-average");
      expect(table.estimated).toBe(true);
      expect(table.estimatedFrom.length).toBeGreaterThan(10);
    });
});
