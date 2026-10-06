import type { GroundedEnglishPacket } from "../../../src/presentation/grounded-english";
import { useState } from "react";
import { createRoot } from "react-dom/client";

import { PressInterviewPanel } from "../../../src/player/PressInterviewPanel";
import type {
  DraftPressResponseInput,
  EntityId,
  PressInterviewProjection,
} from "../../../src/simulation";

const REPORTER_ID = "person_press_reporter" as EntityId;
const SUBJECT_ID = "person_press_subject" as EntityId;
const ADVISER_ID = "person_press_adviser" as EntityId;
const ACTIVITY_ID = "scheduled_press_interview" as EntityId;
const WORK_ID = "work_press_preparation" as EntityId;

const PREPARED: PressInterviewProjection = {
  activityId: ACTIVITY_ID,
  arrangementEventId: "fixture:arrangement" as EntityId,
  preparationEventId: "fixture:preparation" as EntityId,
  preparationKnowledgeIds: ["fixture:knowledge" as EntityId],
  reporterPersonId: REPORTER_ID,
  reporterName: "Avery Brooks",
  subjectPersonId: SUBJECT_ID,
  subjectName: "Morgan Raymond",
  adviserPersonId: ADVISER_ID,
  adviserName: "Logan Higgins",
  channel: "written",
  terms: "on-background",
  backgroundAttribution: "a legislative office official",
  pitch: "Discuss the proposal already raised at the public briefing.",
  primaryQuestion: "What would the proposal change, and what remains open?",
  preparationWorkItemId: WORK_ID,
  preparationStatus: "ready-for-review",
  knownFacts: ["The proposal was discussed at a public briefing."],
  likelyFollowUps: ["Which details are not yet decided?"],
  responseOptions: ["Answer directly.", "Add the unresolved limit."],
  mode: null,
  intent: null,
  followUpQuestion: null,
  proposedWording: null,
  confirmedWording: null,
  completed: false,
  publicationId: null,
  adviserFeedback: null,
  condensedPenaltyApplied: false,
};

// Explicit authored UI fixture packet; normal play builds this from canonical records.
const facts = Object.fromEntries(
  [
    ...PREPARED.knownFacts,
    PREPARED.primaryQuestion,
    ...PREPARED.likelyFollowUps,
  ].map((text, index) => [
    `fixture-${index}`,
    { text, sourceRecordIds: [`fixture:record:${index}` as EntityId] },
  ]),
);
const ANSWER_PACKET: GroundedEnglishPacket = {
  surface: "dialogue",
  worldSeed: "fixture:press-panel",
  bankVersion: "1",
  stage: "press-answer",
  momentKey: "fixture:prepared",
  sourceRecordIds: [PREPARED.arrangementEventId, PREPARED.preparationEventId!],
  speaker: { personId: SUBJECT_ID, traits: {} },
  viewer: { personId: REPORTER_ID, traits: {} },
  facts,
  knowledge: Object.entries(facts).map(([factKey, fact]) => ({
    personId: SUBJECT_ID,
    factKey,
    sourceRecordIds: fact.sourceRecordIds,
  })),
};

function Fixture() {
  const [view, setView] = useState(PREPARED);
  const [open, setOpen] = useState(true);
  if (!open) return <p>Press panel closed.</p>;

  return (
    <PressInterviewPanel
      answerPacket={ANSWER_PACKET}
      view={view}
      onClose={() => {
        document.body.dataset.panelClosed = "true";
        setOpen(false);
      }}
      onOpenPerson={(personId) => {
        document.body.dataset.openedPersonId = personId;
      }}
      onReviewPreparation={() => undefined}
      onDraftResponse={(input: DraftPressResponseInput) => {
        document.body.dataset.draftedMode = input.mode;
        document.body.dataset.draftedIntent = input.intent;
        document.body.dataset.draftedFollowUp = input.followUpQuestion;
        setView({
          ...view,
          mode: input.mode,
          intent: input.intent,
          followUpQuestion: input.followUpQuestion,
          proposedWording: input.proposedWording,
        });
      }}
      onConfirmExactWording={(wording) => {
        document.body.dataset.confirmedWording = wording;
        setView({ ...view, confirmedWording: wording });
      }}
      onCompleteInterview={() => undefined}
      onPublish={() => undefined}
      onRequestAdviserFeedback={() => undefined}
    />
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
