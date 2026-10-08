import {
  answerAfterOfficeEndorsementScene,
  projectAfterOfficeEndorsementScenes,
} from "../simulation/after-office-endorsements";
import { personName } from "../simulation/people";
import type { EntityId, World } from "../simulation";

/**
 * Player controls for recorded endorsement requests in the ordinary People
 * surface. Menu reset (MR-6): record data and control names only. Each
 * request shows the candidate's name, the saved request's own summary, the
 * people present by name, and the recorded replies as its buttons. The saved
 * scene lines (speaker, speech act, source event) ride on data attributes
 * until the English engine says them; nothing here writes a sentence.
 */
export function AfterOfficeEndorsementPanel({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const scenes = projectAfterOfficeEndorsementScenes(world, personId);
  if (scenes.length === 0) return null;
  const nameOf = (id: EntityId) => {
    const record = world.people?.[id];
    return record ? personName(record) : null;
  };

  return (
    <section
      className="pg-personal-section"
      data-testid="after-office-endorsements"
    >
      {scenes.map((scene) => (
        <article
          key={scene.requestEventId}
          data-testid={`endorsement-request-${scene.requestEventId}`}
          data-request-event-id={scene.requestEventId}
        >
          <h4>{scene.candidateName}</h4>
          <ul>
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
          <ul>
            {scene.peoplePresent.map((person) => (
              <li
                key={`${person.personId}:${person.role}`}
                data-testid={`endorsement-person-${person.personId}`}
                data-person-id={person.personId}
                data-role={person.role}
              >
                {nameOf(person.personId)}
              </li>
            ))}
          </ul>
          <ul hidden>
            {scene.lines.map((line) => (
              <li
                key={`${line.sourceEventId}:${line.speakerPersonId}`}
                data-testid={`endorsement-line-${line.sourceEventId}`}
                data-speaker-person-id={line.speakerPersonId}
                data-source-event-id={line.sourceEventId}
                data-speech-act={line.speechAct}
              />
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
                  // A refusal changes nothing, so the request stays open.
                  try {
                    const answer = answerAfterOfficeEndorsementScene(world, {
                      stableKey: `player:after-office:${scene.requestEventId}:${reply.optionKey}`,
                      formerOfficialPersonId: personId,
                      candidatePersonId: scene.candidatePersonId,
                      campaignId: scene.campaignId,
                      requestEventId: scene.requestEventId,
                      optionKey: reply.optionKey,
                    });
                    onWorldChange(answer.world);
                  } catch {
                    return;
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
