import "./MunicipalWorkspace.css";
import { municipalCapacitySourceUrl } from "../simulation/municipal-capacity";
import { municipalGovernments } from "../simulation/municipal-government";
import { municipalVenueForActivity } from "../presentation/municipal-venue";
import type { ReactNode } from "react";
import { useState } from "react";
import type { FutureTransitionHandlerRegistry } from "../simulation/types";
import type { World } from "../simulation/types";
import { attendMunicipalPublicMeeting } from "../simulation/municipal-public-work";
import { scheduledActivityState } from "../simulation/time-work";
import { measureActions } from "../simulation/legislation";
import {
  synchronizeMunicipalPublicContext,
  municipalWorkspaceFor,
  prepareMunicipalMeetingNotes,
} from "../presentation/municipal-workspace";

function humanLabel(value: string): string {
  const words = value.toLowerCase().replace(/[_-]/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Feature-local v1 surface. UI-core owns its navigation and save callback. */
export function MunicipalWorkspace({
  world,
  onWorldChange,
  transitionHandlers,
  renderVenue,
}: {
  readonly world: World;
  readonly renderVenue?: (
    world: World,
    activityId: string,
    venue: NonNullable<ReturnType<typeof municipalVenueForActivity>>,
  ) => ReactNode;
  readonly transitionHandlers?: FutureTransitionHandlerRegistry;
  readonly onWorldChange: (world: World) => void;
}) {
  const [message, setMessage] = useState("");
  const [inspectionKey, setInspectionKey] = useState("");
  const view = municipalWorkspaceFor(world, inspectionKey || undefined);
  const directory = (
    <label>
      Inspect a government
      <select
        value={inspectionKey}
        onChange={(event) => {
          setInspectionKey(event.target.value);
          setMessage("");
        }}
      >
        <option value="">My home government</option>
        {municipalGovernments().map((government) => (
          <option key={government.key} value={government.key}>
            {government.displayName} ({government.state})
          </option>
        ))}
      </select>
    </label>
  );
  if (!view)
    return (
      <section
        className="municipal-workspace"
        aria-label="Municipal government"
      >
        <h2>Municipal government</h2>
        {directory}
        <p>No verified government link is available for this home's place.</p>
      </section>
    );
  const act = (result: {
    readonly ok: boolean;
    readonly world: World;
    readonly reason?: string;
  }) => {
    if (result.ok) {
      onWorldChange(result.world);
      setMessage("Recorded in your calendar and history.");
    } else setMessage(result.reason ?? "No change recorded.");
  };
  const canWork = view.standing.roles.some((role) => role !== "resident");
  return (
    <section className="municipal-workspace" aria-label="Municipal government">
      {renderVenue &&
        world.history.events
          .filter(
            (event) =>
              event.type === "municipal.public-meeting-attended" &&
              event.tags.includes(`government:${view.government.key}`),
          )
          .slice(-1)
          .map((event) => {
            const activityId = event.involvedEntityIds.find((id) =>
              world.history.scheduledActivities.some(
                (activity) => activity.id === id,
              ),
            );
            const venue =
              activityId && municipalVenueForActivity(world, activityId);
            return activityId && venue ? (
              <div key={event.id}>{renderVenue(world, activityId, venue)}</div>
            ) : null;
          })}
      {directory}
      <h2>{view.government.displayName}</h2>
      <p>
        {view.isHomeGovernment
          ? "Linked to your saved home place."
          : "Library inspection. This does not change your residence or grant a role."}
      </p>
      <p>
        {view.standing.roles.map(humanLabel).join(", ") || "Public visitor"}
      </p>
      <p>
        Census place: {view.government.placeGeoid ?? "Unknown"}. A place
        identifier is not a government-unit or county identifier.
      </p>
      {view.government.identity ? (
        <details>
          <summary>Government identity and geography</summary>
          <p>
            {view.government.identity.publisherUnitName} ·{" "}
            {view.government.identity.governmentUnit.unitType}
          </p>
          <p>
            Publisher PID: {view.government.identity.publisherId}. Legacy
            government ID:{" "}
            {view.government.identity.censusGovernmentUnitId ?? "Unknown"}.
          </p>
          <p>
            County-equivalent representation:{" "}
            {view.government.identity.countyEquivalentGeoid ??
              "Not established"}
            . County area:{" "}
            {view.government.identity.governmentUnit.countyAreaName ??
              "Unknown"}{" "}
            (not a governing parent).
          </p>
          <p>{view.government.identity.basis}</p>
          <p>
            Inventory observation:{" "}
            {view.government.identity.governmentUnit.evidence.asOf}.{" "}
            <a
              href="https://www.census.gov/data/datasets/2025/econ/gus/public-use-files.html"
              target="_blank"
              rel="noreferrer"
            >
              Census Government Units Survey
            </a>
          </p>
        </details>
      ) : (
        <p>No verified Census government-unit link is available.</p>
      )}
      {view.government.readings.map((reading) => (
        <details
          key={`${reading.key}:${reading.evidence}`}
          open={reading === view.reading}
        >
          <summary>
            {reading.evidence === "enacted-text"
              ? "Retrieved law"
              : "Research report — not operative law"}{" "}
            · {reading.asOf}
          </summary>
          <dl>
            <dt>Form</dt>
            <dd>{reading.form ? humanLabel(reading.form) : "Unknown"}</dd>
            <dt>Body</dt>
            <dd>{reading.bodyName ?? "Unknown"}</dd>
            <dt>Members</dt>
            <dd>{reading.bodySize ?? "Unknown"}</dd>
            <dt>Seat pattern</dt>
            <dd>{reading.composition?.note ?? "Unknown"}</dd>
            <dt>Mayor</dt>
            <dd>
              {reading.mayor
                ? humanLabel(reading.mayor.structuralPosition)
                : "Unknown"}
            </dd>
            <dt>Professional manager</dt>
            <dd>{reading.manager?.statedRole ?? "Unknown"}</dd>
            <dt>Consolidation</dt>
            <dd>
              {reading.consolidationType
                ? humanLabel(reading.consolidationType)
                : "Unknown"}
            </dd>
          </dl>
          <details>
            <summary>All recorded facts and evidence</summary>
            <dl>
              {reading.facts.map((fact) => (
                <div key={fact.path}>
                  <dt>{fact.path}</dt>
                  <dd>
                    {fact.state}:{" "}
                    {fact.value === undefined
                      ? (fact.reason ?? "No value established")
                      : typeof fact.value === "string"
                        ? fact.value
                        : JSON.stringify(fact.value)}{" "}
                    {fact.asOf && ` — observed ${fact.asOf}`}
                    {fact.evidence?.map((evidence, index) => {
                      const source = reading.sources.find(
                        (candidate) => candidate.key === evidence.artifactId,
                      );
                      return source ? (
                        <span key={index}>
                          {" "}
                          ·{" "}
                          <a href={source.url} target="_blank" rel="noreferrer">
                            {evidence.locator.citation ?? source.title}
                          </a>
                        </span>
                      ) : null;
                    })}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
          <ul>
            {reading.sources.map((source) => (
              <li key={source.key}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ))}
      <details>
        <summary>Cited public records and meeting material</summary>
        <p>
          These are references in this government's source readings. They are
          not attached agendas or notices for an authored session in this world.
        </p>
        <ul>
          {view.publicReferences.map((url) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer">
                {url}
              </a>
            </li>
          ))}
        </ul>
      </details>
      <h3>Public meetings</h3>
      {view.meetings.length === 0 && (
        <>
          <p>No session is recorded on this world's calendar.</p>
          {view.isHomeGovernment && view.attendanceAuthority.ok && (
            <>
              <p>
                Add a game-authored public session in one hour, lasting 90
                minutes. This is a fictional world occurrence, not a published
                real-world meeting notice.
              </p>
              <button
                type="button"
                onClick={() => {
                  const next = synchronizeMunicipalPublicContext(world);
                  if (next !== world) {
                    onWorldChange(next);
                    setMessage("Public session added to your calendar.");
                  }
                }}
              >
                Add public session to this world
              </button>
            </>
          )}
        </>
      )}
      {view.meetings.map((meeting) => {
        const state = scheduledActivityState(world, meeting.id);
        return (
          <article key={meeting.id} aria-label={meeting.title}>
            <h4>{meeting.title}</h4>
            <p>{meeting.summary}</p>
            <p>
              {state!.start.date} ·{" "}
              {String(Math.floor(state!.start.minuteOfDay / 60)).padStart(
                2,
                "0",
              )}
              :{String(state!.start.minuteOfDay % 60).padStart(2, "0")}
            </p>
            <p>
              Agenda: no published agenda has been attached to this session.
              Recorded measures appear below.
            </p>
            <button
              type="button"
              onClick={() =>
                act(
                  attendMunicipalPublicMeeting(
                    world,
                    view.government.key,
                    meeting.id,
                    transitionHandlers,
                  ),
                )
              }
            >
              Attend public meeting
            </button>
            <button
              type="button"
              disabled={!canWork}
              onClick={() =>
                act(
                  prepareMunicipalMeetingNotes(
                    world,
                    view.government.key,
                    meeting.id,
                  ),
                )
              }
            >
              Prepare meeting notes
            </button>
          </article>
        );
      })}
      {!canWork && (
        <p>
          Public attendance grants no office powers. Meeting preparation
          requires a current role in this government.
        </p>
      )}
      <h3>Measures and history</h3>
      {view.measures.length === 0 ? (
        <p>No municipal measure has been recorded.</p>
      ) : (
        <ul>
          {view.measures.map((measure) => (
            <li key={measure.id}>
              <strong>
                {measure.designation}: {measure.shortTitle}
              </strong>
              <p>{measure.summary}</p>
              <ol>
                {measureActions(world, measure.id).map((action) => (
                  <li key={action.id}>{action.kind}</li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
      <h3>Attendance history</h3>
      {world.history.events
        .filter(
          (event) =>
            event.type === "municipal.public-meeting-attended" &&
            event.tags.includes(`government:${view.government.key}`),
        )
        .map((event) => (
          <p key={event.id}>
            {event.occurredAt}: {event.summary}
          </p>
        ))}
      <h3>Historical finance and employment</h3>
      <p>
        These observations do not establish current cash, staffing, or legal
        powers.
      </p>
      {view.capacity.finance.length === 0 && (
        <p>
          No finance observation is available for this exact government ID in
          the accepted corpus. Missing data is not zero.
        </p>
      )}
      {view.capacity.finance.map((row) => (
        <p key={row.recordId}>
          {row.itemDescription}:{" "}
          {row.amount.state === "KNOWN" ? row.amount.value : "Unknown"}{" "}
          {row.units}; fiscal year ending {row.fiscalYearEnding}.{" "}
          {municipalCapacitySourceUrl(row.evidence.artifactId) && (
            <a href={municipalCapacitySourceUrl(row.evidence.artifactId)!}>
              Publisher observation
            </a>
          )}
        </p>
      ))}
      {view.capacity.employment.length === 0 && (
        <p>
          No employment observation is available for this exact government ID in
          the accepted corpus.
        </p>
      )}
      {view.capacity.employment.map((row) => (
        <p key={row.recordId}>
          {row.functionLabel}:{" "}
          {row.fullTimeEmployees.state === "KNOWN"
            ? row.fullTimeEmployees.value
            : "Unknown"}{" "}
          full-time employees,{" "}
          {row.partTimeEmployees.state === "KNOWN"
            ? row.partTimeEmployees.value
            : "Unknown"}{" "}
          part-time employees; observed {row.referenceDate}. Full-time
          equivalent: unknown.{" "}
          {municipalCapacitySourceUrl(row.evidence.artifactId) && (
            <a href={municipalCapacitySourceUrl(row.evidence.artifactId)!}>
              Publisher observation
            </a>
          )}
        </p>
      ))}
      <p role="status">{message}</p>
    </section>
  );
}
