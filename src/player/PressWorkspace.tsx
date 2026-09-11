import { composeFutureTransitionHandlerRegistries } from "../simulation/future-transitions";
import { LIFE_PATHS2_HANDLERS } from "../simulation/life-paths2";
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
  createCampaignElectionTransitionRegistry,
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
import { PressInterviewPanel } from "./PressInterviewPanel";

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
  const [pitch, setPitch] = useState("");
  const [question, setQuestion] = useState("");
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
    <section data-testid="normal-press-workspace" aria-label="Press interviews">
      <h3>Press interviews</h3>
      {problem ? <p role="status">{problem}</p> : null}
      {requestNotice ? <p role="status">{requestNotice}</p> : null}
      {controlledPersonId ? (
        <details data-testid="press-request-form">
          <summary>Request a press exchange</summary>
          <p>
            Choose a public civic development and a reporter who holds a current
            journalism role. A request does not establish acceptance. An adviser
            is optional unless you ask one to prepare you.
          </p>
          {reach.journalistCount === 0 ? (
            <p>
              No current journalism role is recorded in this life.
              <button
                type="button"
                onClick={() => change(() => seekCivicPressContact(world).world)}
              >
                Offer the authored civic reporting assignment
              </button>
            </p>
          ) : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!topic || !reporter) return;
              change(() => {
                const result = recordPressRequest(world, {
                  stableKey: `press-request:${controlledPersonId}:${world.actionSequence}`,
                  reporterPersonId: reporter.personId,
                  reporterWorkRoleId: reporter.workRoleId,
                  jurisdictionId: topic.jurisdictionId,
                  channel,
                  terms,
                  backgroundAttribution:
                    terms === "on-background" ? attribution : null,
                  pitch,
                  primaryQuestion: question,
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
              <select
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
              </select>
            </label>
            <label>
              Reporter
              <select
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
              </select>
            </label>
            {topic && reporters.length === 0 ? (
              <p>
                No current journalist can be asked about this public
                development.
              </p>
            ) : null}
            <label>
              Channel
              <select
                value={channel}
                onChange={(event) =>
                  setChannel(event.target.value as PressInterviewChannel)
                }
              >
                {PRESS_INTERVIEW_CHANNELS.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Record terms
              <select
                value={terms}
                onChange={(event) =>
                  setTerms(event.target.value as PressRecordTerms)
                }
              >
                {PRESS_RECORD_TERMS.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            {terms === "on-background" ? (
              <label>
                Proposed attribution
                <input
                  required
                  value={attribution}
                  onChange={(event) => setAttribution(event.target.value)}
                />
              </label>
            ) : null}
            <label>
              Your pitch
              <textarea
                required
                value={pitch}
                onChange={(event) => setPitch(event.target.value)}
              />
            </label>
            <label>
              Proposed question
              <textarea
                required
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={
                !reporter || !topic || !pitch.trim() || !question.trim()
              }
            >
              Send request
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
      {view ? (
        <div>
          <p>
            Preparation progresses as time passes and the assigned adviser’s
            available capacity.
          </p>
          <button
            type="button"
            onClick={() =>
              change(() =>
                advanceWorldMinutes(
                  world,
                  15,
                  composeFutureTransitionHandlerRegistries(
                    LIFE_PATHS2_HANDLERS,
                    createCampaignElectionTransitionRegistry(),
                  ),
                ),
              )
            }
          >
            Continue 15 minutes
          </button>
        </div>
      ) : null}
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
  const [place, setPlace] = useState("");
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
  return (
    <li data-testid="press-saved-request">
      <strong>{request.context.motivation}</strong>
      <p>{request.context.socialContext}</p>
      {reporterReply ? (
        <p>{reporterReply.context.socialContext}</p>
      ) : (
        <button
          type="button"
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
            <select
              value={adviserId}
              onChange={(event) => setAdviserId(event.target.value)}
            >
              <option value="">Choose a colleague</option>
              {advisers.map((adviser) => (
                <option key={adviser.personId} value={adviser.personId}>
                  {adviser.personName} — {adviser.workRoleTitle}
                </option>
              ))}
            </select>
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
          <label>
            Planned meeting place
            <input
              value={place}
              onChange={(event) => setPlace(event.target.value)}
            />
          </label>
          <p>
            Proposed start: {start.date} at{" "}
            {String(Math.floor(start.minuteOfDay / 60)).padStart(2, "0")}:
            {String(start.minuteOfDay % 60).padStart(2, "0")}. This plan does
            not establish anyone’s arrival.
          </p>
          <button
            type="button"
            disabled={
              !place.trim() ||
              ![delay, duration].every(Number.isSafeInteger) ||
              delay < 0 ||
              duration < 1 ||
              (adviserReply?.context.choice === "accepted" &&
                (!Number.isSafeInteger(preparation) || preparation < 1))
            }
            onClick={() =>
              onChange(() => {
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
                    label: place.trim(),
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
