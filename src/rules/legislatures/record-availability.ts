import type { EntityId, IsoDate } from "../../simulation/types";
export function legislationEntityAvailableAt(
  record: { readonly sequence: number } | null,
  id: EntityId,
  asOfDate: string,
  sequenceExclusive: number,
): boolean {
  if (!record || record.sequence >= sequenceExclusive) return false;
  const dated = record as unknown as {
    readonly introducedAt?: IsoDate;
    readonly occurredAt?: IsoDate;
    readonly referredAt?: IsoDate;
    readonly actedAt?: IsoDate;
    readonly offeredAt?: IsoDate;
    readonly takenAt?: IsoDate;
    readonly resolvedAt?: IsoDate;
  };
  const date =
    dated.introducedAt ??
    dated.occurredAt ??
    dated.referredAt ??
    dated.actedAt ??
    dated.offeredAt ??
    dated.takenAt ??
    dated.resolvedAt;
  return date === undefined ? false : date <= asOfDate;
}
