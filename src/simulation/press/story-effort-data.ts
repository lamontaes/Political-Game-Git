import type { StoryFamily } from "./records";

/** CTO 2026-10-02 01:45 admitted estimates, not measured individual durations. */
export const STORY_EFFORT_ESTIMATES = {
  label: "Estimated newsroom reporting effort",
  workdaysPerWeek: 5,
  minutes: {
    brief: 120,
    "meeting-government": 240,
    standard: 480,
    feature: 1440,
    investigation: 4800,
  },
  experience: [
    { belowYears: 2, multiplier: 1.3 },
    { belowYears: 10, multiplier: 1 },
    { belowYears: Infinity, multiplier: 0.8 },
  ],
  // Authored classifications of the existing saved lead families.
  families: {
    "scheduled-beat": "meeting-government",
    "press-request": "standard",
    records: "feature",
    allegation: "investigation",
    "economy-release": "standard",
    "campaign-activity": "standard",
    "breaking-crisis": "brief",
    "follow-up": "brief",
  } satisfies Record<
    StoryFamily,
    "brief" | "meeting-government" | "standard" | "feature" | "investigation"
  >,
} as const;
