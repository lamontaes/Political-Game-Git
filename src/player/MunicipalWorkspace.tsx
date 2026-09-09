import { useState } from "react";
import type { World } from "../simulation/types";
import {
  attendMunicipalMeeting,
  municipalAgenda,
  municipalAgendaWorkAuthorized,
  municipalBindingExists,
  prepareMunicipalAgenda,
  type MunicipalActionResult,
  type MunicipalGovernmentBinding,
  type MunicipalMeetingNotice,
} from "../simulation/municipal-public-work";

export interface MunicipalWorkspaceProps {
  readonly world: World;
  readonly government: MunicipalGovernmentBinding;
  readonly meetings: readonly MunicipalMeetingNotice[];
  readonly onWorldChange: (world: World) => void;
}

/** UI-core supplies this local surface with the current world and exact binding. */
export function MunicipalWorkspace({
  world,
  government,
  meetings,
  onWorldChange,
}: MunicipalWorkspaceProps) {
  const [message, setMessage] = useState("");
  if (!municipalBindingExists(world, government)) {
    return (
      <section aria-label="Municipal government">
        <p>This government's identity is unresolved.</p>
      </section>
    );
  }
  const act = (result: MunicipalActionResult) => {
    if (result.ok) {
      onWorldChange(result.world);
      setMessage("Recorded in your calendar or work history.");
    } else {
      setMessage(`No change recorded: ${result.reason.replaceAll("-", " ")}.`);
    }
  };
  const authorized = municipalAgendaWorkAuthorized(world, government);
  const structure = government.structure;
  return (
    <section aria-label="Municipal government">
      <h2>{structure.bodyName ?? "Municipal government"}</h2>
      <p>{structure.form ?? "Government form unknown"}</p>
      <dl>
        <dt>Members</dt>
        <dd>{structure.bodySize ?? "Unknown"}</dd>
        <dt>Assembly</dt>
        <dd>{structure.assemblyMethod?.replaceAll("-", " ") ?? "Unknown"}</dd>
        <dt>Mayor is a member</dt>
        <dd>
          {structure.mayorIsBodyMember === null
            ? "Unknown"
            : structure.mayorIsBodyMember
              ? "Yes"
              : "No"}
        </dd>
        <dt>Professional manager</dt>
        <dd>
          {structure.professionalManager === null
            ? "Unknown"
            : structure.professionalManager
              ? "Yes"
              : "No"}
        </dd>
        <dt>Census place</dt>
        <dd>{government.censusPlaceGeoid ?? "No verified link"}</dd>
        <dt>Census government unit</dt>
        <dd>{government.censusGovernmentUnitId ?? "No verified link"}</dd>
        <dt>County government</dt>
        <dd>{government.countyGovernmentKey ?? "No verified relationship"}</dd>
      </dl>
      <p>
        {authorized
          ? "Your current role permits agenda preparation."
          : "You may attend supported public meetings. Office work requires a current role in this government."}
      </p>
      <ul>
        {government.identitySourceUrls.map((url) => (
          <li key={url}>
            <a href={url} target="_blank" rel="noreferrer">
              Government identity source
            </a>
          </li>
        ))}
      </ul>
      {meetings
        .filter((notice) => notice.governmentKey === government.governmentKey)
        .map((notice) => {
          const activity = world.history.scheduledActivities.find(
            (row) => row.id === notice.scheduledActivityId,
          );
          if (!activity) return null;
          const agenda = municipalAgenda(world, government, notice);
          return (
            <article key={activity.id} aria-label={activity.title}>
              <h3>{activity.title}</h3>
              <p>{activity.location.label}</p>
              <button
                type="button"
                disabled={notice.publicAttendance !== "SUPPORTED"}
                onClick={() =>
                  act(attendMunicipalMeeting(world, government, notice))
                }
              >
                Attend public meeting
              </button>
              <button
                type="button"
                disabled={!authorized}
                onClick={() =>
                  act(prepareMunicipalAgenda(world, government, notice))
                }
              >
                Prepare meeting notes
              </button>
              {notice.publicAttendance !== "SUPPORTED" && (
                <p>Public attendance is not established for this session.</p>
              )}
              <h4>Recorded agenda and history</h4>
              {agenda.length === 0 ? (
                <p>No public measure records are available for this session.</p>
              ) : (
                <ul>
                  {agenda.map(({ measure, actions }) => (
                    <li key={measure.id}>
                      <strong>
                        {measure.designation}: {measure.shortTitle}
                      </strong>
                      <p>{measure.summary}</p>
                      <ol>
                        {actions.map((action) => (
                          <li key={action.id}>{action.kind}</li>
                        ))}
                      </ol>
                    </li>
                  ))}
                </ul>
              )}
              {notice.attendanceSourceUrls.map((url) => (
                <p key={url}>
                  <a href={url} target="_blank" rel="noreferrer">
                    Meeting access source
                  </a>
                </p>
              ))}
            </article>
          );
        })}
      <p role="status">{message}</p>
    </section>
  );
}
