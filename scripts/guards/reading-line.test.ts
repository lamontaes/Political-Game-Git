import { describe, expect, it } from "vitest";
import { ownerDecisionsSection, readingLineProblem } from "./reading-line.mjs";

const line =
  "Read: OWNER-DECISIONS (Oct 28), DECISION-REGISTER, prior-rulings/words.md, LAW; searched: talk box";

describe("the reading line", () => {
  it("passes a body with no section, an empty one, or one that says none", () => {
    expect(
      readingLineProblem("Pool item: x\n\n**Removed.** Nothing."),
    ).toBeNull();
    expect(
      readingLineProblem("**OWNER DECISIONS NEEDED.** None.\n\n🤖 Generated"),
    ).toBeNull();
    expect(
      readingLineProblem(
        "**OWNER DECISIONS NEEDED.** None. This is a setting only the owner can change.",
      ),
    ).toBeNull();
    expect(
      readingLineProblem("## OWNER DECISIONS NEEDED\n\n- none\n\n## Next"),
    ).toBeNull();
  });

  it("fails a question without the reading line", () => {
    expect(
      readingLineProblem(
        "**OWNER DECISIONS NEEDED.** Should the talk box show Leave? SG-x.\n\n**Removed.** Nothing.",
      ),
    ).toMatch(/no reading line/);
    expect(
      readingLineProblem(
        "## OWNER DECISIONS NEEDED\n\n- Should X? \n\n## Notes\n" + line,
      ),
    ).toMatch(/no reading line/);
  });

  it("passes a question that ends with the reading line", () => {
    expect(
      readingLineProblem(
        `**OWNER DECISIONS NEEDED.** Should the talk box show Leave? SG-x. ${line}\n\n**Removed.** Nothing.`,
      ),
    ).toBeNull();
    expect(
      readingLineProblem(
        `## OWNER DECISIONS NEEDED\n\n- Should X?\n  ${line}\n`,
      ),
    ).toBeNull();
  });

  it("reads only the section, up to the next one", () => {
    expect(
      ownerDecisionsSection(
        "**OWNER DECISIONS NEEDED.** A?\nB\n\n**Removed.** C",
      ),
    ).toBe("A?\nB");
  });
});
