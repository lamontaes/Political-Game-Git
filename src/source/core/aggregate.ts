/**
 * Aggregation over sourced values.
 *
 * 13B's sharpest probe: two functions with complementary missing full-time and
 * part-time counts summed to `ft=10, pt=3, total=13` when neither component was
 * complete, because `(ftEmp ?? 0) + (ptEmp ?? 0)` reads an unknown as a zero.
 *
 * The structural answer is that an aggregate is not a number. A summary over a
 * set containing any non-KNOWN member is INCOMPLETE, names every gap, and calls
 * its number `partialValue` — a name no caller can mistake for a total.
 */

import type { Sourced, SourceStateName } from "./value";

/** Which member of the aggregated set a contribution or gap belongs to. */
export interface MemberRef {
  readonly memberId: string;
  readonly label?: string;
}

/** One member's value alongside the reference that names it. */
export interface SourcedMember<T> {
  readonly member: MemberRef;
  readonly value: Sourced<T>;
}

/** A gap: which member is missing, and in what way it is missing. */
export interface AggregateGap {
  readonly member: MemberRef;
  readonly memberState: Exclude<SourceStateName, "KNOWN">;
}

export type Aggregate<T> =
  | {
      readonly state: "COMPLETE";
      readonly value: T;
      readonly contributors: readonly MemberRef[];
    }
  | {
      readonly state: "INCOMPLETE";
      readonly partialValue: T;
      readonly contributors: readonly MemberRef[];
      readonly missing: readonly AggregateGap[];
    };

/**
 * Sum members, refusing to present a total unless every member is KNOWN.
 *
 * An empty set is COMPLETE at zero: nothing is missing, and the sum of no
 * numbers is genuinely zero. That is different from a set whose members are
 * unknown, which is what this type exists to keep distinguishable.
 */
export function sumSourced(
  members: readonly SourcedMember<number>[],
): Aggregate<number> {
  const contributors: MemberRef[] = [];
  const missing: AggregateGap[] = [];
  let total = 0;

  for (const entry of members) {
    if (entry.value.state === "KNOWN") {
      total += entry.value.value;
      contributors.push(entry.member);
    } else {
      missing.push({ member: entry.member, memberState: entry.value.state });
    }
  }

  if (missing.length === 0) {
    return { state: "COMPLETE", value: total, contributors };
  }
  return { state: "INCOMPLETE", partialValue: total, contributors, missing };
}

/** Count members, with the same refusal: an unknown member is not a zero. */
export function countKnown<T>(
  members: readonly SourcedMember<T>[],
): Aggregate<number> {
  return sumSourced(
    members.map((entry) => ({
      member: entry.member,
      value:
        entry.value.state === "KNOWN"
          ? ({
              state: "KNOWN",
              value: 1,
              evidence: entry.value.evidence,
              release: entry.value.release,
              asOf: entry.value.asOf,
            } as Sourced<number>)
          : (entry.value as unknown as Sourced<number>),
    })),
  );
}

/**
 * Reconcile a reported total against an aggregate of its parts.
 *
 * An INCOMPLETE aggregate is not reconcilable against anything, and saying so
 * is the whole point: 13B found a reconciler substituting zero for absent
 * amounts and then reporting agreement.
 */
export type Reconciliation =
  | { readonly outcome: "AGREES"; readonly difference: number }
  | { readonly outcome: "DISAGREES"; readonly difference: number }
  | {
      readonly outcome: "UNRECONCILABLE_INCOMPLETE";
      readonly missing: readonly AggregateGap[];
    };

/** Compare a published total with a computed aggregate, within a tolerance. */
export function reconcile(
  reportedTotal: number,
  parts: Aggregate<number>,
  tolerance: number,
): Reconciliation {
  if (parts.state === "INCOMPLETE") {
    return { outcome: "UNRECONCILABLE_INCOMPLETE", missing: parts.missing };
  }
  const difference = reportedTotal - parts.value;
  return Math.abs(difference) <= tolerance
    ? { outcome: "AGREES", difference }
    : { outcome: "DISAGREES", difference };
}
