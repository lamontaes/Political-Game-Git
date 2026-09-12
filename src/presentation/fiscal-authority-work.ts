import { createWorkItem, type EntityId, type World } from "../simulation";
import {
  currentTaxPermission,
  queryFiscalAuthority,
  type DatedFiscalAuthorityResult,
  type FiscalAuthorityAction,
  type PortableFiscalAuthorityRecord,
} from "../fiscal-authority/query";
import { resolveActiveMemberSeat } from "./legislative-member-seat";

export interface FiscalAuthorityWorkRequest {
  readonly personId: EntityId;
  readonly stateUsps: string;
  readonly level: string;
  readonly instrument: string;
  readonly asOfDate: string;
  readonly action: FiscalAuthorityAction;
}

export type FiscalAuthorityWorkResult =
  | {
      readonly kind: "opened";
      readonly world: World;
      readonly workItemId: EntityId;
      readonly authority: DatedFiscalAuthorityResult;
      readonly action: "propose-authority-change";
      readonly notice: string;
    }
  | {
      readonly kind: "refused";
      readonly world: World;
      readonly authority: DatedFiscalAuthorityResult;
      readonly reason: string;
    };

function currentBaselineSummary(
  authority: DatedFiscalAuthorityResult,
  asOfDate: string,
): string {
  if (authority.state === "IN_FORCE") {
    return `Current authority as of ${asOfDate}: ${currentTaxPermission(authority)}. ${authority.record.source.citation}.`;
  }
  if (
    authority.state === "NOT_YET_EFFECTIVE" ||
    authority.state === "NO_LONGER_EFFECTIVE"
  ) {
    return `Current authority as of ${asOfDate}: UNESTABLISHED (${authority.state}). The closest sourced record is ${authority.record.source.citation}.`;
  }
  if (authority.state === "CONFLICTING") {
    return `Current authority as of ${asOfDate}: UNESTABLISHED (CONFLICTING). ${authority.reason}`;
  }
  if (authority.state === "UNESTABLISHED") {
    const nearest = authority.record
      ? ` Nearest sourced record: ${authority.record.source.citation}.`
      : "";
    return `Current authority as of ${asOfDate}: UNESTABLISHED. ${authority.reason}${nearest}`;
  }
  throw new Error("Unhandled fiscal-authority query state.");
}

/**
 * Open legislative analysis work against the current legal baseline.
 *
 * A legislature can study or propose a change. That act is not a current levy,
 * and this consumer never turns it into one. Exercising local authority belongs
 * to a supported current local governing office, not to a state legislative
 * seat, so that route refuses here and can be handed to MUNI's office seam.
 */
export function openFiscalAuthorityWork(
  world: World,
  records: readonly PortableFiscalAuthorityRecord[],
  request: FiscalAuthorityWorkRequest,
): FiscalAuthorityWorkResult {
  const authority = queryFiscalAuthority(records, {
    stateUsps: request.stateUsps,
    level: request.level,
    instrument: request.instrument,
    asOfDate: request.asOfDate,
  });

  if (request.action === "exercise-current-authority") {
    return {
      kind: "refused",
      world,
      authority,
      reason:
        "A state legislative seat may propose a change, but it is not the supported local governing office that exercises this current taxing authority.",
    };
  }

  const seat = resolveActiveMemberSeat(world, request.personId);
  if (seat.kind !== "seated") {
    return { kind: "refused", world, authority, reason: seat.reason };
  }
  if (seat.seat.jurisdictionKey !== `US-${request.stateUsps}`) {
    return {
      kind: "refused",
      world,
      authority,
      reason:
        "The current legislative seat does not govern the state named by the authority query.",
    };
  }
  const stableKey = [
    "fiscal-authority",
    "proposal-analysis",
    request.stateUsps,
    request.level,
    request.instrument,
    request.asOfDate,
  ].join(":");
  const existing = world.history.workItems.find(
    (item) => item.stableKey === stableKey,
  );
  if (existing) {
    return {
      kind: "opened",
      world,
      workItemId: existing.id,
      authority,
      action: "propose-authority-change",
      notice:
        "This is analysis of a proposed authority change. It does not levy a tax, change current law, or forecast revenue.",
    };
  }

  const next = createWorkItem(world, {
    stableKey,
    title: `Analyze proposed change to ${request.instrument}`,
    summary: [
      currentBaselineSummary(authority, request.asOfDate),
      "The work concerns a proposed change only; it does not levy a tax, change current law, or forecast revenue.",
    ].join(" "),
    jurisdictionId: seat.seat.governingJurisdictionId,
    sourceEntityIds: [seat.seat.outcomeEventId],
    focus: {
      kind: "other",
      targetKey: `fiscal-authority:${request.stateUsps}:${request.level}:${request.instrument}`,
      sourceEntityId: seat.seat.outcomeEventId,
    },
    effort: { kind: "authored-duration", requiredMinutes: 60 },
    access: { kind: "office" },
    assignedPersonIds: [request.personId],
    playerRequirement: "action",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });
  const workItem = next.history.workItems.find(
    (item) => item.stableKey === stableKey,
  );
  if (!workItem)
    throw new Error("Fiscal authority Work item was not recorded.");
  return {
    kind: "opened",
    world: next,
    workItemId: workItem.id,
    authority,
    action: "propose-authority-change",
    notice:
      "This is analysis of a proposed authority change. It does not levy a tax, change current law, or forecast revenue.",
  };
}
