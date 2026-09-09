import { describe, it, expect } from "vitest";
import {
  recordEventKnowledge,
  recordWorkStatus,
  recordWorkRole,
  serializeWorld,
  deserializeWorld,
  advanceWorldMinutes,
  createResourcePosition,
  createResourceFlow,
  money,
  addDays,
  resourcePositionAt,
} from "./index";
import {
  requestIncidentResources,
  decideIncidentResourceRequest,
  decideIncidentResponse,
  arrangeIncidentBriefing,
  attendIncidentBriefing,
  deliverIncidentResources,
  incidentResponseView,
  requestIncidentInformation,
  inspectPublishedIncident,
  publishIncidentEvent,
} from "./incident-response";
import type { World } from "./types";
const provenance = {
  kind: "authored" as const,
  note: "Explicit fictional resource fixture.",
};
import { responseFixture } from "./incident-response.fixture";
function followThrough(
  w: World,
  reportId: ReturnType<typeof responseFixture>["reportId"],
  staff: ReturnType<typeof responseFixture>["staff"],
) {
  w = decideIncidentResponse(w, reportId, "commission-report", staff);
  const work = w.history.workItems.at(-1)!;
  expect(
    w.history.knowledge.some(
      (k) =>
        k.personId === staff &&
        k.eventId === reportId &&
        k.source.kind === "told-by",
    ),
  ).toBe(true);
  w = advanceWorldMinutes(w, 30);
  w = arrangeIncidentBriefing(w, work.id);
  w = attendIncidentBriefing(w, w.history.scheduledActivities.at(-1)!.id);
  return w;
}
describe("incident response consumer", () => {
  it("preserves decision, actual work, clock, follow-up and exact save chain", () => {
    const f = responseFixture();
    const before = serializeWorld(f.w);
    incidentResponseView(f.w);
    expect(serializeWorld(f.w)).toBe(before);
    let w = followThrough(deserializeWorld(before), f.reportId, f.staff);
    expect(w.history.workItemStates.at(-1)!.status).toBe("ready-for-review");
    expect(w.history.workItemStates.at(-1)!.completedEffortMinutes).toBe(30);
    expect(w.history.events.at(-1)!.type).toBe("incident.response.follow-up");
    expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(
      serializeWorld(w),
    );
    expect(w.history.resourceTransferOutcomes).toEqual(
      f.w.history.resourceTransferOutcomes,
    );
    expect(w.history.incidents).toEqual(f.w.history.incidents);
    w = createResourcePosition(w, {
      stableKey: "response-funds",
      owner: { kind: "organization", organizationId: f.organizationId },
      openedAt: w.currentDate,
      openingBalance: money(10000, "USD"),
      provenance,
    });
    w = createResourceFlow(w, {
      stableKey: "approved-response-allocation",
      initialStatus: "expected",
      source: { kind: "organization", organizationId: f.organizationId },
      recipient: { kind: "person", personId: f.staff },
      startsAt: addDays(w.currentDate, 1),
      amount: money(2500, "USD"),
      cadenceKind: "custom:one-time",
      basisKind: "custom:incident-response",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: f.jurisdictionId,
      provenance,
    });
    const flow = w.history.resourceFlows.at(-1)!;
    const follow = w.history.events.at(-1)!.id;
    w = requestIncidentResources(w, f.reportId, flow.id);
    const request = w.history.events.at(-1)!.id;
    expect(() => deliverIncidentResources(w, follow, flow.id)).toThrow();
    w = advanceWorldMinutes(w, 1440);
    w = decideIncidentResourceRequest(w, request, true);
    expect(w.history.resourceTransferOutcomes).toEqual(
      f.w.history.resourceTransferOutcomes,
    );
    const unfunded = {
      ...w,
      history: {
        ...w.history,
        resourcePositions: w.history.resourcePositions.filter(
          (p) => p.stableKey !== "response-funds",
        ),
      },
    };
    expect(() => deliverIncidentResources(unfunded, follow, flow.id)).toThrow(
      /Insufficient/,
    );
    const delivered = deliverIncidentResources(w, follow, flow.id);
    expect(
      resourcePositionAt(delivered, flow.source, money(0, "USD").currency)!
        .liquidBalance.minorUnits,
    ).toBe(7500);
    expect(() => deliverIncidentResources(delivered, follow, flow.id)).toThrow(
      /already/,
    );
    expect(serializeWorld(deserializeWorld(serializeWorld(delivered)))).toBe(
      serializeWorld(delivered),
    );
  });
  it("requests do not approve work, allocate money or teach incident truth", () => {
    const f = responseFixture();
    const w = requestIncidentInformation(f.w, f.reportId, f.staff);
    expect(w.history.workItems).toEqual(f.w.history.workItems);
    expect(w.history.resourceFlows).toEqual(f.w.history.resourceFlows);
    expect(
      w.history.knowledge.some(
        (k) => k.personId === f.staff && k.eventId === f.source,
      ),
    ).toBe(false);
  });
  it("refuses unknown reports and citizen authority", () => {
    const f = responseFixture();
    const citizen = {
      ...f.w,
      control: { kind: "person" as const, personId: f.staff },
    };
    expect(() =>
      decideIncidentResponse(
        citizen,
        f.reportId,
        "commission-report",
        f.person,
      ),
    ).toThrow(/not yet known/);
    const informed = recordEventKnowledge(citizen, {
      stableKey: "informed",
      personId: f.staff,
      eventId: f.reportId,
      learnedAt: citizen.currentDate,
      believedSummary: "A report exists.",
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "told-by", sourcePersonId: f.person, claimId: null },
    });
    expect(() =>
      decideIncidentResponse(
        informed,
        f.reportId,
        "commission-report",
        f.person,
      ),
    ).toThrow(/supervisory/);
  });
  it("does not deliver without resources or complete unfinished work", () => {
    const f = responseFixture();
    const w = decideIncidentResponse(
      f.w,
      f.reportId,
      "commission-report",
      f.staff,
    );
    expect(() =>
      arrangeIncidentBriefing(w, w.history.workItems.at(-1)!.id),
    ).toThrow(/completed/);
    expect(() =>
      decideIncidentResponse(w, f.reportId, "commission-report", f.staff),
    ).toThrow();
    const done = followThrough(f.w, f.reportId, f.staff);
    expect(() =>
      deliverIncidentResources(done, done.history.events.at(-1)!.id, f.source),
    ).toThrow(/resource flow/);
  });
  it("keeps private reports out of NEWS and unpublished events unreadable", () => {
    const f = responseFixture();
    let called = false;
    expect(() =>
      publishIncidentEvent(f.w, f.reportId, {
        publishPublicEvent: (w) => {
          called = true;
          return w;
        },
      }),
    ).toThrow(/already-public/);
    expect(called).toBe(false);
    expect(() => inspectPublishedIncident(f.w, f.source)).toThrow(
      /publication/,
    );
  });
  it("deferral records a decision without creating work", () => {
    const f = responseFixture();
    const w = decideIncidentResponse(f.w, f.reportId, "defer", null);
    expect(w.history.events.at(-1)!.type).toBe("incident.response.deferred");
    expect(w.history.workItems).toEqual(f.w.history.workItems);
  });
  it("refuses expired responsibility and wrong-jurisdiction roles", () => {
    const f = responseFixture();
    const role = f.w.history.workRoles.find(
      (r) =>
        r.workRelationshipId ===
        f.w.history.workRelationships.find(
          (x) => x.stableKey === `response-role:${f.person}`,
        )!.id,
    )!;
    const moved = recordWorkRole(f.w, {
      stableKey: "moved-role",
      workRelationshipId: role.workRelationshipId,
      effectiveAt: f.w.currentDate,
      title: role.title,
      occupationClassification: role.occupationClassification,
      locationJurisdictionId: null,
      timeDemand: { ...role.timeDemand, locationJurisdictionId: null },
      provenance,
      supersedesRoleId: role.id,
    });
    expect(() =>
      decideIncidentResponse(moved, f.reportId, "commission-report", f.staff),
    ).toThrow(/jurisdiction/);
    const status = f.w.history.workStatuses.find(
      (x) => x.workRelationshipId === role.workRelationshipId,
    )!;
    const ended = recordWorkStatus(f.w, {
      stableKey: "ended-role",
      workRelationshipId: role.workRelationshipId,
      effectiveAt: f.w.currentDate,
      status: "ended",
      reason: "Test term ended",
      provenance,
      supersedesStatusId: status.id,
    });
    expect(() =>
      decideIncidentResponse(ended, f.reportId, "commission-report", f.staff),
    ).toThrow(/supervisory/);
  });
  it("rejects future report projections and cannot reuse a busy worker", () => {
    const f = responseFixture();
    const future = {
      ...f.w,
      history: {
        ...f.w.history,
        events: f.w.history.events.map((e) =>
          e.id === f.reportId
            ? {
                ...e,
                occurredAt: addDays(f.w.currentDate, 1),
                recordedAt: addDays(f.w.currentDate, 1),
              }
            : e,
        ),
      },
    };
    expect(incidentResponseView(future).reports).toEqual([]);
    expect(() =>
      decideIncidentResponse(future, f.reportId, "commission-report", f.staff),
    ).toThrow(/future/);
    const busy = decideIncidentResponse(
      f.w,
      f.reportId,
      "commission-report",
      f.staff,
    );
    expect(() =>
      decideIncidentResponse(busy, f.reportId, "commission-report", f.staff),
    ).toThrow(/capacity/);
  });
  it("refuses an active allocation with no incident authorization", () => {
    const f = responseFixture();
    let w = followThrough(f.w, f.reportId, f.staff);
    const follow = w.history.events.at(-1)!.id;
    w = createResourceFlow(w, {
      stableKey: "not-response-approved",
      source: { kind: "organization", organizationId: f.organizationId },
      recipient: { kind: "person", personId: f.staff },
      startsAt: w.currentDate,
      amount: money(500, "USD"),
      cadenceKind: "custom:one-time",
      basisKind: "custom:incident-response",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: f.jurisdictionId,
      provenance,
    });
    expect(() =>
      deliverIncidentResources(w, follow, w.history.resourceFlows.at(-1)!.id),
    ).toThrow(/explicit authorization/);
  });

  it("consumes an existing synthetic physical occurrence without deriving personal damage", () => {
    const f = responseFixture(true);
    expect(f.w.history.incidents.at(-1)!.incidentKind).toBe(
      "incident:natural-hazard",
    );
    const w = followThrough(f.w, f.reportId, f.staff);
    expect(w.history.events.at(-1)!.type).toBe("incident.response.follow-up");
    expect(w.history.incidents).toEqual(f.w.history.incidents);
    expect(w.history.effectActivations).toEqual(f.w.history.effectActivations);
    expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(
      serializeWorld(w),
    );
  });
});
