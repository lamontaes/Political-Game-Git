import { describe, expect, it } from "vitest";

import {
  artPreviewMode,
  candidatePreviewAllowed,
  previewDatabaseName,
} from "./art-preview";

describe("art preview gating", () => {
  it("cannot be selected from a URL in a production package", () => {
    expect(
      artPreviewMode("?art-preview=candidate", {
        development: false,
        profile: "production",
      }),
    ).toBe("production");
    expect(candidatePreviewAllowed(false, "production")).toBe(false);
  });

  it("follows the development query flag", () => {
    expect(
      artPreviewMode("?art-preview=candidate", {
        development: true,
        profile: "production",
      }),
    ).toBe("candidate-review");
    expect(
      artPreviewMode("", { development: true, profile: "production" }),
    ).toBe("production");
  });

  it("turns the labeled internal-art-review package on without DEV", () => {
    expect(
      artPreviewMode("", {
        development: false,
        profile: "internal-art-review",
      }),
    ).toBe("candidate-review");
    expect(candidatePreviewAllowed(false, "internal-art-review")).toBe(true);
    expect(previewDatabaseName("candidate-review")).toBe(
      "political-life-worlds-art-preview",
    );
    expect(previewDatabaseName("production")).toBe("political-life-worlds");
  });

  it("has no on-screen preview bar (OW-6)", async () => {
    const module: Record<string, unknown> = await import("./art-preview");
    expect(module.artPreviewBanner).toBeUndefined();
    expect(module.ART_PREVIEW_LABEL).toBeUndefined();
  });
});
