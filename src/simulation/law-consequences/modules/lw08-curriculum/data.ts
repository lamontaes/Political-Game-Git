import type { LawConsequenceRow } from "../../../law-consequence-types";

export const CURRICULUM_STANDARDS_QUESTION =
  "us-policy-positions:education.state-curriculum-standards";

/** Records statutory coverage of a real enrollment, never a taught lesson. */
export const CURRICULUM_STANDARDS_ROW: LawConsequenceRow = {
  id: "education:recorded-curriculum-application",
  kind: "curriculum-application",
  when: "effective",
  who: {
    selector: "recorded-active-school-enrollment",
    predicates: [],
  },
  what: "record-curriculum-application",
  decision: { op: "term", key: "law-answer", type: "boolean" },
  conditions: [
    {
      capability: "curriculum-coverage-category",
      parameters: { termKey: "coverage" },
    },
  ],
  lag: {
    days: 0,
    sourceIds: ["src/simulation/policy-pack-us-policy-positions.ts"],
  },
  onRepeal: "preserve-completed",
  evidence: {
    sourceIds: [
      "src/simulation/policy-pack-us-policy-positions.ts",
      "docs/codex/assignments/law-batches.md",
      "data/research/outcome-web/links.json#curriculum-standards-to-math",
    ],
    population:
      "People in dated active school enrollments at saved public-school organization types whose school location resolves to the operative state.",
    scope:
      "Records the saved enacted coverage categories against an active enrollment only when a category exactly matches its saved program kind.",
    why: "A state curriculum-standard law applies to covered school enrollment in its jurisdiction; this record does not claim that a lesson was taught or that a pupil learned material.",
    uncertainty:
      "A missing enacted coverage category, school-location join, or exact program-kind match produces no application. The existing curriculum-to-math link is marked about-zero and is not used as a learning effect.",
  },
};
