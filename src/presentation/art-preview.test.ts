import { describe, expect, it } from "vitest";

import {
  ART_PREVIEW_LABEL,
  ART_PREVIEW_UNAVAILABLE_LABEL,
  artPreviewBanner,
  artPreviewIsShowingCandidateArt,
  artPreviewMode,
  candidatePreviewAllowed,
  previewDatabaseName,
} from "./art-preview";
import { PRIVATE_CANDIDATE_ART_AVAILABLE } from "./private-candidate-manifests";

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
    expect(artPreviewBanner("candidate-review")).toBe(
      PRIVATE_CANDIDATE_ART_AVAILABLE
        ? ART_PREVIEW_LABEL
        : ART_PREVIEW_UNAVAILABLE_LABEL,
    );
  });

  /*
   * The banner used to say "unreleased candidate art" whether or not any was
   * there. The owner-private bank is in no checkout a machine can make, so in
   * every runner and every public clone the game drew production art under a
   * sentence claiming otherwise.
   *
   * These two cases are written to hold in BOTH kinds of checkout rather than
   * skipped in one, because a skip here would be a test that stops existing in
   * exactly the checkout where the defect was.
   */
  it("says the bank is missing rather than claiming art it does not have", () => {
    expect(artPreviewIsShowingCandidateArt("production")).toBe(false);
    expect(artPreviewIsShowingCandidateArt("candidate-review")).toBe(
      PRIVATE_CANDIDATE_ART_AVAILABLE,
    );
    if (PRIVATE_CANDIDATE_ART_AVAILABLE) {
      expect(artPreviewBanner("candidate-review")).toBe(ART_PREVIEW_LABEL);
      return;
    }
    expect(artPreviewBanner("candidate-review")).toBe(
      ART_PREVIEW_UNAVAILABLE_LABEL,
    );
  });

  it("never claims candidate art while the bank is absent", () => {
    const banner = artPreviewBanner("candidate-review") ?? "";
    if (artPreviewIsShowingCandidateArt("candidate-review")) return;
    expect(banner).not.toContain("unreleased candidate art");
    expect(banner).toContain("not in this checkout");
  });
});
