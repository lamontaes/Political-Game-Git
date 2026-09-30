import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { townLeases } from "./town-rent";
import {
  EVICTION_CASE_TAG_PREFIX,
  PUBLIC_EVICTION_ORDER_TYPE,
} from "./eviction-order-record";

const LEASE_TAG_PREFIX = "town-rent-v1:lease:";
const RESOLUTIONS = new Set([
  "housing.evicted",
  "housing.eviction-dismissed",
  "housing.eviction-settled",
  "housing.moved-out-before-hearing",
]);

export interface EvictionCaseObservation {
  readonly caseId: EntityId;
  readonly leaseFlowId: string;
  readonly filedOn: IsoDate;
  readonly filing: HistoricalEvent;
  readonly lease:
    | {
        readonly state: "observed";
        readonly householdId: EntityId;
        readonly dwellingId: EntityId;
        readonly townId: EntityId;
      }
    | { readonly state: "unavailable"; readonly reason: string };
  readonly resolution:
    | { readonly state: "open" }
    | { readonly state: "resolved"; readonly event: HistoricalEvent };
  readonly publicCourtRecord:
    | { readonly state: "unavailable" }
    | { readonly state: "observed"; readonly eventId: EntityId };
}

/** HELD pure proof-reader contract: serial filings are distinct cases. Missing
 * lease/court observations remain explicit. No rate, outcome, destination,
 * follow-up completeness or causal effect is inferred by this projection. */
export function evictionCaseObservations(
  world: World,
  onDate: IsoDate = world.currentDate,
): readonly EvictionCaseObservation[] {
  const leases = new Map<string, ReturnType<typeof townLeases>[number]>(
    townLeases(world, onDate).map((lease) => [lease.flow.id, lease]),
  );
  const rows: EvictionCaseObservation[] = [];
  const open = new Map<string, number>();
  const publicRecords = new Map<string, EntityId>();
  for (const event of world.history.events) {
    if (event.occurredAt > onDate || event.recordedAt > onDate) continue;
    if (event.type === PUBLIC_EVICTION_ORDER_TYPE) {
      const caseTag = event.tags.find((tag) =>
        tag.startsWith(EVICTION_CASE_TAG_PREFIX),
      );
      if (caseTag)
        publicRecords.set(
          caseTag.slice(EVICTION_CASE_TAG_PREFIX.length),
          event.id,
        );
      continue;
    }
    const leaseTag = event.tags.find((tag) => tag.startsWith(LEASE_TAG_PREFIX));
    if (!leaseTag) continue;
    const flowId = leaseTag.slice(LEASE_TAG_PREFIX.length);
    if (event.type === "housing.eviction-filed") {
      const lease = leases.get(flowId);
      open.set(flowId, rows.length);
      rows.push({
        caseId: event.id,
        leaseFlowId: flowId,
        filedOn: event.occurredAt,
        filing: event,
        lease: lease
          ? {
              state: "observed",
              householdId: lease.householdId,
              dwellingId: lease.dwellingId,
              townId: lease.town,
            }
          : {
              state: "unavailable",
              reason:
                "No recorded lease links this filing to a dwelling and household.",
            },
        resolution: { state: "open" },
        publicCourtRecord: { state: "unavailable" },
      });
    } else if (RESOLUTIONS.has(event.type)) {
      const index = open.get(flowId);
      if (index === undefined) continue;
      rows[index] = {
        ...rows[index]!,
        resolution: { state: "resolved", event },
      };
      open.delete(flowId);
    }
  }
  return rows.map((row) => {
    const eventId = publicRecords.get(row.caseId);
    return eventId
      ? { ...row, publicCourtRecord: { state: "observed" as const, eventId } }
      : row;
  });
}
