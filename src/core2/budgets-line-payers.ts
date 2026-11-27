// What a law that raised a budget line records (the line additions the law
// reach's host carries, read by the treasury). A leaf module with no imports.

/** A line raised in the budget in force by a law's own amount (a share of the line), as the law-reach engine that raised it records it. */
export interface LineAddition {
  readonly line: string;
  /** The law's policy key. */
  readonly key: string;
  /** The law row that raised the line. */
  readonly lawId: string;
  /** What the law added to the line this fiscal year, in minor units. */
  readonly annualMinor: number;
  /** What the treasury's payment is recorded as (ends in "-paid"). */
  readonly what: string;
}
