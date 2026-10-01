import { simulationMinutesBetween } from "../simulation/dates";
import { stateOfJurisdiction } from "../simulation/press/outlets";
import { recordEventKnowledge } from "../simulation/records";
import { advanceWorldMinutes } from "../simulation/time-work";
import type {
  EntityId,
  FutureTransitionHandlerRegistry,
  World,
} from "../simulation/types";
import { projectNewsArticle } from "./news-front-page";

/** PLACEHOLDER(wave2): focused attention to one published report. */
export const TRANSIT_REPORT_READ_MINUTES = 10;

/**
 * A headline is public, but seeing it in a read-only projection does not add
 * knowledge to the controlled person's history. Only an explicit read can.
 */
export function unreadTransitDecisionReportIds(
  world: World,
): ReadonlySet<EntityId> {
  if (world.control.kind !== "person") return new Set();
  const personId = world.control.personId;
  const person = world.people[personId];
  if (!person) return new Set();
  const homeState = stateOfJurisdiction(world, person.homeJurisdictionId);
  if (!homeState) return new Set();
  if (
    world.history.personDeaths.some(
      (death) =>
        death.personId === personId && death.diedAt <= world.currentDate,
    )
  )
    return new Set();
  const known = new Set(
    world.history.knowledge
      .filter(
        (row) =>
          row.personId === personId && row.learnedAt <= world.currentDate,
      )
      .map((row) => row.eventId),
  );
  const reports = new Map(
    world.history.events
      .filter(
        (event) =>
          event.type === "transit.government-decision-reported" &&
          event.visibility === "public" &&
          event.occurredAt <= world.currentDate &&
          event.recordedAt <= world.currentDate &&
          stateOfJurisdiction(world, event.jurisdictionId) === homeState &&
          !known.has(event.id),
      )
      .map((event) => [event.id, event] as const),
  );
  return new Set(
    (world.history.publications ?? [])
      .filter(
        (publication) =>
          publication.correctsPublicationId === null &&
          publication.publishedAt <= world.currentDate &&
          publication.recordedAt <= world.currentDate &&
          reports.has(publication.sourceEventId) &&
          stateOfJurisdiction(world, publication.jurisdictionId) === homeState,
      )
      .map((publication) => publication.id),
  );
}

export interface TransitReportReadResult {
  readonly world: World;
  readonly completed: boolean;
  readonly outcome: string;
}

/** Complete the existing News article read on the shared, interruptible clock. */
export function readTransitDecisionReport(
  world: World,
  publicationId: EntityId,
  handlers: FutureTransitionHandlerRegistry,
): TransitReportReadResult {
  if (
    world.control.kind !== "person" ||
    !unreadTransitDecisionReportIds(world).has(publicationId)
  )
    return {
      world,
      completed: false,
      outcome: "This report is not available for a new reading.",
    };
  const personId = world.control.personId;
  const advanced = advanceWorldMinutes(
    world,
    TRANSIT_REPORT_READ_MINUTES,
    handlers,
  );
  const elapsed = simulationMinutesBetween(
    world.currentMoment,
    advanced.currentMoment,
  );
  if (elapsed < TRANSIT_REPORT_READ_MINUTES)
    return {
      world: advanced,
      completed: false,
      outcome:
        elapsed === 0
          ? "A commitment stopped you before you could read the report."
          : `You stopped after ${elapsed} minutes without finishing the report.`,
    };
  if (
    advanced.control.kind !== "person" ||
    advanced.control.personId !== personId ||
    !unreadTransitDecisionReportIds(advanced).has(publicationId)
  )
    return {
      world: advanced,
      completed: false,
      outcome: "The report could not be completed after time passed.",
    };
  const article = projectNewsArticle(advanced, publicationId);
  const event = article
    ? advanced.history.events.find((row) => row.id === article.sourceEventId)
    : null;
  if (!article || !event)
    return {
      world: advanced,
      completed: false,
      outcome: "The published report is no longer available.",
    };
  const next = recordEventKnowledge(advanced, {
    stableKey: `transit:decision-report-read:${personId}:${publicationId}`,
    personId,
    eventId: event.id,
    learnedAt: advanced.currentDate,
    believedSummary: article.body,
    accuracy: article.body === event.summary ? "accurate" : "unknown",
    confidence: "high",
    source: {
      kind: "public-record",
      reference: `publication:${publicationId}`,
    },
  });
  return {
    world: next,
    completed: true,
    outcome: "You read the published transit funding report.",
  };
}
