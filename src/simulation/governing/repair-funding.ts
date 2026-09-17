import { stateJurisdictionForKey } from "../life-places";
import { crisisRepairFundingRequests } from "../crisis/notices";
import type { RepairFundingRequest } from "../crisis/notices";
import type { EntityId, World } from "../types";
import { recordWorldEvent } from "../world";
import type { PublicProgramAppropriationRecord } from "../types";

/**
 * What a disaster declaration means for public money.
 *
 * CRISIS records the damage, the aid decision and the repair work still to do;
 * it never carries a money figure. GOVERNING answers the only question that is
 * about money: is there spending authority this government has actually
 * adopted that could pay for any of it? When there is, the office is asked to
 * commit it through the ordinary program decision. When there is not — and
 * that includes a refused federal request — the refusal is recorded against
 * the request, naming what is missing, and no money moves.
 *
 * Repair units are physical work and stay CRISIS's. Nothing here converts them
 * into dollars or invents a cost.
 *
 * This module reads the program records directly rather than through the
 * governing writers: the clock calls it on every date boundary, and a module
 * the clock imports must not reach back into the office surface, which imports
 * the clock. The office's own matters open on their ordinary schedule.
 */

export const REPAIR_FUNDING_VERSION = "repair-funding/v1";
export const REPAIR_FUNDING_EVENT = "governing.repair-funding" as const;

function consumedKey(request: RepairFundingRequest): string {
  return `${REPAIR_FUNDING_VERSION}:${request.requestKey}|governing|${REPAIR_FUNDING_VERSION}`;
}

/** The highest request sequence this world has already answered. */
export function lastRepairFundingSequence(world: World): number {
  let sequence = -1;
  for (const event of world.history.events) {
    if (event.type !== REPAIR_FUNDING_EVENT) continue;
    const tag = event.tags.find((candidate) =>
      candidate.startsWith("request-sequence:"),
    );
    const value = tag ? Number(tag.slice("request-sequence:".length)) : NaN;
    if (Number.isFinite(value) && value > sequence) sequence = value;
  }
  return sequence;
}

/** Everything recorded against repair funding, newest first. */
export function repairFundingAnswers(world: World): readonly {
  readonly eventId: EntityId;
  readonly requestKey: string;
  readonly covered: boolean;
}[] {
  return world.history.events
    .filter((event) => event.type === REPAIR_FUNDING_EVENT)
    .map((event) => ({
      eventId: event.id,
      requestKey:
        event.tags
          .find((tag) => tag.startsWith("request:"))
          ?.slice("request:".length) ?? "",
      covered: event.tags.includes("funding:available"),
    }))
    .reverse();
}

/**
 * Answers each request once. Safe to call from the clock and from a reader:
 * a request already answered at this version writes nothing.
 */
export function applyRepairFundingRequests(
  world: World,
  requests: readonly RepairFundingRequest[],
): World {
  let next = world;
  for (const request of [...requests].sort((a, b) => a.sequence - b.sequence)) {
    const stableKey = consumedKey(request);
    if (next.history.events.some((event) => event.stableKey === stableKey))
      continue;
    const stateJurisdictionId =
      stateJurisdictionForKey(`US-${request.stateUsps}`)?.id ?? null;
    const jurisdictionIds = [
      ...new Set([
        ...request.jurisdictionIds,
        ...(stateJurisdictionId ? [stateJurisdictionId] : []),
      ]),
    ];
    const appropriations = (next.history.publicProgramRecords ?? []).filter(
      (record): record is PublicProgramAppropriationRecord =>
        record.kind === "appropriation" &&
        jurisdictionIds.includes(record.jurisdictionId) &&
        record.availableFrom <= next.currentDate &&
        record.availableThrough >= next.currentDate,
    );
    const covered = appropriations.length > 0;
    const summary = covered
      ? `${request.stateUsps}: ${request.remainingRepairUnits} of ${request.totalRepairUnits} units of repair work remain after the ${request.decisionStage.replace(/-/g, " ")}. This government has ${appropriations.length} adopted appropriation${appropriations.length === 1 ? "" : "s"} it could still commit; what it pays for is the office's decision.`
      : `${request.stateUsps}: ${request.remainingRepairUnits} of ${request.totalRepairUnits} units of repair work remain after the ${request.decisionStage.replace(/-/g, " ")}${request.federallyAssisted ? "" : ", which brought no federal assistance"}. No adopted appropriation covers it, so no public money moves. An appropriation has to be enacted before this office can commit anything.`;
    next = recordWorldEvent(next, {
      stableKey,
      type: REPAIR_FUNDING_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: stateJurisdictionId,
      involvedEntityIds: [
        ...new Set([
          request.episodeId,
          ...appropriations.map((record) => record.accountOrganizationId),
        ]),
      ].sort(),
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        REPAIR_FUNDING_VERSION,
        `request:${request.requestKey}`,
        `request-sequence:${request.sequence}`,
        `crisis-decision:${request.decisionRecordId}`,
        `stage:${request.decisionStage}`,
        covered ? "funding:available" : "funding:none-adopted",
        ...(request.federallyAssisted ? ["aid:federally-assisted"] : []),
      ],
      summary,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  }
  return next;
}

/** Called by the clock: answers every repair request this world has not. */
export function applyCrisisRepairFunding(world: World): World {
  const requests = crisisRepairFundingRequests(world, {
    afterSequence: lastRepairFundingSequence(world),
  });
  return requests.length ? applyRepairFundingRequests(world, requests) : world;
}
