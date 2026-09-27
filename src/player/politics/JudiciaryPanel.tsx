import { useId, useState } from "react";

import type { EntityId, World } from "../../simulation/types";
import { proseDate } from "../../presentation/prose-dates";
import { projectJudicialSelection } from "../../presentation/judicial-selection";
import { currentPresidentOf } from "../../simulation/crisis/offices";
import {
  federalRosterReviewStatus,
  publicSeatedJudges,
  reviewFederalJudicialVacancy,
} from "../../simulation/judiciary/candidate-discovery";
import {
  interviewFederalJudicialCandidate,
  JUDICIAL_CANDIDATE_INTERVIEW_EVENT,
} from "../../simulation/judiciary/candidate-interview";
import {
  recordFederalJudicialNomination,
  screenFederalJudicialNominee,
} from "../../simulation/judiciary/selection";
import { PersonPortrait } from "../PersonPortrait";
import type {
  JudiciaryView,
  JudicialCourtView,
} from "../../presentation/judiciary";
import type { GovernmentScope } from "../../presentation/politics-government";

function CourtRoster({
  court,
  world,
  onOpenPerson,
  onWorldChange,
  federal = false,
  nested = false,
}: {
  readonly court: JudicialCourtView;
  readonly world: World;
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly onWorldChange?: (world: World) => void;
  readonly federal?: boolean;
  readonly nested?: boolean;
}) {
  return (
    <section
      className="pg-government-branch"
      data-testid={`judicial-court-${court.courtId}`}
    >
      {nested ? <h5>{court.name}</h5> : <h4>{court.name}</h4>}
      <ul>
        {court.holders.map((holder) => (
          <li key={holder.seatId}>
            {holder.personId ? (
              <button
                type="button"
                aria-label={`Open record for ${holder.name}`}
                onClick={() => onOpenPerson(holder.personId!)}
              >
                <PersonPortrait world={world} personId={holder.personId} />
                {holder.startedAt ? (
                  <span>At this court since {proseDate(holder.startedAt)}</span>
                ) : null}
              </button>
            ) : (
              <span>Vacant seat</span>
            )}
            {federal && !holder.personId && onWorldChange ? (
              <FederalVacancyAction
                world={world}
                seatId={holder.seatId}
                onWorldChange={onWorldChange}
                onOpenPerson={onOpenPerson}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function FederalVacancyAction({
  world,
  seatId,
  onWorldChange,
  onOpenPerson,
}: {
  readonly world: World;
  readonly seatId: string;
  readonly onWorldChange: (world: World) => void;
  readonly onOpenPerson: (personId: EntityId) => void;
}) {
  const searchId = useId();
  const judgeId = useId();
  const [search, setSearch] = useState("");
  const [selectedJudgeId, setSelectedJudgeId] = useState<EntityId | "">("");
  const [message, setMessage] = useState<string | null>(null);
  const controlledPresident =
    world.control.kind === "person" &&
    currentPresidentOf(world)?.personId === world.control.personId;
  if (!controlledPresident) return null;
  const selection = projectJudicialSelection(world, seatId);
  if (!selection) return null;
  const canBegin =
    selection.status === "no-attempt" ||
    selection.status === "rejected" ||
    selection.status === "lapsed";
  const review = canBegin ? federalRosterReviewStatus(world, seatId) : null;
  const roster = review?.state === "ready" ? publicSeatedJudges(world) : [];
  const query = search.trim().toLocaleLowerCase();
  const matches = roster
    .filter(
      (judge) =>
        judge.name.toLocaleLowerCase().includes(query) ||
        judge.courtName.toLocaleLowerCase().includes(query),
    )
    .slice(0, 30);
  const run = (action: () => World) => {
    try {
      const next = action();
      onWorldChange(next);
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "That action could not be completed.",
      );
    }
  };
  return (
    <div data-testid={`judicial-selection-${seatId}`}>
      {review?.state === "ready" ? (
        <div>
          <p className="pg-government-note">
            This seat is vacant. Review the public roster of sitting judges
            before opening a nomination.
          </p>
          <label htmlFor={searchId}>Find a sitting judge</label>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelectedJudgeId("");
            }}
          />
          <label htmlFor={judgeId}>Judge to consider</label>
          <select
            id={judgeId}
            value={selectedJudgeId}
            onChange={(event) => {
              const chosen = matches.find(
                (judge) => judge.personId === event.target.value,
              );
              setSelectedJudgeId(chosen?.personId ?? "");
            }}
          >
            <option value="">Select a judge</option>
            {matches.map((judge) => (
              <option
                key={`${judge.seatId}:${judge.personId}`}
                value={judge.personId}
              >
                {judge.name} — {judge.courtName}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedJudgeId}
            onClick={() => {
              const candidateId = selectedJudgeId;
              if (!candidateId) return;
              run(() =>
                reviewFederalJudicialVacancy(world, {
                  seatId,
                  candidatePersonIds: [candidateId],
                }),
              );
            }}
          >
            Review judge for this vacancy (30 minutes)
          </button>
        </div>
      ) : review?.state === "unavailable" ? (
        <p className="pg-government-note">{review.reason}</p>
      ) : null}
      {selection.status === "pending" ? (
        <div>
          <p className="pg-government-note">
            Next: {selection.nextStage?.actor ?? "Authority unresolved"}
          </p>
          {selection.senateStatus ? (
            <p className="pg-government-note">{selection.senateStatus}</p>
          ) : null}
          {selection.playerMayNominate ? (
            <ul>
              {selection.candidates.map((candidate) => {
                const screen = screenFederalJudicialNominee(
                  world,
                  candidate.personId,
                );
                const interviewed = world.history.events.some(
                  (event) =>
                    event.type === JUDICIAL_CANDIDATE_INTERVIEW_EVENT &&
                    event.tags.includes(
                      `selection:${selection.selectionRecordId}`,
                    ) &&
                    event.tags.includes(`candidate:${candidate.personId}`),
                );
                return (
                  <li key={candidate.personId}>
                    <button
                      type="button"
                      onClick={() => onOpenPerson(candidate.personId)}
                    >
                      {candidate.name}
                    </button>
                    {screen.state === "unresolved" && !interviewed ? (
                      <button
                        type="button"
                        onClick={() =>
                          run(() =>
                            interviewFederalJudicialCandidate(world, {
                              selectionRecordId: selection.selectionRecordId!,
                              candidatePersonId: candidate.personId,
                            }),
                          )
                        }
                      >
                        Interview (30 minutes)
                      </button>
                    ) : null}
                    {screen.state === "ready" ? (
                      <button
                        type="button"
                        onClick={() =>
                          run(() =>
                            recordFederalJudicialNomination(world, {
                              selectionRecordId: selection.selectionRecordId!,
                              presidentPersonId:
                                currentPresidentOf(world)!.personId,
                              nomineePersonId: candidate.personId,
                            }),
                          )
                        }
                      >
                        Nominate
                      </button>
                    ) : (
                      <span className="pg-government-note">
                        {screen.reason}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}

/** Public court roster plus bounded actions for a controlled President. */
export function JudiciaryPanel({
  view,
  world,
  scope,
  onOpenPerson,
  onWorldChange,
}: {
  readonly view: JudiciaryView;
  readonly world: World;
  readonly scope: GovernmentScope;
  readonly onOpenPerson: (personId: EntityId) => void;
  readonly onWorldChange?: (world: World) => void;
}) {
  if (scope === "local") return null;
  if (scope === "state" && view.stateCourts.length === 0) return null;
  if (
    scope === "federal" &&
    !view.supremeCourt &&
    view.federalCourts.length === 0
  )
    return null;
  return (
    <section
      className="pg-government-branch"
      data-testid="government-judiciary"
    >
      <h3>Courts and judges</h3>
      {scope === "state" ? (
        <div data-testid="state-court-roster">
          <h4>{view.stateName} courts</h4>
          {view.stateCourts.map((court) => (
            <CourtRoster
              key={court.courtId}
              court={court}
              world={world}
              onOpenPerson={onOpenPerson}
              nested
            />
          ))}
        </div>
      ) : null}
      {scope === "federal" ? (
        <div data-testid="federal-court-roster">
          {view.supremeCourt ? (
            <CourtRoster
              court={view.supremeCourt}
              world={world}
              onOpenPerson={onOpenPerson}
              onWorldChange={onWorldChange}
              federal
            />
          ) : null}
          {view.federalCourts.length > 0 ? (
            <details>
              <summary>
                Federal appellate and district courts (
                {view.federalCourts.length})
              </summary>
              {view.federalCourts.map((court) => (
                <CourtRoster
                  key={court.courtId}
                  court={court}
                  world={world}
                  onOpenPerson={onOpenPerson}
                  onWorldChange={onWorldChange}
                  federal
                />
              ))}
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
