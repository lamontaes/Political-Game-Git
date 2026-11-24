import { describe, expect, it } from "vitest";
import catalog from "./data/legislature/bill-catalog.json" with { type: "json" };
import {
  TERM_AREAS,
  areasAnswered,
  questionAnswersArea,
  topicsAnsweringArea,
} from "./term-read";

const topicNames = new Set(
  (
    catalog as unknown as { subjects: { topics: { name: string }[] }[] }
  ).subjects.flatMap((subject) => subject.topics.map((topic) => topic.name)),
);

describe("the catalog topics whose questions answer each area of the term read", () => {
  it("names a row for every area, and every topic it names is in the bill catalog", () => {
    for (const area of TERM_AREAS) {
      expect(
        topicsAnsweringArea(area).length,
        `${area}: no row`,
      ).toBeGreaterThan(0);
      for (const topic of topicsAnsweringArea(area))
        expect(topicNames.has(topic), `${area}: ${topic}`).toBe(true);
    }
  });

  it("has a question that answers jobs, pay and prices, so a hurt address and a campaign can speak on them", () => {
    expect(
      questionAnswersArea(
        "us-policy-positions:labor-workforce.raise-minimum-wage",
        "pay",
      ),
    ).toBe(true);
    expect(
      areasAnswered("us-policy-positions:labor-workforce.raise-minimum-wage"),
    ).toEqual(expect.arrayContaining(["jobs", "pay"]));
    expect(
      areasAnswered(
        "us-policy-positions:fiscal.exempt-groceries-from-sales-tax",
      ),
    ).toEqual(expect.arrayContaining(["prices"]));
    // A question outside every area's topics answers none.
    expect(areasAnswered("us-policy-positions:not-a-question")).toEqual([]);
  });

  it("lets a budget line answer an area, so a mayor with a few questions and the town's lines can answer pay", () => {
    expect(questionAnswersArea("budget-line:welfareAndMedicaid", "pay")).toBe(
      true,
    );
    expect(areasAnswered("budget-line:welfareAndMedicaid")).toEqual(
      expect.arrayContaining(["health", "pay"]),
    );
    expect(areasAnswered("budget-line:police")).toEqual(["crime"]);
    expect(areasAnswered("budget-line:interest")).toEqual([]);
  });

  it("keeps a question's area to its catalog topic, never its whole subject", () => {
    // Restoring the vote after a sentence is justice, and no answer to crime
    // (the words lead, Nov 12): a question answers an area only through its topic.
    for (const question of [
      "us-policy-positions:labor-workforce.raise-minimum-wage",
    ])
      expect(questionAnswersArea(question, "crime")).toBe(false);
  });
});
