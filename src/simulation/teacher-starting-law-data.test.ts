import { expect, it } from "vitest";
import startingLaw from "../../data/research/laws/starting-law-2026/index";

const questionKey =
  "us-policy-positions:education.raise-teacher-minimum-salary" as const;

const supportedFloors = {
  "US-AL": 4_855_200,
  "US-AR": 5_000_000,
  "US-GA": 4_171_700,
  "US-IA": 5_000_000,
  "US-IL": 4_354_300,
  "US-ME": 4_000_000,
  "US-MO": 4_000_000,
  "US-NC": 4_800_000,
  "US-NJ": 1_850_000,
  "US-NM": 5_000_000,
  "US-OH": 3_027_500,
  "US-OK": 4_160_100,
  "US-PA": 1_850_000,
  "US-SC": 5_050_000,
  "US-TN": 5_000_000,
  "US-TX": 3_396_000,
  "US-WV": 4_301_500,
} as const;

const answers = startingLaw.questions[questionKey].answers as Record<
  string,
  {
    readonly answer?: string;
    readonly cite?: string;
    readonly source?: string;
    readonly lawTerms?: readonly {
      readonly questionKey: string;
      readonly key: string;
      readonly value: number;
      readonly unit: string;
    }[];
  }
>;

it("keeps sourced teacher salary floors limited to verified schedule rows", () => {
  for (const [state, value] of Object.entries(supportedFloors)) {
    const row = answers[state]!;
    expect(row.answer, state).toBe("yes");
    expect(row.source, state).toMatch(/^https:\/\//);
    expect(row.cite, state).toBeTruthy();
    expect(row.lawTerms, state).toContainEqual({
      questionKey,
      key: "floor",
      value,
      unit: "minor",
    });
  }

  const saved = Object.entries(answers)
    .filter(([, row]) => row.lawTerms?.some((term) => term.key === "floor"))
    .map(([state]) => state)
    .sort();
  expect(saved).toEqual(Object.keys(supportedFloors).sort());
});
