// The filing browser check's rule-label phase must fail when the rows or the
// controls data are missing, not pass with no assertions.
import { describe, expect, it } from "vitest";
import controls from "./data/controls.json" with { type: "json" };
import { checkRuleLabels } from "./filing-rule-labels.mjs";

const words = Object.values(controls.filing.rules) as string[];

describe("the filing counter's rule labels", () => {
  it("pass when every row reads as a rule name from the controls data", () => {
    expect(() => checkRuleLabels(words.slice(0, 2), controls)).not.toThrow();
  });
  it("fail when the counter shows no rule rows", () => {
    expect(() => checkRuleLabels([], controls)).toThrow(/no rule rows/);
  });
  it("fail when the controls data is missing or has no rules", () => {
    expect(() => checkRuleLabels([words[0]!], null)).toThrow(/no filing rule/);
    expect(() =>
      checkRuleLabels([words[0]!], { filing: { rules: {} } }),
    ).toThrow(/no filing rule/);
  });
  it("fail on a rule's id, in any case", () => {
    expect(() => checkRuleLabels(["MINIMUM-AGE"], controls)).toThrow(
      /reads as its id/,
    );
    expect(() => checkRuleLabels(["minimum-age"], controls)).toThrow(
      /reads as its id/,
    );
  });
  it("fail on a label the controls data doesn't name", () => {
    expect(() => checkRuleLabels(["Deadline twice"], controls)).toThrow(
      /not a rule name/,
    );
  });
});
