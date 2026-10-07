import { describe, expect, it } from "vitest";

import { makeIsoDate } from "../dates";
import { resolveFutureDueItemsThrough } from "../future-transitions";
import { stateJurisdictionForKey } from "../life-places";
import { createFutureTransitionHandlerRegistry } from "../future-transition-registry";
import { createWorld } from "../world";
import { scheduleNationwideStateBillSeasons } from "./governing-calendar";
import {
  LEGISLATIVE_SESSION_COMPLETION_TRANSITION,
  legislativeSessionCompletionHandler,
  recordLegislativeSessionCompletion,
  scheduleNextLegislativeSessionCompletion,
} from "./legislative-session-completion";
import { sessionClosesOn } from "./session-adjournments";
import { legislatureForState } from "../legislature-game-profile";
import { stateSessionLegalLimit } from "./statute-effective-date";

describe("dated legislative session completion", () => {
  it("uses statutory legal limits and marks regional fallback dates as estimates", () => {
    expect(stateSessionLegalLimit("US-KY", 2026)).toMatchObject({
      date: "2026-04-15",
      estimate: null,
    });
    const mississippi = stateSessionLegalLimit("US-MS", 2026);
    expect(mississippi?.estimate).toContain("ESTIMATED FROM SIMILAR STATES");
    expect(mississippi?.estimate).toContain("south Census region");
    expect(stateSessionLegalLimit("US-DC", 2026)).toMatchObject({
      date: expect.any(String),
      estimate: expect.stringContaining("SIMILAR STATES"),
    });
  });

  it("is scheduled from the ordinary state bill-season producer", () => {
    const jurisdiction = stateJurisdictionForKey("US-KY")!;
    const start = createWorld({
      seed: "legislative-session-completion-calendar-integration",
      currentDate: makeIsoDate("2026-01-01"),
      jurisdictions: [jurisdiction],
      people: [],
    });
    const queued = scheduleNationwideStateBillSeasons(start, ["KY"]);
    expect(
      queued.history.futureDueItems.some(
        (item) =>
          item.transitionKey === LEGISLATIVE_SESSION_COMPLETION_TRANSITION &&
          item.jurisdictionId === jurisdiction.id &&
          item.dueAt === "2026-04-15",
      ),
    ).toBe(true);
  });

  it("records the saved jurisdiction, chambers, date and legal-limit cause", () => {
    const jurisdiction = stateJurisdictionForKey("US-KY")!;
    const start = createWorld({
      seed: "legislative-session-completion",
      currentDate: makeIsoDate("2026-01-01"),
      jurisdictions: [jurisdiction],
      people: [],
    });
    const queued = scheduleNextLegislativeSessionCompletion(start, "US-KY");
    const due = queued.history.futureDueItems.find(
      (item) =>
        item.transitionKey === LEGISLATIVE_SESSION_COMPLETION_TRANSITION,
    )!;

    expect(due.dueAt).toBe("2026-04-15");
    const handlers = createFutureTransitionHandlerRegistry([
      [
        LEGISLATIVE_SESSION_COMPLETION_TRANSITION,
        legislativeSessionCompletionHandler,
      ],
    ]);
    const completed = resolveFutureDueItemsThrough(queued, due.dueAt, handlers);
    const event = completed.history.events.find((candidate) =>
      candidate.tags.includes("legislation.session-completed"),
    )!;

    expect(event.type).toBe("legislation.session-completed");
    expect(event.jurisdictionId).toBe(jurisdiction.id);
    expect(event.occurredAt).toBe("2026-04-15");
    expect(event.tags).toContain("session-id:US-KY:regular:2026:1");
    expect(event.tags).toContain("session-cause:legal-limit");
    expect(event.tags).toContain("session-chamber:house");
    expect(event.tags).toContain("session-chamber:senate");
    expect(
      sessionClosesOn(completed, legislatureForState("US-KY")!, 2026),
    ).toBe("2026-04-15");
    expect(
      completed.history.futureDueItems.some(
        (item) =>
          item.transitionKey === LEGISLATIVE_SESSION_COMPLETION_TRANSITION &&
          item.dueAt > due.dueAt,
      ),
    ).toBe(true);
  });

  it("uses the same completion writer for a passed sine-die motion and disposed call scope", () => {
    const jurisdiction = stateJurisdictionForKey("US-KY")!;
    const start = createWorld({
      seed: "legislative-session-completion-causes",
      currentDate: makeIsoDate("2026-04-10"),
      jurisdictions: [jurisdiction],
      people: [],
    });

    const sineDie = recordLegislativeSessionCompletion(start, {
      jurisdictionId: jurisdiction.id,
      jurisdictionKey: "US-KY",
      chamberKeys: ["house", "senate"],
      sessionId: "US-KY:regular:2026:1",
      date: makeIsoDate("2026-04-10"),
      cause: "sine-die-vote",
    });
    const sineDieEvent = sineDie.history.events.find((event) =>
      event.tags.includes("session-cause:sine-die-vote"),
    );
    expect(sineDieEvent?.occurredAt).toBe("2026-04-10");
    expect(sineDieEvent?.tags).toContain("session-chamber:house");
    expect(sineDieEvent?.tags).toContain("session-chamber:senate");

    const scopeDisposed = recordLegislativeSessionCompletion(start, {
      jurisdictionId: jurisdiction.id,
      jurisdictionKey: "US-KY",
      chamberKeys: ["house", "senate"],
      sessionId: "US-KY:special:2026:1",
      date: makeIsoDate("2026-04-10"),
      cause: "scope-disposed",
    });
    const scopeDisposedEvent = scopeDisposed.history.events.find((event) =>
      event.tags.includes("session-cause:scope-disposed"),
    );
    expect(scopeDisposedEvent?.tags).toContain(
      "session-id:US-KY:special:2026:1",
    );
  });
});
