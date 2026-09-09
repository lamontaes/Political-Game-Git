import { useState } from "react";
import {
  projectEligiblePressReporters,
  projectPublicInformationDigest,
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
  const topics = projectPublicInformationDigest(world).items;
  const topic = topics.find((item) => item.sourceEventId === basisId);
  const reporters =
    controlledPersonId && topic
      ? projectEligiblePressReporters(world, {
          sourcePersonId: controlledPersonId,
          questionBasisEventIds: [topic.sourceEventId],
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
            Choose a published story and a reporter who already knows its basis.
            A request does not establish acceptance.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!topic || !reporter) return;
              change(() => {
                const result = recordPressRequest(world, {
                  stableKey: `press-request:${controlledPersonId}:${world.actionSequence}`,
                  reporterPersonId: reporter.personId,
                  reporterWorkRoleId: reporter.workRoleId,
                  jurisdictionId:
                    world.history.events.find(
                      (entry) => entry.id === topic.sourceEventId,
                    )?.jurisdictionId ?? null,
                  channel,
                  terms,
                  backgroundAttribution:
                    terms === "on-background" ? attribution : null,
                  pitch,
                  primaryQuestion: question,
                  questionBasisEventIds: [topic.sourceEventId],
                });
                setRequestNotice(
                  "Request recorded. Awaiting the reporter’s response.",
                );
                return result.world;
              });
            }}
          >
            <label>
              Published story
              <select
                value={basisId}
                onChange={(event) => {
                  setBasisId(event.target.value);
                  setReporterRoleId("");
                }}
              >
                <option value="">Choose a story</option>
                {topics.map((item) => (
                  <option key={item.publicationId} value={item.sourceEventId}>
                    {item.headline}
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
                No eligible reporter with knowledge of this story is recorded.
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
              <li key={request.id}>
                {request.context.motivation}
                <p>{request.context.socialContext}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {view ? (
        <PressInterviewPanel
          view={view}
          onClose={() => setSelected(null)}
          onOpenPerson={onOpenPerson}
          preparationUnavailable="No adviser briefing content has been supplied for this saved interview."
          feedbackUnavailable="No adviser interpretation has been supplied for this saved publication."
          onReviewPreparation={() =>
            setProblem("No adviser briefing content is available.")
          }
          onRequestAdviserFeedback={() =>
            setProblem("No adviser interpretation is available.")
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
