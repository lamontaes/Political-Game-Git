import type {
  MetricScope,
  MetricReferencePeriod,
} from "../../simulation/types";
export function sameMetricScope(
  left: MetricScope,
  right: MetricScope,
): boolean {
  return (
    left.jurisdictionId === right.jurisdictionId &&
    left.segmentKey === right.segmentKey
  );
}

export function sameReferencePeriod(
  left: MetricReferencePeriod,
  right: MetricReferencePeriod,
): boolean {
  return left.kind === "point"
    ? right.kind === "point" && left.at === right.at
    : right.kind === "interval" &&
        left.startsAt === right.startsAt &&
        left.endsAt === right.endsAt;
}
