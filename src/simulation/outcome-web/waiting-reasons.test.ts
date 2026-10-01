import { afterEach, describe, expect, it, vi } from "vitest";
import { OUTCOME_LINKS, outcomeLinkStatus } from ".";

/*
 * The effects map is done only when every link either runs in the game or
 * says, in its own row, why it does not. A link that is neither built nor a
 * sourced about-zero must carry a one-line reason in `notes`.
 */

describe("every link that does not run says why", () => {
  it("each link not built and not about-zero carries a reason in notes", () => {
    for (const link of OUTCOME_LINKS) {
      const status = outcomeLinkStatus(link);
      if (status === "built" || status === "about-zero") continue;
      const notes = (link as { notes?: unknown }).notes;
      expect(typeof notes, `${link.key} (${status})`).toBe("string");
      expect((notes as string).length, link.key).toBeGreaterThan(20);
    }
  });
});

import web from "../../../data/research/outcome-web/links.json";

afterEach(() => {
  vi.doUnmock("../../../data/research/outcome-web/links.json");
  vi.resetModules();
});

describe("A163 outcome-link admission at module load", () => {
  it("loads all declared statuses and preserves research confidence", async () => {
    const loaded = await import("./index");
    expect(loaded.OUTCOME_LINKS).toHaveLength(web.links.length);
    for (const evidence of ["provisional", "to-confirm"] as const) {
      const original = web.links.find((row) => row.evidence === evidence)!;
      expect(original).toBeDefined();
      expect(
        loaded.OUTCOME_LINKS.find((row) => row.key === original.key)?.evidence,
      ).toBe(evidence);
    }
  });

  it("rejects a null coefficient without its missing-input reason before a status query", async () => {
    const original = web.links.find((row) => row.size === null)!;
    expect(original).toBeDefined();
    vi.doMock("../../../data/research/outcome-web/links.json", () => ({
      default: {
        ...web,
        links: web.links.map((row) =>
          row.key === original.key ? { ...row, unsupportedReason: null } : row,
        ),
      },
    }));
    await expect(import("./index")).rejects.toThrow(
      `Outcome link has an invalid blocker reason: ${original.key}`,
    );
  });

  it("rejects a stored status that contradicts the existing classifier at load", async () => {
    const original = web.links.find((row) => row.status === "built")!;
    expect(original).toBeDefined();
    vi.doMock("../../../data/research/outcome-web/links.json", () => ({
      default: {
        ...web,
        links: web.links.map((row) =>
          row.key === original.key
            ? { ...row, status: "cause-not-recorded" }
            : row,
        ),
      },
    }));
    await expect(import("./index")).rejects.toThrow(
      `Outcome link status disagrees with its existing readers: ${original.key}`,
    );
  });
});
