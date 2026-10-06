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
        <article
          key={scene.requestEventId}
          data-testid={`endorsement-request-${scene.requestEventId}`}
        >
          <p>{scene.candidateName} asks you to endorse their campaign.</p>
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
