import { useId, useState } from "react";
import {
  decideFederalDisasterDeclaration,
  decideInternationalCrisis,
  decideStateDisasterRequest,
  discloseHealthEpisode,
  type CrisisOptionKey,
  type EntityId,
  type HealthAccess,
  type World,
} from "../simulation";
import {
  authorityDecisions,
  knownHealthNotices,
  ownHealthNotices,
  publicCrisisEvents,
  type AuthorityDecision,
} from "../presentation/crisis-shell";
import { projectPeopleDirectory } from "../presentation/people-directory";
import { GameSelect } from "./controls/GameSelect";

/**
 * The CRISIS facts a player meets in ordinary play.
 *
 * Two mounts, because they answer two different questions. "personal" is what
 * this character's own life carries: an illness of their own and who knows
 * about it, what they have been told about somebody else, and the public
 * emergencies any resident can read. "authority" is the narrow set of
 * decisions the office they actually hold is being asked for — a resident
 * never sees one, because a resident is not being asked.
 *
 * Reading any of this commits nothing. Every choice here is an explicit click
 * on a named option, and every one of them calls the CRISIS writer for that
 * decision. Nothing here moves the clock.
 */
export function CrisisNoticesPanel({
  world,
  personId,
  onWorldChange,
  scope,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly scope: "personal" | "authority";
}) {
  const headingId = useId();
  const [notice, setNotice] = useState<string | null>(null);
  /** Which person a "tell specific people" disclosure would name. */
  const [recipient, setRecipient] = useState<Record<string, EntityId | "">>({});

  const controlled =
    world.control.kind === "person" && world.control.personId === personId;
  if (!controlled) return null;

  const act = (run: () => World, done: string) => {
    try {
      const next = run();
      if (next !== world) onWorldChange(next);
      setNotice(done);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "That decision could not be recorded.",
      );
    }
  };

  if (scope === "authority") {
    const decisions = authorityDecisions(world);
    return (
      <section aria-labelledby={headingId} data-testid="crisis-authority">
        <h3 id={headingId}>Decisions only you can make</h3>
        {decisions.length === 0 ? (
          <p className="game-note" data-testid="crisis-authority-empty">
            Nothing is waiting on the office you hold.
          </p>
        ) : (
          decisions.map((decision) => (
            <article key={decision.key} data-testid="crisis-decision">
              <h4>{decision.title}</h4>
              {decision.detail.map((line) => (
                <p key={line} className="game-note">
                  {line}
                </p>
              ))}
              <div className="game-choices">
                {decision.options.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className="ui-action"
                    onClick={() =>
                      act(
                        () => applyDecision(world, decision, option.key),
                        "Your decision was recorded.",
                      )
                    }
                  >
                    {option.label}
                    {option.recommended ? " (recommended)" : ""}
                    {option.note ? <small>{option.note}</small> : null}
                  </button>
                ))}
              </div>
            </article>
          ))
        )}
        {notice ? (
          <p role="status" data-testid="crisis-authority-notice">
            {notice}
          </p>
        ) : null}
      </section>
    );
  }

  const own = ownHealthNotices(world, personId);
  const known = knownHealthNotices(world, personId);
  const publicEvents = publicCrisisEvents(world);
  const people = projectPeopleDirectory(world, personId).people;

  return (
    <section aria-labelledby={headingId} data-testid="crisis-personal">
      <h3 id={headingId}>Health and emergencies</h3>

      <h4>Your health</h4>
      {own.length === 0 ? (
        <p className="game-note" data-testid="crisis-health-empty">
          No current record of an illness or injury.
        </p>
      ) : (
        own.map((episode) => {
          const chosen = recipient[episode.episodeId] ?? "";
          return (
            <article key={episode.episodeId} data-testid="crisis-health">
              <h5>{episode.headline}</h5>
              <p className="game-note">
                {episode.onsetLabel} {episode.stateLabel} {episode.accessLabel}
              </p>
              {episode.disclosures.length === 0 ? (
                <p className="game-note">
                  There is nothing further to disclose.
                </p>
              ) : (
                <div className="game-choices">
                  {episode.disclosures.map((disclosure) =>
                    disclosure.access === "specific-people" ? (
                      people.length === 0 ? (
                        <p key={disclosure.access} className="game-note">
                          There is nobody you know well enough to tell yet.
                        </p>
                      ) : (
                        <p key={disclosure.access}>
                          <GameSelect
                            aria-label="Who to tell"
                            value={chosen}
                            placeholder="Choose someone"
                            onChange={(event) =>
                              setRecipient((current) => ({
                                ...current,
                                [episode.episodeId]: event.target
                                  .value as EntityId,
                              }))
                            }
                          >
                            {people.map((person) => (
                              <option
                                key={person.personId}
                                value={person.personId}
                              >
                                {person.name}
                              </option>
                            ))}
                          </GameSelect>
                          <button
                            type="button"
                            className="ui-action"
                            aria-disabled={chosen === "" || undefined}
                            onClick={() =>
                              chosen === ""
                                ? setNotice("Choose who to tell first.")
                                : act(
                                    () =>
                                      disclose(
                                        world,
                                        episode.episodeId,
                                        personId,
                                        "specific-people",
                                        [chosen],
                                      ),
                                    "They were told.",
                                  )
                            }
                          >
                            {disclosure.label}
                          </button>
                        </p>
                      )
                    ) : (
                      <button
                        key={disclosure.access}
                        type="button"
                        className="ui-action"
                        onClick={() =>
                          act(
                            () =>
                              disclose(
                                world,
                                episode.episodeId,
                                personId,
                                disclosure.access,
                                [],
                              ),
                            "It was disclosed.",
                          )
                        }
                      >
                        {disclosure.label}
                      </button>
                    ),
                  )}
                </div>
              )}
            </article>
          );
        })
      )}

      <h4>What you have been told</h4>
      {known.length === 0 ? (
        <p className="game-note" data-testid="crisis-known-empty">
          Nobody has told you about their health.
        </p>
      ) : (
        <ul data-testid="crisis-known">
          {known.map((entry) => (
            <li key={entry.key}>
              {entry.personLabel}: {entry.headline.toLowerCase()}.{" "}
              {entry.toldLabel} {entry.accessLabel}
            </li>
          ))}
        </ul>
      )}

      <h4>Declared emergencies</h4>
      {publicEvents.length === 0 ? (
        <p className="game-note" data-testid="crisis-public-empty">
          No public emergency has been recorded recently.
        </p>
      ) : (
        <ul data-testid="crisis-public">
          {publicEvents.map((event) => (
            <li key={event.key}>
              {event.dateLabel}: {event.summary}
            </li>
          ))}
        </ul>
      )}

      {notice ? (
        <p role="status" data-testid="crisis-personal-notice">
          {notice}
        </p>
      ) : null}
    </section>
  );
}

function disclose(
  world: World,
  episodeId: EntityId,
  personId: EntityId,
  access: Exclude<HealthAccess, "private">,
  recipientIds: readonly EntityId[],
): World {
  return discloseHealthEpisode(world, {
    // Access can only widen, so one key per level is stable and unique.
    stableKey: `player:${access}`,
    episodeId,
    access,
    recipientIds,
    decidedByPersonId: personId,
  });
}

function applyDecision(
  world: World,
  decision: AuthorityDecision,
  optionKey: string,
): World {
  switch (decision.kind) {
    case "disaster-state-request":
      return decideStateDisasterRequest(
        world,
        decision.subjectId,
        optionKey === "request" ? "request" : "decline",
      );
    case "disaster-federal-declaration":
      return decideFederalDisasterDeclaration(
        world,
        decision.subjectId,
        optionKey === "declare" ? "declare" : "deny",
      );
    case "international-decision":
      return decideInternationalCrisis(
        world,
        decision.subjectId,
        optionKey as CrisisOptionKey,
      );
  }
}
