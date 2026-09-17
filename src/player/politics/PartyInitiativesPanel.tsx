import { useId, useRef, useState, type FormEvent } from "react";

import {
  decideInPartyBody,
  projectPartyBodyQuestions,
  projectPartyInitiatives,
  proposeNewParty,
  takePartyInitiativeAction,
} from "../../presentation/party-initiatives";
import type { EntityId, PartyUnitLevel, World } from "../../simulation";
import { GameSelect } from "../controls/GameSelect";

import "./party-initiatives.css";

/**
 * Politics > Parties: party initiatives the player can see and act on
 * (CRUNCH46 UI mount of the WORLD46 party-initiative adapter).
 *
 * Every button is an explicit choice routed to a WORLD46 command. A command
 * that refuses leaves the World exactly as it was and its reason is shown in
 * a status note; nothing here invents a party, a place or a result.
 */

export interface PartyJurisdictionChoice {
  readonly value: EntityId;
  readonly label: string;
}

export const PARTY_LEVELS: readonly {
  readonly value: PartyUnitLevel;
  readonly label: string;
}[] = [
  { value: "local", label: "Local" },
  { value: "state", label: "State" },
  { value: "national", label: "National" },
];

function isStateKind(kind: string): boolean {
  return kind === "state" || kind.startsWith("state-");
}

function isNationalKind(kind: string): boolean {
  return kind === "federal" || kind === "nation" || kind === "country";
}

/**
 * The places this World already holds that fit a level: states for a state
 * party, other places for a local one, and none for a national one (it is not
 * tied to a place). The player's own home place, or its state, comes first.
 */
export function partyJurisdictionChoices(
  world: World,
  personId: EntityId,
  level: PartyUnitLevel,
): readonly PartyJurisdictionChoice[] {
  if (level === "national") return [];
  const homeId = world.people[personId]?.homeJurisdictionId ?? null;
  const home = homeId ? world.jurisdictions[homeId] : undefined;
  const homeState = home?.parentName ?? home?.name.split(", ")[1] ?? null;
  const rank = (choice: PartyJurisdictionChoice) =>
    choice.value === homeId ? 0 : choice.label === homeState ? 1 : 2;
  return world.jurisdictionOrder
    .flatMap((id) => {
      const place = world.jurisdictions[id];
      if (!place || isNationalKind(place.kind)) return [];
      const fits =
        level === "state" ? isStateKind(place.kind) : !isStateKind(place.kind);
      return fits ? [{ value: id, label: place.name }] : [];
    })
    .sort(
      (left, right) =>
        rank(left) - rank(right) || left.label.localeCompare(right.label),
    );
}

/** The reason a refused command gives, in words a player can read. */
export function commandRefusal(error: unknown): string {
  const message = error instanceof Error ? error.message.trim() : "";
  return message || "That could not be done.";
}

export function PartyInitiativesPanel({
  world,
  personId,
  onWorldChange,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
}) {
  const formId = useId();
  const [note, setNote] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [level, setLevel] = useState<PartyUnitLevel>("local");
  const [place, setPlace] = useState<EntityId | "">("");
  const nameRef = useRef<HTMLInputElement>(null);
  // The pressed button may vanish once answered; focus returns to the panel.
  const headingRef = useRef<HTMLHeadingElement>(null);

  const controlled =
    world.control.kind === "person" && world.control.personId === personId;
  const initiatives = projectPartyInitiatives(world, personId);
  const bodies = projectPartyBodyQuestions(world, personId);
  const places = partyJurisdictionChoices(world, personId, level);
  const chosenPlace = places.some((choice) => choice.value === place)
    ? place
    : (places[0]?.value ?? "");

  const run = (command: () => World, done: string): boolean => {
    try {
      if (!controlled) {
        throw new Error("Only the person you are playing can do this.");
      }
      const next = command();
      if (next !== world) onWorldChange(next);
      setNote(done);
      return true;
    } catch (error) {
      setNote(commandRefusal(error));
      return false;
    }
  };

  const propose = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNote("Give the new party a name first.");
      nameRef.current?.focus();
      return;
    }
    if (level !== "national" && !chosenPlace) {
      setNote("No place in this game fits that level.");
      return;
    }
    const proposed = run(
      () =>
        proposeNewParty(world, personId, {
          name: trimmed,
          level,
          jurisdictionId: level === "national" ? null : chosenPlace || null,
        }),
      `You proposed forming ${trimmed}.`,
    );
    if (proposed) setName("");
  };

  return (
    <section
      className="pg-party-initiatives"
      aria-labelledby={`${formId}-title`}
      data-testid="party-initiatives"
    >
      <h2 id={`${formId}-title`} ref={headingRef} tabIndex={-1}>
        Party proposals
      </h2>
      {initiatives.length > 0 ? (
        <ul
          className="pg-party-initiative-list"
          data-testid="party-initiative-list"
        >
          {initiatives.map((item) => (
            <li
              key={item.id}
              data-testid={`party-initiative-${item.id}`}
              data-stage={item.stage}
            >
              <strong>{item.title}</strong>
              <span className="pg-party-initiative-meta">
                {item.stage === "adopted" ? "Adopted" : "Open"} · Proposed by{" "}
                {item.proposerName} on {item.proposedOnLabel}
                {item.adoptedOnLabel
                  ? ` · Adopted on ${item.adoptedOnLabel}`
                  : ""}
              </span>
              {item.actions.length > 0 ? (
                <span className="pg-party-initiative-actions">
                  {item.actions.map((action) => (
                    <button
                      key={
                        action.kind === "adopt"
                          ? "adopt"
                          : `${action.response}:${action.actingForOrganizationId ?? ""}`
                      }
                      type="button"
                      data-testid={`party-initiative-action-${item.id}-${
                        action.kind === "adopt" ? "adopt" : action.response
                      }`}
                      onClick={() =>
                        run(
                          () =>
                            takePartyInitiativeAction(
                              world,
                              personId,
                              item.id,
                              action,
                            ),
                          action.kind === "adopt"
                            ? "The proposal was put to a decision."
                            : `Recorded your answer: ${action.label}.`,
                        ) && headingRef.current?.focus()
                      }
                    >
                      {action.label}
                    </button>
                  ))}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="game-note" data-testid="party-initiatives-none">
          No party proposals involve you yet.
        </p>
      )}

      <form
        className="pg-party-propose"
        aria-labelledby={`${formId}-propose`}
        data-testid="party-propose"
        onSubmit={propose}
      >
        <h3 id={`${formId}-propose`}>Propose a new party</h3>
        <label htmlFor={`${formId}-name`}>Name</label>
        <input
          ref={nameRef}
          id={`${formId}-name`}
          data-testid="party-propose-name"
          type="text"
          value={name}
          autoComplete="off"
          onChange={(event) => setName(event.target.value)}
        />
        <span id={`${formId}-level-label`}>Level</span>
        <GameSelect
          aria-labelledby={`${formId}-level-label`}
          data-testid="party-propose-level"
          value={level}
          options={PARTY_LEVELS.map((choice) => ({
            ...choice,
            disabled: false,
          }))}
          onChange={(event) => {
            setLevel(event.target.value as PartyUnitLevel);
            setPlace("");
          }}
        />
        {level === "national" ? (
          <p className="game-note">A national party is not tied to a place.</p>
        ) : places.length > 0 ? (
          <>
            <span id={`${formId}-place-label`}>Place</span>
            <GameSelect
              aria-labelledby={`${formId}-place-label`}
              data-testid="party-propose-place"
              value={chosenPlace}
              options={places.map((choice) => ({
                ...choice,
                disabled: false,
              }))}
              onChange={(event) => setPlace(event.target.value as EntityId)}
            />
          </>
        ) : (
          <p className="game-note" data-testid="party-propose-no-place">
            No place in this game fits that level.
          </p>
        )}
        <button type="submit" data-testid="party-propose-submit">
          Propose
        </button>
      </form>

      {bodies.length > 0 ? (
        <div className="pg-party-bodies" data-testid="party-bodies">
          <h3>Decisions in your party bodies</h3>
          {bodies.map((body) => (
            <section
              key={body.organizationId}
              aria-label={body.name}
              data-testid={`party-body-${body.organizationId}`}
            >
              <h4>{body.name}</h4>
              {body.questions.map((question) => (
                <fieldset key={question.key}>
                  <legend>{question.label}</legend>
                  {question.options.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      data-testid={`party-body-choice-${body.organizationId}-${question.key}-${option.key}`}
                      onClick={() =>
                        run(
                          () =>
                            decideInPartyBody(
                              world,
                              body.organizationId,
                              question.key,
                              option.key,
                            ),
                          `Recorded your choice: ${option.label}.`,
                        )
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </fieldset>
              ))}
            </section>
          ))}
        </div>
      ) : null}

      <p
        className="pg-party-initiatives-note"
        role="status"
        data-testid="party-initiatives-status"
      >
        {note ?? ""}
      </p>
    </section>
  );
}
