import { useState } from "react";
import {
  answerAfterOfficeEndorsementScene,
  projectAfterOfficeEndorsementScenes,
} from "../simulation/after-office-endorsements";
import type { EntityId, World } from "../simulation";

/** Player controls for recorded endorsement requests in the ordinary People surface. */
export function AfterOfficeEndorsementPanel({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  const scenes = projectAfterOfficeEndorsementScenes(world, personId);
  if (scenes.length === 0 && note === null) return null;

  return (
    <section
      className="pg-personal-section"
      aria-label="Endorsement requests"
      data-testid="after-office-endorsements"
    >
      <h3>Endorsement requests</h3>
      {note ? (
        <p role="status" data-testid="endorsement-answer-note">
          {note}
        </p>
      ) : null}
      {scenes.map((scene) => (
        // Session 4's scene composer is not on main yet. Keep the player reply
        // controls live and expose the saved packet as structured data here.
        <article
          key={scene.requestEventId}
          data-testid={`endorsement-request-${scene.requestEventId}`}
          data-request-event-id={scene.requestEventId}
        >
          <h4>Endorsement request</h4>
          <ul aria-label="Saved scene facts">
            {scene.facts.map((fact) => (
              <li
                key={fact.sourceEventId}
                data-testid={`endorsement-fact-${fact.sourceEventId}`}
                data-source-event-id={fact.sourceEventId}
                data-visibility={fact.visibility}
              >
                {fact.summary}
              </li>
            ))}
          </ul>
          <ul aria-label="People present">
            {scene.peoplePresent.map((person) => (
              <li
                key={`${person.personId}:${person.role}`}
                data-testid={`endorsement-person-${person.personId}`}
                data-person-id={person.personId}
                data-role={person.role}
              >
                {person.personId} — {person.role}
              </li>
            ))}
          </ul>
          <ul aria-label="Recorded scene lines">
            {scene.lines.map((line) => (
              <li
                key={`${line.sourceEventId}:${line.speakerPersonId}`}
                data-testid={`endorsement-line-${line.sourceEventId}`}
                data-speaker-person-id={line.speakerPersonId}
                data-source-event-id={line.sourceEventId}
                data-speech-act={line.speechAct}
              >
                {line.speakerPersonId}: {line.speechAct} ({line.sourceEventId})
              </li>
            ))}
          </ul>
          <div className="pg-contact-actions">
            {scene.replies.map((reply) => (
              <button
                key={reply.optionKey}
                type="button"
                className={
                  reply.optionKey === "endorse"
                    ? "ui-action ui-action--primary"
                    : "ui-action"
                }
                data-testid={`endorsement-reply-${reply.optionKey.replaceAll(":", "-")}`}
                onClick={() => {
                  try {
                    const answer = answerAfterOfficeEndorsementScene(world, {
                      stableKey: `player:after-office:${scene.requestEventId}:${reply.optionKey}`,
                      formerOfficialPersonId: personId,
                      candidatePersonId: scene.candidatePersonId,
                      campaignId: scene.campaignId,
                      requestEventId: scene.requestEventId,
                      optionKey: reply.optionKey,
                    });
                    setNote(
                      reply.optionKey === "decline"
                        ? "You declined the endorsement request."
                        : reply.optionKey.startsWith("repay:")
                          ? "You endorsed the candidate and returned their earlier help."
                          : "You endorsed the candidate.",
                    );
                    onWorldChange(answer.world);
                  } catch (error) {
                    setNote(
                      error instanceof Error ? error.message : String(error),
                    );
                  }
                }}
              >
                {reply.label}
              </button>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
