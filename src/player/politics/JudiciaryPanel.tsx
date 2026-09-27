import { useId, useState } from "react";

import type { EntityId, World } from "../../simulation/types";
import { proseDate } from "../../presentation/prose-dates";
import { projectJudicialSelection } from "../../presentation/judicial-selection";
import { currentPresidentOf } from "../../simulation/crisis/offices";
import { seatedCongressChamber } from "../../simulation/governing/congress-chambers";
import {
  federalRosterReviewStatus,
  publicSeatedJudges,
  reviewFederalJudicialVacancy,
} from "../../simulation/judiciary/candidate-discovery";
import {
  interviewFederalJudicialCandidate,
  JUDICIAL_CANDIDATE_INTERVIEW_EVENT,
} from "../../simulation/judiciary/candidate-interview";
import { commissionConfirmedFederalJudge } from "../../simulation/judiciary/federal-judicial-commission";
import {
  recordFederalJudicialNomination,
  screenFederalJudicialNominee,
} from "../../simulation/judiciary/selection";
import {
  recordControlledJudicialHearingParticipation,
  recordControlledJudiciaryChairHearingChoice,
  recordControlledOrganizationAndHearingNotice,
} from "../../simulation/judiciary/senate-hearing-process";
import {
  recordControlledJudiciaryReportChoice,
  recordControlledJudiciaryReportNotice,
  recordControlledJudicialNominationFloorChoice,
  type JudicialFloorChoice,
  type ReportBallot,
} from "../../simulation/judiciary/senate-committee-report";
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
            {federal && !holder.personId ? (
              <>
                <FederalSelectionStatus world={world} seatId={holder.seatId} />
                {onWorldChange ? (
                  <>
                    <FederalVacancyAction
                      world={world}
                      seatId={holder.seatId}
                      onWorldChange={onWorldChange}
                      onOpenPerson={onOpenPerson}
                    />
                    <FederalSenateAction
                      world={world}
                      seatId={holder.seatId}
                      onWorldChange={onWorldChange}
                    />
                  </>
                ) : null}
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function FederalSelectionStatus({
  world,
  seatId,
}: {
  readonly world: World;
  readonly seatId: string;
}) {
  const selection = projectJudicialSelection(world, seatId);
  if (!selection) return null;
  const summary =
    selection.status === "no-attempt"
      ? "No judicial selection is underway."
      : selection.status === "pending"
        ? `Selection pending. Next: ${selection.nextStage?.actor ?? "authority unresolved"}.`
        : selection.status === "stages-completed"
          ? selection.confirmedResultEventId
            ? "The Senate confirmed the nominee. The commission is pending."
            : "The recorded selection stages are complete."
          : selection.status === "rejected"
            ? "The latest selection was rejected."
            : selection.status === "lapsed"
              ? "The latest selection lapsed."
              : "The selection route is unresolved.";
  return (
    <div data-testid={`judicial-selection-status-${seatId}`}>
      <p className="pg-government-note">{summary}</p>
      {selection.reason ? (
        <p className="pg-government-note">{selection.reason}</p>
      ) : null}
      {selection.senateStatus ? (
        <p className="pg-government-note">{selection.senateStatus}</p>
      ) : null}
    </div>
  );
}

function FederalSenateAction({
  world,
  seatId,
  onWorldChange,
}: {
  readonly world: World;
  readonly seatId: string;
  readonly onWorldChange: (world: World) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const floorReasonId = useId();
  const [floorReason, setFloorReason] = useState("");
  const controlledId =
    world.control.kind === "person" ? world.control.personId : null;
  const isSenator =
    controlledId !== null &&
    seatedCongressChamber(world, "senate")?.body.members.some(
      (member) => member.personId === controlledId,
    );
  const selection = projectJudicialSelection(world, seatId);
  if (!isSenator || !selection?.selectionRecordId || !selection.senateStatus)
    return null;
  const run = (action: () => World) => {
    try {
      onWorldChange(action());
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "That Senate action could not be completed.",
      );
    }
  };
  const recordOrganization = (
    attendance: "attend" | "absent",
    ballot: "approve" | "reject" | "present" | null,
  ) =>
    run(() =>
      recordControlledOrganizationAndHearingNotice(
        world,
        selection.selectionRecordId!,
        { attendance, ballot },
      ),
    );
  const recordFloorChoice = (
    attendance: JudicialFloorChoice["attendance"],
    ballot: JudicialFloorChoice["ballot"],
  ) =>
    run(() =>
      recordControlledJudicialNominationFloorChoice(
        world,
        selection.selectionRecordId!,
        { attendance, ballot, reason: floorReason },
      ),
    );
  return (
    <div data-testid={`judicial-senate-action-${seatId}`}>
      {selection.playerSenateAction === "organization" ? (
        <div>
          <p>Choose your own Senate Judiciary organization vote.</p>
          <button
            type="button"
            onClick={() => recordOrganization("attend", "approve")}
          >
            Attend and approve slate
          </button>
          <button
            type="button"
            onClick={() => recordOrganization("attend", "reject")}
          >
            Attend and reject slate
          </button>
          <button
            type="button"
            onClick={() => recordOrganization("attend", "present")}
          >
            Attend and answer present
          </button>
          <button
            type="button"
            onClick={() => recordOrganization("absent", null)}
          >
            Do not attend
          </button>
        </div>
      ) : null}
      {selection.playerSenateAction === "announce-hearing" ? (
        <button
          type="button"
          onClick={() =>
            run(() =>
              recordControlledJudiciaryChairHearingChoice(
                world,
                selection.selectionRecordId!,
                "announce",
              ),
            )
          }
        >
          Announce public hearing
        </button>
      ) : null}
      {selection.playerSenateAction === "hearing-attendance" ? (
        <div>
          <button
            type="button"
            onClick={() =>
              run(() =>
                recordControlledJudicialHearingParticipation(
                  world,
                  selection.selectionRecordId!,
                  "attend",
                ),
              )
            }
          >
            Attend hearing
          </button>
          <button
            type="button"
            onClick={() =>
              run(() =>
                recordControlledJudicialHearingParticipation(
                  world,
                  selection.selectionRecordId!,
                  "decline",
                ),
              )
            }
          >
            Decline hearing
          </button>
        </div>
      ) : null}
      {selection.playerSenateAction === "report-notice" ? (
        <button
          type="button"
          onClick={() =>
            run(() =>
              recordControlledJudiciaryReportNotice(
                world,
                selection.selectionRecordId!,
              ),
            )
          }
        >
          Schedule Judiciary report business
        </button>
      ) : null}
      {selection.playerSenateAction === "report-business" ? (
        <div>
          <p>Choose your own attendance and committee report ballot.</p>
          {(
            [
              ["report-favorably", "Attend and report favorably"],
              ["report-unfavorably", "Attend and report unfavorably"],
              [
                "report-without-recommendation",
                "Attend and report without recommendation",
              ],
              ["oppose-report", "Attend and oppose reporting"],
              ["present", "Attend and answer present"],
            ] as const
          ).map(([ballot, label]) => (
            <button
              key={ballot}
              type="button"
              onClick={() =>
                run(() =>
                  recordControlledJudiciaryReportChoice(
                    world,
                    selection.selectionRecordId!,
                    { attendance: "attend", ballot: ballot as ReportBallot },
                  ),
                )
              }
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              run(() =>
                recordControlledJudiciaryReportChoice(
                  world,
                  selection.selectionRecordId!,
                  { attendance: "absent", ballot: null },
                ),
              )
            }
          >
            Do not attend report business
          </button>
        </div>
      ) : null}
      {selection.playerSenateAction === "floor-vote" ? (
        <div>
          <p>Choose your own attendance and Senate floor vote.</p>
          <label htmlFor={floorReasonId}>Reason for your floor choice</label>
          <input
            id={floorReasonId}
            type="text"
            value={floorReason}
            onChange={(event) => setFloorReason(event.target.value)}
          />
          {(
            [
              ["yea", "Attend and vote yea"],
              ["nay", "Attend and vote nay"],
              ["present-not-voting", "Attend and answer present"],
            ] as const
          ).map(([ballot, label]) => (
            <button
              key={ballot}
              type="button"
              disabled={!floorReason.trim()}
              onClick={() => recordFloorChoice("attend", ballot)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            disabled={!floorReason.trim()}
            onClick={() => recordFloorChoice("absent", null)}
          >
            Do not attend floor vote
          </button>
        </div>
      ) : null}
      {message ? <p role="alert">{message}</p> : null}
    </div>
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
      {selection.playerMayCommission && selection.confirmedResultEventId ? (
        <button
          type="button"
          onClick={() =>
            run(() =>
              commissionConfirmedFederalJudge(world, {
                selectionRecordId: selection.selectionRecordId!,
                resultEventId: selection.confirmedResultEventId!,
                presidentPersonId: currentPresidentOf(world)!.personId,
                mode: "player-choice",
              }),
            )
          }
        >
          Issue judicial commission
        </button>
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
