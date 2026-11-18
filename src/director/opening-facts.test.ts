import { describe, expect, it } from "vitest";
import { addressPoints } from "./opening-facts";

/**
 * The address's points come from the outline's own record of them, with the
 * sentences as a view of that record (owner, Oct 28: every screen, scene and
 * talk is a view of the same records). A speech that only asks to be held to
 * a question names no stance in its sentence; the plan that chose the point
 * holds the President's side.
 */
describe("the address's points", () => {
  const question = "us-federal-positions:education.forgive-student-loans";
  const asked = {
    text: "You know what I'm asking for on forgiving student loans, so hold me to it.",
    facts: ["asked", "asked-about"],
    values: { asked: "yes", "asked-about": "forgiving student loans" },
    sourceRecordIds: [
      "official:term:seat:US:president:2025-01-20",
      `question:${question}`,
    ],
  };

  it("reads a point's side from the plan when the sentence only asks", () => {
    const points = addressPoints({
      address: { sentences: [asked] },
      points: [{ question, side: "against" }],
    });
    expect(points).toHaveLength(1);
    const [point] = points;
    expect(point!.kind).toBe("policy");
    expect(point!.question).toBe(question);
    expect(point!.stance).toBe("against");
    expect(point!.about.length).toBeGreaterThan(0);
    expect(point!.to.length).toBeGreaterThan(0);
    expect(point!.sourceRecordIds).toContain(`question:${question}`);
  });

  it("keeps the sentence's own stance where it states one", () => {
    const stated = {
      ...asked,
      facts: ["stance-for"],
      values: { about: "forgiving student loans", to: "forgive student loans" },
    };
    const [point] = addressPoints({
      address: { sentences: [stated] },
      points: [{ question, side: "against" }],
    });
    expect(point!.stance).toBe("for");
    expect(point!.about).toBe("forgiving student loans");
  });

  it("makes no point of a plan the speech never named", () => {
    const points = addressPoints({
      address: { sentences: [] },
      points: [{ question, side: "for" }],
    });
    // A planned point no sentence names was never said aloud.
    expect(points).toEqual([]);
  });
});
