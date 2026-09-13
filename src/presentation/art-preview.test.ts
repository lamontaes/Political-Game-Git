import { describe, expect, it } from "vitest";

import {
  ART_PREVIEW_LABEL,
  artPreviewBanner,
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

  it("turns the labelled internal-art-review package on without DEV", () => {
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

  it("is silent in production mode", () => {
    expect(artPreviewBanner("production")).toBeNull();
    expect(artPreviewBanner("candidate-review")).toBe(ART_PREVIEW_LABEL);
  });
});
