import { describe, expect, it } from "vitest";
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
