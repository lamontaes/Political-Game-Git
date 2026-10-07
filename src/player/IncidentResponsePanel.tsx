import { useState } from "react";
import { activeWorkRelationshipsAt } from "../simulation/life-queries";
import { workItemState, scheduledActivityState } from "../simulation/time-work";
import {
  incidentResponseView,
  decideIncidentResponse,
  arrangeIncidentBriefing,
  attendIncidentBriefing,
  requestIncidentInformation,
  deliverIncidentResources,
  requestIncidentResources,
  decideIncidentResourceRequest,
  recordKnownIncidentForCurrentOffice,
  publishIncidentEvent,
} from "../simulation/incident-response";
import { executiveIncidentPorts } from "../presentation/executive-entry";
import type { World, EntityId } from "../simulation/types";
import { GameSelect } from "./controls/GameSelect";

/** Feature-local Work panel. The root owner supplies the existing World writer;
 * opening the panel cannot create an incident, role, meeting or publication. */
export function IncidentResponsePanel({
  world,
  onWorldChange,
}: {
  readonly world: World;
  readonly onWorldChange: (world: World) => void;
}) {
  const [message, setMessage] = useState("");
  const [staffId, setStaffId] = useState<EntityId | "">("");
  const view = incidentResponseView(world);
  const actingId =
    world.control.kind === "person" ? world.control.personId : null;
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const ownRoles = actingId
    ? activeWorkRelationshipsAt(world, actingId, cutoff).filter(
        (r) => r.relationship.authority === "directs-others",
      )
    : [];
  const ownOrganizations = new Set(
    ownRoles.map((r) => r.relationship.organizationId),
  );
  const candidates = world.personOrder.filter(
    (id) =>
      id !== actingId &&
      activeWorkRelationshipsAt(world, id, cutoff).some(
        (r) =>
          r.relationship.organizationId !== null &&
          ownOrganizations.has(r.relationship.organizationId),
      ),
  );
  const flows = world.history.resourceFlows.filter(
    (f) =>
      f.source.kind === "organization" &&
      ownOrganizations.has(f.source.organizationId),
  );
  function act(fn: () => World) {
    try {
      const next = fn();
      onWorldChange(next);
      setMessage("recorded");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "action-unavailable");
    }
  }
  return (
    <section data-testid="incident-response">
      {!view.reports.length && !view.awaiting.length && (
        <p data-problem="no-known-reports" />
      )}
      {view.awaiting.map((item) => (
        <article key={item.onsetEventId}>
          <p>{item.summary}</p>
          <button
            type="button"
            onClick={() =>
              act(() =>
                recordKnownIncidentForCurrentOffice(world, item.onsetEventId),
              )
            }
          >
            Continue
          </button>
        </article>
      ))}
      <label aria-label="People">
        <GameSelect
          aria-label="People"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value as EntityId)}
        >
          <option value=""></option>
          {candidates.map((id) => (
            <option key={id} value={id}>
              {world.people[id]!.givenName} {world.people[id]!.familyName}
            </option>
          ))}
        </GameSelect>
      </label>
      {view.publicOnsets.map((onset) => (
        <article key={`public:${onset.id}`}>
          <p>{onset.summary}</p>
          <button
            type="button"
            onClick={() =>
              act(() =>
                publishIncidentEvent(world, onset.id, executiveIncidentPorts()),
              )
            }
          >
            Continue
          </button>
        </article>
      ))}
      {view.reports.map((report) => (
        <article key={report.id}>
          <p>{report.summary}</p>
          <button
            onClick={() =>
              act(() =>
                decideIncidentResponse(
                  world,
                  report.id,
                  "commission-report",
                  staffId || null,
                ),
              )
            }
          >
            Continue
          </button>
          <button
            onClick={() =>
              act(() => decideIncidentResponse(world, report.id, "defer", null))
            }
          >
            Back
          </button>
          <button
            disabled={!staffId}
            onClick={() =>
              act(() =>
                requestIncidentInformation(
                  world,
                  report.id,
                  staffId as EntityId,
                ),
              )
            }
          >
            Continue
          </button>
        </article>
      ))}
      {view.reports.flatMap((report) =>
        flows
          .filter(
            (f) =>
              f.basisKind === "custom:incident-response" &&
              f.jurisdictionId === report.jurisdictionId,
          )
          .map((f) => (
            <button
              key={`${report.id}:${f.id}`}
              onClick={() =>
                act(() => requestIncidentResources(world, report.id, f.id))
              }
            >
              Continue
            </button>
          )),
      )}
      {view.history
        .filter((e) => e.type === "incident.response.resources-requested")
        .map((e) => (
          <article key={e.id}>
            <p>{e.summary}</p>
            <button
              onClick={() =>
                act(() => decideIncidentResourceRequest(world, e.id, true))
              }
            >
              Continue
            </button>
            <button
              onClick={() =>
                act(() => decideIncidentResourceRequest(world, e.id, false))
              }
            >
              Back
            </button>
          </article>
        ))}
      {view.work.map((item) => (
        <article key={item.id}>
          <p>{item.title}</p>
          <p>{workItemState(world, item.id)?.status}</p>
          <button
            disabled={
              workItemState(world, item.id)?.status !== "ready-for-review"
            }
            onClick={() => act(() => arrangeIncidentBriefing(world, item.id))}
          >
            Continue
          </button>
        </article>
      ))}
      {world.history.scheduledActivities
        .filter(
          (a) =>
            a.stableKey.startsWith("incident-response:briefing:") &&
            a.responsiblePersonId === actingId &&
            scheduledActivityState(world, a.id)?.status === "scheduled",
        )
        .map((a) => (
          <button
            key={a.id}
            onClick={() => act(() => attendIncidentBriefing(world, a.id))}
          >
            Continue
          </button>
        ))}
      {view.history
        .filter((e) => e.type === "incident.response.follow-up")
        .map((e) => (
          <article key={e.id}>
            <p>{e.summary}</p>
            {world.history.resourceFlows
              .filter(
                (f) =>
                  f.basisKind === "custom:incident-response" &&
                  f.jurisdictionId === e.jurisdictionId,
              )
              .map((f) => (
                <button
                  key={f.id}
                  onClick={() =>
                    act(() => deliverIncidentResources(world, e.id, f.id))
                  }
                >
                  Continue
                </button>
              ))}
          </article>
        ))}
      <p role="status" data-reason={message || undefined} />
    </section>
  );
}
