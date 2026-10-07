import { stateJurisdictionForKey } from "../life-places";
import { legislatureForState } from "../legislature-game-profile";
import { scheduleFutureDueItem } from "../future-transitions";
import { regularSessionYearForWorld } from "../legislative-procedure-world";
import { stateSessionLegalLimit } from "./statute-effective-date";
import type {
  FutureDueItem,
  FutureTransitionHandlerResult,
  EntityId,
  IsoDate,
  World,
} from "../types";
import { recordWorldEvent } from "../world";

export const LEGISLATIVE_SESSION_COMPLETION_TRANSITION =
  "legislation:session-completion-v1" as const;
const VERSION = "legislative-session-completion/v1";

interface SavedCompletion {
  readonly version: typeof VERSION;
  readonly jurisdictionKey: string;
  readonly sessionYear: number;
  readonly sessionOrdinal: number;
  readonly sessionId: string;
  readonly date: IsoDate;
  readonly chamberKeys: readonly string[];
  readonly estimate: string | null;
}

export type LegislativeSessionCompletionCause =
  "legal-limit" | "sine-die-vote" | "scope-disposed";

export interface RecordLegislativeSessionCompletionInput {
  readonly jurisdictionId: EntityId;
  readonly jurisdictionKey: string;
  readonly chamberKeys: readonly string[];
  readonly sessionId: string;
  readonly date: IsoDate;
  readonly cause: LegislativeSessionCompletionCause;
  readonly estimate?: string | null;
}

/**
 * Queue the next sourced regular-session end using the legislature's own
 * per-state session row. Missing end dates stay missing; an explicit estimate
 * row carries its provenance into the saved due item and completed event.
 */
export function scheduleNextLegislativeSessionCompletion(
  world: World,
  jurisdictionKey: string,
): World {
  if (!/^US-[A-Z]{2}$/.test(jurisdictionKey)) return world;
  const jurisdiction = stateJurisdictionForKey(jurisdictionKey);
  const legislature = legislatureForState(jurisdictionKey);
  if (!jurisdiction || !legislature || !world.jurisdictions[jurisdiction.id])
    return world;

  const currentYear = Number(world.currentDate.slice(0, 4));
  // A regular state session is annual, odd-year or even-year. Search only for
  // the next such session; the saved queue rearms itself after it fires.
  for (let year = currentYear; year <= currentYear + 4; year++) {
    const limit = stateSessionLegalLimit(jurisdictionKey, year);
    if (!limit || !regularSessionYearForWorld(world, jurisdiction.id, year))
      continue;

    const date = limit.date;
    if (date <= world.currentDate) continue;
    const sessionOrdinal = 1;
    const sessionId = `${jurisdictionKey}:regular:${year}:${sessionOrdinal}`;
    const chamberKeys = legislature.chambers.map(
      (chamber) => chamber.chamberKey,
    );
    const saved: SavedCompletion = {
      version: VERSION,
      jurisdictionKey,
      sessionYear: year,
      sessionOrdinal,
      sessionId,
      date,
      chamberKeys,
      estimate: limit.estimate,
    };
    const stableKey = `${VERSION}:${sessionId}:${date}`;
    if (
      world.history.futureDueItems.some((item) => item.stableKey === stableKey)
    )
      return world;
    return scheduleFutureDueItem(world, {
      stableKey,
      dueAt: date,
      transitionKey: LEGISLATIVE_SESSION_COMPLETION_TRANSITION,
      entityIds: [jurisdiction.id],
      jurisdictionId: jurisdiction.id,
      provenance: { kind: "authored", note: JSON.stringify(saved) },
    });
  }
  return world;
}

function savedCompletion(item: FutureDueItem): SavedCompletion {
  if (
    item.transitionKey !== LEGISLATIVE_SESSION_COMPLETION_TRANSITION ||
    item.provenance.kind !== "authored"
  )
    throw new Error("Not a legislative session completion due item.");
  const saved = JSON.parse(item.provenance.note) as SavedCompletion;
  const jurisdiction = stateJurisdictionForKey(saved.jurisdictionKey);
  if (
    saved.version !== VERSION ||
    !jurisdiction ||
    item.jurisdictionId !== jurisdiction.id ||
    item.dueAt !== saved.date ||
    saved.sessionId !==
      `${saved.jurisdictionKey}:regular:${saved.sessionYear}:${saved.sessionOrdinal}` ||
    !Number.isInteger(saved.sessionOrdinal) ||
    saved.sessionOrdinal < 1 ||
    saved.chamberKeys.length < 1 ||
    !saved.chamberKeys.every((key) => typeof key === "string" && key.length > 0)
  )
    throw new Error("Invalid saved legislative session completion.");
  return saved;
}

/** One historical writer for dated legal-limit session completion events. */
export function legislativeSessionCompletionHandler(
  world: World,
  item: FutureDueItem,
): FutureTransitionHandlerResult {
  const saved = savedCompletion(item);
  if (world.currentDate !== saved.date)
    throw new Error("Session completion requires its exact due date.");
  const jurisdiction = stateJurisdictionForKey(saved.jurisdictionKey)!;
  const next = recordLegislativeSessionCompletion(world, {
    jurisdictionId: jurisdiction.id,
    jurisdictionKey: saved.jurisdictionKey,
    chamberKeys: saved.chamberKeys,
    sessionId: saved.sessionId,
    date: saved.date,
    cause: "legal-limit",
    estimate: saved.estimate,
  });
  const event = next.history.events.find((candidate) =>
    candidate.tags.includes(`session-id:${saved.sessionId}`),
  );
  const rearmed = scheduleNextLegislativeSessionCompletion(
    next,
    saved.jurisdictionKey,
  );
  return {
    world: rearmed,
    status: "resolved",
    reasonKey: null,
    context: null,
    outcomeEventId: event?.id ?? null,
  };
}

/** The single historical writer for every recorded session-completion cause. */
export function recordLegislativeSessionCompletion(
  world: World,
  input: RecordLegislativeSessionCompletionInput,
): World {
  if (input.date !== world.currentDate)
    throw new Error("Session completion must be recorded on its actual date.");
  if (
    !world.jurisdictions[input.jurisdictionId] ||
    input.jurisdictionKey.length === 0 ||
    input.sessionId.length === 0 ||
    input.chamberKeys.length === 0 ||
    input.chamberKeys.some((key) => key.length === 0)
  )
    throw new Error(
      "Session completion requires its saved jurisdiction and session.",
    );
  if (input.estimate && input.cause !== "legal-limit")
    throw new Error(
      "Only a legal-limit completion may carry estimated-date provenance.",
    );
  if (
    world.history.events.some(
      (event) =>
        event.type === "legislation.session-completed" &&
        event.tags.includes(`session-id:${input.sessionId}`),
    )
  )
    return world;
  const stableKey = `event:${VERSION}:${input.sessionId}`;
  return recordWorldEvent(world, {
    stableKey,
    type: "legislation.session-completed",
    occurredAt: input.date,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [input.jurisdictionId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      "legislation",
      "legislation.session-completed",
      `session-jurisdiction:${input.jurisdictionKey}`,
      `session-id:${input.sessionId}`,
      `session-date:${input.date}`,
      `session-cause:${input.cause}`,
      ...input.chamberKeys.map((key) => `session-chamber:${key}`),
      ...(input.estimate ? [`session-date-estimate:${input.estimate}`] : []),
    ],
    summary: `The legislative session ${input.sessionId} completed.`,
    context: {
      location: {
        jurisdictionId: input.jurisdictionId,
        label:
          world.jurisdictions[input.jurisdictionId]?.name ??
          input.jurisdictionKey,
        setting: null,
      },
      socialContext: `Session ${input.sessionId}; chambers ${input.chamberKeys.join(", ")}; cause ${input.cause}.`,
      pressure: input.estimate ?? null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}
