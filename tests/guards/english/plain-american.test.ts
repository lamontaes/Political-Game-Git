import { describe, expect, it } from "vitest";

import lineRules from "../../../data/english/line-rules.json" with { type: "json" };

// Rule 107, the third words reader's ten planted lines (Nov 14): each one must
// be refused by the check, and the lines an American says must not be.
const refusing = [
  "plain-american-spelling-and-phrasing",
  "plain-american-no-jargon",
];
const patterns = (id: string): RegExp[] => {
  const rule = lineRules.rules.find((entry) => entry.id === id);
  if (!rule || rule.test.kind !== "patterns")
    throw new Error(`${id} has no patterns`);
  return rule.test.patterns.map((pattern) => new RegExp(pattern, "i"));
};
const refused = (line: string): boolean =>
  refusing.some((id) => patterns(id).some((pattern) => pattern.test(line)));

const PLANTED = [
  "She's not best pleased about the levy going up two mills.",
  "He's been in hospital since Tuesday.",
  "Cheers for that, mate.",
  "Right, then. Let's crack on with the vote.",
  "The ad valorem assessment was promulgated pursuant to the ordinance.",
  "I reckon the whole scheme is rubbish.",
  "We must secure the appropriation before the fiscal year lapses, colleagues.",
  "Shall we say half nine at the hall?",
  "I've got my nan staying at the weekend.",
  "I'll pop round on Saturday, then.",
];
const SPARED = [
  "I cut your property taxes.",
  "The phone rang.",
  "Take care of yourself.",
  "She worked at the mill for twelve years.",
  "He is the running mate.",
  "It's on the mayor's desk.",
  "We'll talk it over on the weekend.",
];

describe("rule 107: plain American talk", () => {
  it("refuses each of the ten planted lines", () => {
    expect(PLANTED.filter((line) => !refused(line))).toEqual([]);
  });
  it("leaves the plain lines alone", () => {
    expect(SPARED.filter((line) => refused(line))).toEqual([]);
  });
  it("warns only, and pulls nothing, for the stiff group", () => {
    const stiff = lineRules.rules.find(
      (entry) => entry.id === "plain-american-reads-stiff",
    );
    expect(stiff?.status).toBe("sample");
  });
});
