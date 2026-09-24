import type { TermCommencementRule } from "./state-executive-term-rules";

/**
 * When a governor's term begins, for the states whose commencement clause was
 * read in official text.
 *
 * Source: the same nationwide calendar as the election cycles, answering
 * `when-each-state-elects-its-governor` (see
 * `chief-executive-election-cycles.ts`). Its "Term begins" column marks most
 * states "UNVERIFIED candidate"; only the rows below carry direct official
 * text for the start, so only these are taken. Every other state keeps the
 * game's disclosed first-Monday-of-January profile until its clause is read.
 * Washington and the District are verified rules of their own and are not
 * listed.
 */

export interface ChiefExecutiveCommencement {
  readonly stateUsps: string;
  readonly commencement: TermCommencementRule;
  /** The provision the calendar cites. Never a player sentence. */
  readonly citation: string;
}

export const CHIEF_EXECUTIVE_COMMENCEMENTS: readonly ChiefExecutiveCommencement[] =
  [
    {
      stateUsps: "AK",
      // First Monday in December following the election.
      commencement: {
        kind: "december-weekday-of-election-year",
        ordinal: 1,
        weekday: 1,
        offsetDays: 0,
      },
      citation: "Alaska Const. art. III, §4",
    },
    {
      stateUsps: "DE",
      // Third Tuesday in January.
      commencement: {
        kind: "january-weekday-following-election",
        ordinal: 3,
        weekday: 2,
        offsetDays: 0,
      },
      citation: "Del. Const. art. III, §5",
    },
    {
      stateUsps: "FL",
      // First Tuesday after the first Monday in January.
      commencement: {
        kind: "january-weekday-following-election",
        ordinal: 1,
        weekday: 1,
        offsetDays: 1,
      },
      citation: "Fla. Const. art. IV, §5(a)",
    },
    {
      stateUsps: "HI",
      // First Monday in December following the election.
      commencement: {
        kind: "december-weekday-of-election-year",
        ordinal: 1,
        weekday: 1,
        offsetDays: 0,
      },
      citation: "Haw. Const. art. V, §1",
    },
    {
      stateUsps: "LA",
      // Second Monday in January.
      commencement: {
        kind: "january-weekday-following-election",
        ordinal: 2,
        weekday: 1,
        offsetDays: 0,
      },
      citation: "La. Const. art. IV, §3",
    },
    {
      stateUsps: "ME",
      // First Wednesday after the first Tuesday in January.
      commencement: {
        kind: "january-weekday-following-election",
        ordinal: 1,
        weekday: 2,
        offsetDays: 1,
      },
      citation: "Me. Const. art. V, pt. first, §2",
    },
    {
      stateUsps: "VA",
      // Saturday after the second Wednesday in January.
      commencement: {
        kind: "january-weekday-following-election",
        ordinal: 2,
        weekday: 3,
        offsetDays: 3,
      },
      citation: "Va. Const. art. V, §1",
    },
  ];

export function chiefExecutiveCommencement(
  stateUsps: string,
): ChiefExecutiveCommencement | null {
  return (
    CHIEF_EXECUTIVE_COMMENCEMENTS.find((row) => row.stateUsps === stateUsps) ??
    null
  );
}
