import { describe, expect, it } from "vitest";
import { nationalMedianWageSentence } from "./career-wage";

describe("national median wage", () => {
  it("reads as dollars with separators, not bare table text", () => {
    expect(
      nationalMedianWageSentence({
        hourlyMedian: "17.03",
        annualMedian: "35410",
      }),
    ).toContain("a median of $17.03 an hour, $35,410 a year.");
  });

  it("says unlisted for a value the table did not publish", () => {
    const sentence = nationalMedianWageSentence({
      hourlyMedian: "#",
      annualMedian: null,
    });
    expect(sentence).toContain(
      "a median of an unlisted amount an hour, an unlisted amount a year.",
    );
    expect(sentence).not.toContain("#");
  });
});
