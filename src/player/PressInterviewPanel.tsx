import { useEffect, useRef, useState } from "react";

import { civicGlossaryEntry } from "../presentation/civic-glossary";
import type { CivicGlossaryEntry } from "../presentation/civic-glossary";
import type {
  DraftPressResponseInput,
  PressInterviewProjection,
  PressPlayMode,
  PressResponseIntent,
} from "../simulation";
import type { EntityId } from "../simulation";

export interface PressInterviewPanelProps {
  readonly view: PressInterviewProjection;
  readonly preparationUnavailable?: string;
  readonly feedbackUnavailable?: string;
  readonly onClose: () => void;
  readonly onOpenPerson: (personId: EntityId) => void;
  /** Records already-completed staff preparation; it does not create it. */
  readonly onReviewPreparation: () => void;
  readonly onDraftResponse: (input: DraftPressResponseInput) => void;
  readonly onConfirmExactWording: (wording: string) => void;
  readonly onCompleteInterview: () => void;
  readonly onPublish: () => void;
  readonly onRequestAdviserFeedback: () => void;
}

const INTENT_COPY: Readonly<
  Record<
    PressResponseIntent,
    { readonly label: string; readonly detail: string }
  >
> = {
  "answer-directly": {
    label: "Answer directly",
    detail: "Respond to the question as asked.",
  },
  "add-context": {
    label: "Add context",
    detail: "Answer while making an important limit or distinction explicit.",
  },
  "challenge-premise": {
    label: "Challenge the premise",
    detail: "State what is unsupported before giving the grounded answer.",
  },
};

/**
 * Feature-local press surface. UI-core chooses if and where it is mounted.
 * Local state holds only uncommitted form choices; every durable stage is read
 * back from canonical World through `PressInterviewProjection`.
 */
export function PressInterviewPanel({
  view,
  onClose,
  preparationUnavailable,
  feedbackUnavailable,
  onOpenPerson,
  onReviewPreparation,
  onDraftResponse,
  onConfirmExactWording,
  onCompleteInterview,
  onPublish,
  onRequestAdviserFeedback,
}: PressInterviewPanelProps) {
  const [mode, setMode] = useState<PressPlayMode>("interactive");
  const [intent, setIntent] = useState<PressResponseIntent>("answer-directly");
  const [followUpQuestion, setFollowUpQuestion] = useState(
    view.likelyFollowUps[0] ?? view.primaryQuestion,
  );
  const [wording, setWording] = useState("");
  const [activeConcept, setActiveConcept] = useState<CivicGlossaryEntry | null>(
    null,
  );
  const closeRef = useRef<HTMLButtonElement>(null);
  const helpCloseRef = useRef<HTMLButtonElement>(null);
  const helpTriggerRef = useRef<HTMLButtonElement | null>(null);
  const returnHelpFocusRef = useRef(false);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    if (activeConcept) helpCloseRef.current?.focus();
    else if (returnHelpFocusRef.current) {
      returnHelpFocusRef.current = false;
      helpTriggerRef.current?.focus();
    }
  }, [activeConcept]);

  function closeHelp(): void {
    returnHelpFocusRef.current = true;
    setActiveConcept(null);
  }

  function openTermsHelp(trigger: HTMLButtonElement): void {
    const entry = civicGlossaryEntry(view.terms);
    if (!entry) return;
    helpTriggerRef.current = trigger;
    setActiveConcept(entry);
  }

  const unprepared = view.adviserPersonId === null;
  const preparationReady =
    view.preparationStatus === "ready-for-review" ||
    view.preparationStatus === "completed";
  const preparationRecorded = view.knownFacts.length > 0;
  const drafted = view.proposedWording !== null;
  const confirmed = view.confirmedWording !== null;
  const mayAnswer = preparationRecorded || unprepared;

  return (
    <section
      className="press-interview-panel public-information-panel civic-glass"
      role="dialog"
      aria-modal="false"
      aria-labelledby="press-interview-title"
      data-testid="press-interview-panel"
      data-press-stage={
        view.adviserFeedback
          ? "feedback"
          : view.publicationId
            ? "published"
            : view.completed
              ? "completed"
              : confirmed
                ? "confirmed"
                : drafted
                  ? "drafted"
                  : preparationRecorded
                    ? "prepared"
                    : "arranged"
      }
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        if (activeConcept) closeHelp();
        else onClose();
      }}
    >
      <header className="public-information-header">
        <div>
          <p className="public-information-kicker">Arranged press exchange</p>
          <h2 id="press-interview-title">
            {view.channel === "written" ? "Written questions" : "Interview"}
          </h2>
          <p>
            With{" "}
            <button
              type="button"
              data-person-id={view.reporterPersonId}
              onClick={() => onOpenPerson(view.reporterPersonId)}
            >
              {view.reporterName}
            </button>
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          aria-label="Close press interview"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <section aria-labelledby="press-ground-rules-title">
        <h3 id="press-ground-rules-title">Agreed before the exchange</h3>
        <p>{view.pitch}</p>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`Explain ${termsLabel(view.terms)}`}
          onClick={(event) => openTermsHelp(event.currentTarget)}
        >
          {termsLabel(view.terms)} <span aria-hidden="true">· i</span>
        </button>
        {view.backgroundAttribution ? (
          <p>
            Attribution: <strong>{view.backgroundAttribution}</strong>
          </p>
        ) : null}
        <p>
          Question: <strong>{view.primaryQuestion}</strong>
        </p>
      </section>

      {!unprepared && !preparationRecorded ? (
        <section aria-labelledby="press-preparation-title">
          <h3 id="press-preparation-title">Preparation</h3>
          {preparationReady ? (
            <button
              type="button"
              disabled={!!preparationUnavailable}
              title={preparationUnavailable}
              onClick={onReviewPreparation}
            >
              Review {view.adviserName}&apos;s preparation
            </button>
          ) : (
            <p>
              {view.adviserName} is handling the scheduled preparation work. It
              will be available after that actual work is ready for review.
            </p>
          )}
        </section>
      ) : (
        <PreparationBrief view={view} onOpenPerson={onOpenPerson} />
      )}

      {mayAnswer && !drafted ? (
        <section aria-labelledby="press-response-title">
          <h3 id="press-response-title">Choose how to answer</h3>
          <div role="group" aria-label="Interview presentation">
            {(["interactive", "condensed"] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                aria-pressed={mode === choice}
                onClick={() => setMode(choice)}
              >
                {choice === "interactive" ? "Interactive" : "Condensed"}
              </button>
            ))}
          </div>
          {mode === "condensed" ? (
            <p data-testid="condensed-explanation">
              Condensed play completes the same arranged exchange. It is not a
              refusal and carries no automatic penalty.
            </p>
          ) : null}

          <div role="group" aria-label="Response intent">
            {(Object.keys(INTENT_COPY) as PressResponseIntent[]).map(
              (choice) => (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={intent === choice}
                  onClick={() => setIntent(choice)}
                >
                  {INTENT_COPY[choice].label}
                  <small>{INTENT_COPY[choice].detail}</small>
                </button>
              ),
            )}
          </div>

          <label>
            Follow-up being answered
            <input
              value={followUpQuestion}
              onChange={(event) =>
                setFollowUpQuestion(event.currentTarget.value)
              }
            />
          </label>
          <label>
            Consequential wording
            <textarea
              value={wording}
              onChange={(event) => setWording(event.currentTarget.value)}
            />
          </label>
          <button
            type="button"
            disabled={!followUpQuestion.trim() || !wording.trim()}
            onClick={() =>
              onDraftResponse({
                stableKey: `press-ui:${view.activityId}:draft`,
                activityId: view.activityId,
                mode,
                intent,
                followUpQuestion: followUpQuestion.trim(),
                proposedWording: wording.trim(),
              })
            }
          >
            Review exact wording
          </button>
        </section>
      ) : null}

      {drafted && !confirmed ? (
        <section aria-labelledby="press-confirmation-title">
          <h3 id="press-confirmation-title">Confirm the exact answer</h3>
          <blockquote data-testid="press-exact-wording">
            {view.proposedWording}
          </blockquote>
          <p>
            This confirms what the source says. It does not grant editorial
            review or approval of the later story.
          </p>
          <button
            type="button"
            onClick={() => onConfirmExactWording(view.proposedWording!)}
          >
            Confirm this exact wording
          </button>
        </section>
      ) : null}

      {confirmed && !view.completed ? (
        <button type="button" onClick={onCompleteInterview}>
          Complete arranged exchange
        </button>
      ) : null}

      {view.completed && view.publicationId === null ? (
        view.terms === "off-record" ? (
          <p data-testid="off-record-unpublished">
            This exchange is complete and remains unpublished under the agreed
            terms.
          </p>
        ) : (
          <button type="button" onClick={onPublish}>
            Record published report
          </button>
        )
      ) : null}

      {view.publicationId && !view.adviserFeedback && view.adviserPersonId ? (
        <button
          type="button"
          disabled={!!feedbackUnavailable}
          title={feedbackUnavailable}
          onClick={onRequestAdviserFeedback}
        >
          Ask adviser about the published story
        </button>
      ) : null}
      {view.adviserFeedback ? (
        <section aria-labelledby="press-feedback-title">
          <h3 id="press-feedback-title">Adviser&apos;s reading</h3>
          <p>{view.adviserFeedback}</p>
          <p>
            This is {view.adviserName}&apos;s interpretation of an actual story,
            not a poll result or proof that the interview caused a reaction.
          </p>
        </section>
      ) : null}

      {activeConcept ? (
        <aside
          className="public-information-help"
          role="dialog"
          aria-modal="false"
          aria-labelledby="press-help-title"
          data-testid="press-terms-help"
        >
          <header>
            <h3 id="press-help-title">{activeConcept.label}</h3>
            <button
              ref={helpCloseRef}
              type="button"
              aria-label={`Close ${activeConcept.label} explanation`}
              onClick={closeHelp}
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>
          <p>{activeConcept.fullDefinition}</p>
          <small>{activeConcept.sourceLabel}</small>
          <p>Reading this explanation does not change the saved agreement.</p>
        </aside>
      ) : null}
    </section>
  );
}

function PreparationBrief({
  view,
  onOpenPerson,
}: {
  readonly view: PressInterviewProjection;
  readonly onOpenPerson: (personId: EntityId) => void;
}) {
  return (
    <section aria-labelledby="press-prepared-title">
      <h3 id="press-prepared-title">
        Preparation from{" "}
        <button
          type="button"
          data-person-id={view.adviserPersonId}
          onClick={() => {
            if (view.adviserPersonId) onOpenPerson(view.adviserPersonId);
          }}
        >
          {view.adviserName}
        </button>
      </h3>
      <h4>Known facts</h4>
      <ul>
        {view.knownFacts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
      <h4>Likely follow-ups</h4>
      <ul>
        {view.likelyFollowUps.map((question) => (
          <li key={question}>{question}</li>
        ))}
      </ul>
      <h4>Response options</h4>
      <ul>
        {view.responseOptions.map((option) => (
          <li key={option}>{option}</li>
        ))}
      </ul>
      <p>
        These are preparation options, not a promise of favorable coverage or
        public reception.
      </p>
    </section>
  );
}

function termsLabel(terms: PressInterviewProjection["terms"]): string {
  if (terms === "on-record") return "On the record";
  if (terms === "on-background") return "On background";
  return "Off the record";
}
