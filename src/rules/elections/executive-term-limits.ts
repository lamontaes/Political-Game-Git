import { addDays, type IsoDate } from "../offices/calendar";
import type { ExecutiveTermLimit } from "../../simulation/nationwide-world/executive-term-limits";
import type { DatedTermInOffice } from "../../simulation/nationwide-world/prior-terms";
import { ELECTION_PARAMETERS } from "./parameters";
function consecutiveRunBefore(
  terms: readonly DatedTermInOffice[],
  termStartsAt: IsoDate,
): number {
  // stopgapId: "SG-P14-elections-partial-term-count"
  const earlier = terms
    .filter((term) => term.startsAt < termStartsAt)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  let run = 0;
  let nextStart = termStartsAt;
  for (let index = earlier.length - 1; index >= 0; index -= 1) {
    const term = earlier[index]!;
    if (
      term.endsAt !== null &&
      addDays(term.endsAt, ELECTION_PARAMETERS.consecutiveGapDays.value) <
        nextStart
    )
      break;
    run += 1;
    nextStart = term.startsAt;
  }
  return run;
}

export function checkExecutiveTermLimit(
  limit: ExecutiveTermLimit | null,
  all: readonly DatedTermInOffice[],
  input: {
    readonly stateUsps: string;

    readonly termStartsAt: IsoDate;
  },
): {
  limit: ExecutiveTermLimit;
  consecutiveTerms: number;
  lifetimeTerms: number;
  barredReason: "consecutive" | "lifetime" | null;
} | null {
  if (!limit) return null;
  const counted =
    limit.enactment && !limit.enactment.countsPriorService
      ? all.filter((term) => term.startsAt >= limit.enactment!.operativeAt)
      : all;
  const lookbackFrom =
    limit.limit?.lookbackYears != null
      ? addDays(
          input.termStartsAt,
          -Math.round(
            limit.limit.lookbackYears * ELECTION_PARAMETERS.yearDays.value,
          ),
        )
      : null;
  const consecutiveTerms = consecutiveRunBefore(counted, input.termStartsAt);
  const lifetimeTerms = counted.filter(
    (term) =>
      term.startsAt < input.termStartsAt &&
      (lookbackFrom === null || term.startsAt >= lookbackFrom),
  ).length;
  const rule = limit.limit;
  let barredReason: "consecutive" | "lifetime" | null = null;
  if (
    rule?.maxConsecutiveTerms != null &&
    consecutiveTerms >= rule.maxConsecutiveTerms
  )
    barredReason = "consecutive";
  else if (
    rule?.maxLifetimeTerms != null &&
    lifetimeTerms >= rule.maxLifetimeTerms
  )
    barredReason = "lifetime";
  return { limit, consecutiveTerms, lifetimeTerms, barredReason };
}
