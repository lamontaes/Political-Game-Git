import { useState } from "react";
import {
  projectEligiblePressAdvisers,
  producePressRequestResponse,
  producePressAdviserResponse,
  arrangeAcceptedPressInterview,
  producePressPreparation,
  producePressAdviserFeedback,
  addSimulationMinutes,
  advanceWorldMinutes,
  type HistoricalEvent,
  projectEligiblePressReporters,
  recordPressRequest,
  PRESS_INTERVIEW_CHANNELS,
  PRESS_RECORD_TERMS,
  type PressInterviewChannel,
  type PressRecordTerms,
  completePressInterview,
  confirmPressResponse,
  draftPressResponse,
  projectPressInterview,
  publishPressInterview,
  projectPitchablePressBases,
  projectPressReachSnapshot,
  seekCivicPressContact,
  type EntityId,
  type World,
} from "../simulation";
import { PressDeskPanel } from "./PressDeskPanel";
import { PressInterviewPanel } from "./PressInterviewPanel";
import {
  composePressRequestPitch,
  composeReporterQuestion,
  plannedPressArrangementPlace,
  projectPressBackgroundAttributions,
  PRESS_REQUEST_INTENT_COPY,
  PRESS_REQUEST_INTENTS,
  PRESS_REQUEST_STANCE_COPY,
  PRESS_REQUEST_STANCES,
  type PressRequestIntent,
  type PressRequestStance,
} from "../presentation/press-request";
import { GameSelect } from "./controls/GameSelect";
import { proseDate } from "../presentation/prose-dates";
import { formatMinute } from "../presentation/player-calendar";
import { simulationMinutesBetween } from "../simulation/dates";
import {
  describeInterval,
  describeTimeTarget,
  PROTECTED_STOP_NOTE,
} from "../presentation/time-target-label";
import {
  CALENDAR_COMMITMENT_NOTE,
  useSharedTimeCommand,
} from "./time-command-runner";

/** The authored step the preparation control offers, disclosed before it runs. */
const PRESS_PREPARATION_STEP_MINUTES = 15;

/**
 * Letting preparation time pass, on the one clock.
 *
 * The desk used to call `advanceWorldMinutes(world, 15)` straight from its
 * onClick: no disclosed destination, no pending state, no stale-World check,
 * and a second press could spend a second quarter hour on top of the first.
 * A quarter hour is not a whole day, so this is not a `days` command — it goes
 * through the runner's `perform`, which shares the same pending flag, refuses
 * a World that moved since this was drawn, and commits through the shell.
 *
 * Where no runner is mounted above this desk there is no shared clock to
 * submit to, so it states why the step is not offered rather than opening a
 * second clock of its own.
 */
export function PressPreparationTimeControl({
  world,
}: {
  readonly world: World;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const runner = useSharedTimeCommand();
  return (
    <div>
      <p>
        Preparation progresses as time passes and the assigned adviser’s
        available capacity.
      </p>
      {runner ? (
        <>
          <button
            type="button"
            data-testid="press-continue-quarter-hour"
            aria-disabled={runner.pending || undefined}
            aria-busy={runner.pending}
            aria-describedby="press-quarter-hour-target"
            onClick={() =>
              runner.perform(
                (current, handlers) => {
                  // The runner's registry carries the player's interruption
                  // preferences; composing a fresh one here could not see them.
                  const next = advanceWorldMinutes(
                    current,
                    PRESS_PREPARATION_STEP_MINUTES,
                    handlers,
                  );
                  const elapsed = simulationMinutesBetween(
                    current.currentMoment,
                    next.currentMoment,
                  );
                  return {
                    world: next,
                    outcome:
                      elapsed === 0
                        ? CALENDAR_COMMITMENT_NOTE
                        : elapsed < PRESS_PREPARATION_STEP_MINUTES
                          ? `${describeInterval(elapsed)} passed, stopping short of ${describeInterval(
                              PRESS_PREPARATION_STEP_MINUTES,
                            )} for something protected. It is now ${describeTimeTarget(
                              next.currentMoment,
                            )}.`
                          : `${describeInterval(elapsed)} passed. It is now ${describeTimeTarget(
                              next.currentMoment,
                            )}.`,
                  };
                },
                (report) => setNotice(report.outcome),
              )
            }
          >
            Continue 15 minutes
          </button>
          <p id="press-quarter-hour-target">
            {runner.pending
              ? "Time is passing…"
              : `${describeInterval(PRESS_PREPARATION_STEP_MINUTES)}, to ${describeTimeTarget(
                  addSimulationMinutes(
                    world.currentMoment,
                    PRESS_PREPARATION_STEP_MINUTES,
                  ),
                )}. ${PROTECTED_STOP_NOTE}`}
          </p>
          {notice && !runner.pending ? (
            <p
              role="status"
              data-testid="press-continue-outcome"
              style={{ whiteSpace: "pre-line" }}
            >
              {notice}
            </p>
          ) : null}
        </>
      ) : (
        <p data-testid="press-continue-quarter-hour-unavailable">
          Letting preparation time pass is not offered here: this desk is open
          outside the play shell, which owns the one clock.
        </p>
      )}
    </div>
  );
}

/** Normal saved-world consumer; arrangements and adviser content remain domain-owned. */
export function PressWorkspace({
  world,
  onWorldChange,
  onOpenPerson,
}: {
  readonly world: World;
  readonly onWorldChange: (world: World) => void;
  readonly onOpenPerson: (id: EntityId) => void;
}) {
  const [selected, setSelected] = useState<EntityId | null>(null);
  const [basisId, setBasisId] = useState("");
  const [reporterRoleId, setReporterRoleId] = useState("");
  const [intent, setIntent] = useState<PressRequestIntent>("request-exchange");
  const [stance, setStance] = useState<PressRequestStance>(
    "report-what-is-recorded",
  );
  const [channel, setChannel] = useState<PressInterviewChannel>("written");
  const [terms, setTerms] = useState<PressRecordTerms>("on-record");
  const [attribution, setAttribution] = useState("");
  const [requestNotice, setRequestNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const arrangements = new Set(
    world.history.events
      .filter((event) => event.type === "press.interview-arranged")
      .map((event) => event.id),
  );
  const controlledPersonId =
    world.control.kind === "person" ? world.control.personId : null;
  const reach = projectPressReachSnapshot(world);
  const topics = controlledPersonId
    ? projectPitchablePressBases(world, controlledPersonId)
    : [];
  const topic = topics.find((item) => item.eventId === basisId);
  const reporters =
    controlledPersonId && topic
      ? projectEligiblePressReporters(world, {
          sourcePersonId: controlledPersonId,
          questionBasisEventIds: [topic.eventId],
        })
      : [];
  const reporter = reporters.find((item) => item.workRoleId === reporterRoleId);
  const attributions = controlledPersonId
    ? projectPressBackgroundAttributions(world, controlledPersonId)
    : [];
  const selectedAttribution =
    terms === "on-background"
      ? attributions.includes(attribution)
        ? attribution
        : (attributions[0] ?? "")
      : null;
  const pitch = topic
    ? composePressRequestPitch({
        subjectSummary: topic.summary,
        intent,
        stance,
        channel,
        terms,
        backgroundAttribution: selectedAttribution,
      })
    : { ok: false as const, reason: "Choose a public development." };
  const reporterQuestion = topic
    ? composeReporterQuestion({
        subjectSummary: topic.summary,
        terms,
      })
    : { ok: false as const, reason: "Choose a public development." };
  const requests = world.history.events.filter(
    (event) =>
      event.type === "press.interview-requested" &&
      event.participants.some(
        (participant) =>
          participant.personId === controlledPersonId &&
          participant.role === "agency:press-source",
      ),
  );
  const activities = world.history.scheduledActivities.filter(
    (activity) =>
      activity.responsiblePersonId === controlledPersonId &&
      activity.sourceEntityIds.some((id) => arrangements.has(id)),
  );
  const activity = activities.find((item) => item.id === selected);
  const view = activity ? projectPressInterview(world, activity.id) : null;
  function change(run: () => World) {
    try {
      onWorldChange(run());
      setProblem(null);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    }
  }
  return (
    <section data-testid="normal-press-workspace" aria-label="Press office">
      {problem ? (
        <p className="game-problem" role="status">
          {problem}
        </p>
      ) : null}
      {requestNotice ? (
        <p className="game-note" role="status">
          {requestNotice}
        </p>
      ) : null}
      {controlledPersonId ? (
        <PressDeskPanel
          world={world}
          personId={controlledPersonId}
          onWorldChange={onWorldChange}
          onOpenPerson={onOpenPerson}
        />
      ) : null}
      <h3>Press interviews</h3>
      {controlledPersonId ? (
        <details data-testid="press-request-form">
          <summary>Request a press exchange</summary>
          <p>
            Choose a public civic development and a reporter who holds a current
            journalism role. Asking is not the same as being booked. An adviser
            is optional unless you ask one to prepare you.
          </p>
          {reach.journalistCount === 0 ? (
            <p>
              No current journalism role is recorded in this life.
              <button
                type="button"
                data-testid="press-seek-reporter"
                onClick={() => change(() => seekCivicPressContact(world).world)}
              >
                Look for a reporter covering public affairs
              </button>
            </p>
          ) : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!topic || !reporter) return;
              change(() => {
                if (!pitch.ok || !reporterQuestion.ok) return world;
                const result = recordPressRequest(world, {
                  stableKey: `press-request:${controlledPersonId}:${world.actionSequence}`,
                  reporterPersonId: reporter.personId,
                  reporterWorkRoleId: reporter.workRoleId,
                  jurisdictionId: topic.jurisdictionId,
                  channel,
                  terms,
                  backgroundAttribution:
                    terms === "on-background" ? selectedAttribution : null,
                  pitch: pitch.statement,
                  primaryQuestion: reporterQuestion.statement,
                  questionBasisEventIds: [topic.eventId],
                });
                setRequestNotice(
                  "Request recorded. Awaiting the reporter’s response.",
                );
                return result.world;
              });
            }}
          >
            <label>
              Public development
              <GameSelect
                data-testid="press-basis-select"
                value={basisId}
                onChange={(event) => {
                  setBasisId(event.target.value);
                  setReporterRoleId("");
                }}
              >
                <option value="">Choose a public development</option>
                {topics.map((item) => (
                  <option key={item.eventId} value={item.eventId}>
                    {item.summary}
                  </option>
                ))}
              </GameSelect>
            </label>
            <label>
              Reporter
              <GameSelect
                data-testid="press-reporter-select"
                value={reporterRoleId}
                onChange={(event) => setReporterRoleId(event.target.value)}
              >
                <option value="">Choose a reporter</option>
                {reporters.map((item) => (
                  <option
                    key={`${item.personId}:${item.workRoleId}`}
                    value={item.workRoleId}
                  >
                    {item.personName} — {item.workRoleTitle}
                  </option>
                ))}
              </GameSelect>
            </label>
            {topic && reporters.length === 0 ? (
              <p>
                No current journalist can be asked about this public
                development.
              </p>
            ) : null}
            <label>
              Channel
              <GameSelect
                value={channel}
                onChange={(event) =>
                  setChannel(event.target.value as PressInterviewChannel)
                }
              >
                {PRESS_INTERVIEW_CHANNELS.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </GameSelect>
            </label>
            <label>
              Record terms
              <GameSelect
                value={terms}
                onChange={(event) =>
                  setTerms(event.target.value as PressRecordTerms)
                }
              >
                {PRESS_RECORD_TERMS.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </GameSelect>
            </label>
            {terms === "on-background" ? (
              attributions.length ? (
                <label>
                  Proposed attribution
                  <GameSelect
                    data-testid="press-attribution-select"
                    value={selectedAttribution ?? ""}
                    onChange={(event) => setAttribution(event.target.value)}
                  >
                    {attributions.map((choice) => (
                      <option key={choice} value={choice}>
                        {choice}
                      </option>
                    ))}
                  </GameSelect>
                </label>
              ) : (
                <p role="status">
                  On-background terms need a recorded work title. None is
                  available in this life.
                </p>
              )
            ) : null}
            <fieldset>
              <legend>What you are asking for</legend>
              {PRESS_REQUEST_INTENTS.map((choice) => (
                <label key={choice}>
                  <input
                    type="radio"
                    name="press-request-intent"
                    checked={intent === choice}
                    onChange={() => setIntent(choice)}
                  />
                  {PRESS_REQUEST_INTENT_COPY[choice].label}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Stance on the record</legend>
              {PRESS_REQUEST_STANCES.map((choice) => (
                <label key={choice}>
                  <input
                    type="radio"
                    name="press-request-stance"
                    checked={stance === choice}
                    onChange={() => setStance(choice)}
                  />
                  {PRESS_REQUEST_STANCE_COPY[choice].label}
                </label>
              ))}
            </fieldset>
            {pitch.ok ? (
              <blockquote data-testid="press-request-preview">
                {pitch.statement}
              </blockquote>
            ) : (
              <p role="status">{pitch.reason}</p>
            )}
            {reporterQuestion.ok ? (
              <blockquote data-testid="press-reporter-question-preview">
                {reporterQuestion.statement}
              </blockquote>
            ) : (
              <p role="status">{reporterQuestion.reason}</p>
            )}
            <button
              type="submit"
              disabled={
                !reporter || !topic || !pitch.ok || !reporterQuestion.ok
              }
            >
              Send request
            </button>
            <button
              type="button"
              data-testid="press-reporter-initiative"
              disabled={
                !reporter || !topic || !reporterQuestion.ok || !pitch.ok
              }
              onClick={() => {
                if (!topic || !reporter || !pitch.ok || !reporterQuestion.ok)
                  return;
                change(() => {
                  const result = recordPressRequest(world, {
                    stableKey: `press-inquiry:${controlledPersonId}:${world.actionSequence}`,
                    reporterPersonId: reporter.personId,
                    reporterWorkRoleId: reporter.workRoleId,
                    jurisdictionId: topic.jurisdictionId,
                    channel,
                    terms,
                    backgroundAttribution:
                      terms === "on-background" ? selectedAttribution : null,
                    pitch: `The reporter asked for comment on “${topic.summary}”.`,
                    primaryQuestion: reporterQuestion.statement,
                    questionBasisEventIds: [topic.eventId],
                  });
                  setRequestNotice(
                    "The reporter’s question is recorded. Acceptance is still pending.",
                  );
                  return result.world;
                });
              }}
            >
              Receive this reporter’s question
            </button>
          </form>
        </details>
      ) : null}
      {requests.length ? (
        <section aria-label="Your press requests">
          <h4>Your press requests</h4>
          <ul>
            {requests.map((request) => (
              <PressRequestActions
                key={request.id}
                world={world}
                request={request}
                onChange={change}
                onSelect={setSelected}
              />
            ))}
          </ul>
        </section>
      ) : null}
      {view ? <PressPreparationTimeControl world={world} /> : null}
      {view ? (
        <PressInterviewPanel
          view={view}
          onClose={() => setSelected(null)}
          onOpenPerson={onOpenPerson}
          onReviewPreparation={() =>
            change(() => {
              if (!view.adviserPersonId) return world;
              return producePressPreparation(world, {
                stableKey: `${view.activityId}:preparation`,
                activityId: view.activityId,
                adviserPersonId: view.adviserPersonId,
                sourceKnowledgeIds: world.history.knowledge
                  .filter(
                    (record) =>
                      record.personId === view.adviserPersonId &&
                      record.learnedAt <= world.currentDate &&
                      activity!.sourceEntityIds.includes(record.eventId),
                  )
                  .map((record) => record.id),
              });
            })
          }
          onRequestAdviserFeedback={() =>
            change(() => {
              if (!view.adviserPersonId) return world;
              return producePressAdviserFeedback(world, {
                stableKey: `${view.activityId}:feedback`,
                activityId: view.activityId,
                adviserPersonId: view.adviserPersonId,
              });
            })
          }
          onDraftResponse={(input) =>
            change(() => draftPressResponse(world, input))
          }
          onConfirmExactWording={(confirmedWording) =>
            change(() =>
              confirmPressResponse(world, {
                stableKey: `${view.activityId}:confirmed`,
                activityId: view.activityId,
                confirmedWording,
              }),
            )
          }
          onCompleteInterview={() =>
            change(() => completePressInterview(world, view.activityId))
          }
          onPublish={() =>
            change(() =>
              publishPressInterview(world, {
                stableKey: `${view.activityId}:publication`,
                activityId: view.activityId,
              }),
            )
          }
        />
      ) : activities.length ? (
        <ul>
          {activities.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => setSelected(item.id)}>
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No interviews are arranged in this life.</p>
      )}
    </section>
  );
}

/** Recorded participant decisions survive reload; local controls only propose an arrangement. */
function PressRequestActions({
  world,
  request,
  onChange,
  onSelect,
}: {
  world: World;
  request: HistoricalEvent;
  onChange: (run: () => World) => void;
  onSelect: (id: EntityId) => void;
}) {
  const [adviserId, setAdviserId] = useState("");
  const [delay, setDelay] = useState(60);
  const [duration, setDuration] = useState(30);
  const [preparation, setPreparation] = useState(30);
  const replies = world.history.events.filter((event) =>
    event.tags.includes(`press.request-event:${request.id}`),
  );
  const reporterReply = replies.find(
    (event) => event.type === "press.interview-request-answered",
  );
  const adviserReply = replies.find(
    (event) => event.type === "press.adviser-assignment-answered",
  );
  const source = request.participants.find(
    (participant) => participant.role === "agency:press-source",
  )!.personId;
  const advisers = projectEligiblePressAdvisers(world, source);
  const validTiming =
    [delay, duration].every(Number.isSafeInteger) &&
    delay >= 0 &&
    duration > 0 &&
    (adviserReply?.context.choice !== "accepted" ||
      (Number.isSafeInteger(preparation) && preparation > 0));
  const start = addSimulationMinutes(
    world.currentMoment,
    validTiming ? delay : 0,
  );
  const end = addSimulationMinutes(start, validTiming ? duration : 1);
  const allowed = reporterReply?.context.choice === "accepted";
  const requestChannel = PRESS_INTERVIEW_CHANNELS.find(
    (value) => value === request.context.choice,
  );
  const arrangementPlace = requestChannel
    ? plannedPressArrangementPlace(requestChannel)
    : null;
  return (
    <li data-testid="press-saved-request">
      <strong>{request.context.motivation}</strong>
      <p>{request.context.socialContext}</p>
      {reporterReply ? (
        <p>{reporterReply.context.socialContext}</p>
      ) : (
        <button
          type="button"
          data-testid="press-ask-reporter"
          onClick={() =>
            onChange(
              () =>
                producePressRequestResponse(world, {
                  stableKey: `${request.id}:reporter-response`,
                  requestEventId: request.id,
                }).world,
            )
          }
        >
          Ask the reporter for a response
        </button>
      )}
      {adviserReply ? (
        <p>{adviserReply.context.socialContext}</p>
      ) : (
        <>
          <label>
            Preparation adviser
            <GameSelect
              value={adviserId}
              onChange={(event) => setAdviserId(event.target.value)}
            >
              <option value="">Choose a colleague</option>
              {advisers.map((adviser) => (
                <option key={adviser.personId} value={adviser.personId}>
                  {adviser.personName} — {adviser.workRoleTitle}
                </option>
              ))}
            </GameSelect>
          </label>
          <button
            type="button"
            disabled={
              !advisers.some((adviser) => adviser.personId === adviserId) ||
              reporterReply?.context.choice !== "accepted"
            }
            onClick={() =>
              onChange(
                () =>
                  producePressAdviserResponse(world, {
                    stableKey: `${request.id}:adviser-response`,
                    requestEventId: request.id,
                    adviserPersonId: adviserId as EntityId,
                  }).world,
              )
            }
          >
            Ask for preparation help
          </button>
        </>
      )}
      {allowed ? (
        <details>
          <summary>Arrange the accepted exchange</summary>
          <label>
            Minutes from now
            <input
              type="number"
              min="0"
              step="1"
              value={delay}
              onChange={(event) => setDelay(Number(event.target.value))}
            />
          </label>
          <label>
            Exchange minutes
            <input
              type="number"
              min="1"
              step="1"
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
            />
          </label>
          <label>
            Preparation effort in minutes
            <input
              type="number"
              min="1"
              step="1"
              value={preparation}
              onChange={(event) => setPreparation(Number(event.target.value))}
            />
          </label>
          {arrangementPlace ? (
            <p data-testid="press-arrangement-place">
              Planned meeting place: {arrangementPlace.label}. This names the
              arranged channel and does not establish a room or anyone’s
              arrival.
            </p>
          ) : (
            <p role="status">
              The recorded request has no arranged channel to meet through.
            </p>
          )}
          <p>
            Proposed start: {proseDate(start.date)} at{" "}
            {formatMinute(start.minuteOfDay)}. This plan does not establish
            anyone’s arrival.
          </p>
          <button
            type="button"
            data-testid="press-arrange-exchange"
            disabled={
              !arrangementPlace ||
              ![delay, duration].every(Number.isSafeInteger) ||
              delay < 0 ||
              duration < 1 ||
              (adviserReply?.context.choice === "accepted" &&
                (!Number.isSafeInteger(preparation) || preparation < 1))
            }
            onClick={() =>
              onChange(() => {
                if (!arrangementPlace) return world;
                const prepared = adviserReply?.context.choice === "accepted";
                const result = arrangeAcceptedPressInterview(world, {
                  stableKey: `${request.id}:arrangement`,
                  requestEventId: request.id,
                  reporterResponseEventId: reporterReply!.id,
                  adviserResponseEventId: prepared ? adviserReply!.id : null,
                  start,
                  end,
                  preparationMinutes: prepared ? preparation : 0,
                  location: {
                    locationKey: `press-planned:${request.id}`,
                    label: arrangementPlace.label,
                  },
                });
                onSelect(result.activityId);
                return result.world;
              })
            }
          >
            Arrange exchange
          </button>
        </details>
      ) : null}
    </li>
  );
}
