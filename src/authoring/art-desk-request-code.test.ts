import { describe, expect, it } from "vitest";
import { codedGenerationPrompt } from "./art-desk-request-code";
import type { AssetRequest } from "./asset-request";

describe("request prompt aliases", () => {
  it("prefixes the exact copied text, includes the revision and forbids lettering", () => {
    const prompt = codedGenerationPrompt(
      { requestVersion: 6 } as AssetRequest,
      "A01",
      "x".repeat(967),
    );
    expect(prompt.startsWith("A01-R6.")).toBe(true);
    expect(prompt).toContain("Tracking only; no lettering.");
    expect(prompt.length).toBeLessThanOrEqual(1024);
  });
});
