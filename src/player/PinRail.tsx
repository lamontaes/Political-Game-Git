import { useEffect, useRef } from "react";

import type { QuickDossierProjection } from "../presentation/run-a-projection";
import {
  resolveRunAPinSize,
  type RunAPersonPinId,
  type RunAPinId,
  type RunAPinSize,
  type RunAUiAction,
  type RunAUiState,
} from "../presentation/run-a-state";
import type { EntityId } from "../simulation";

interface PinDefinition {
  readonly id: RunAPinId;
  readonly shortLabel: string;
  readonly label: string;
  readonly detail: string;
  readonly kind: string;
  readonly personId: EntityId;
}

export interface PinnedPersonDefinition {
  readonly pinId: RunAPersonPinId;
  readonly personId: EntityId;
  readonly dossier: Pick<QuickDossierProjection, "name" | "title">;
}

function personInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
}

function pinsForPeople(
  people: readonly PinnedPersonDefinition[],
  pinnedPersonIds: readonly EntityId[],
): readonly PinDefinition[] {
  const personPins = people
    .filter((person) => pinnedPersonIds.includes(person.personId))
    .map((person) => ({
      id: person.pinId,
      shortLabel: personInitials(person.dossier.name),
      label: person.dossier.name,
      detail: `${person.dossier.title} · in the office`,
      kind: "Person",
      personId: person.personId,
    }));

  return personPins;
}

interface PinControlMenuProps {
  readonly pin: PinDefinition;
  readonly size: RunAPinSize;
  readonly dispatch: (action: RunAUiAction) => void;
}

function PinControlMenu({ pin, size, dispatch }: PinControlMenuProps) {
  const firstControlRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstControlRef.current?.focus();
  }, []);

  return (
    <div
      id={`pin-controls-${pin.id}`}
      className="pin-control-menu civic-glass"
      role="menu"
      aria-label={`${pin.label} pin options`}
      data-testid={`pin-controls-${pin.id}`}
    >
      {(
        [
          ["tiny", "Compact"],
          ["normal", "Standard"],
          ["expanded", "Expanded"],
        ] as const
      ).map(([nextSize, label], index) => (
        <button
          key={nextSize}
          ref={index === 0 ? firstControlRef : undefined}
          type="button"
          role="menuitem"
          aria-current={size === nextSize ? "true" : undefined}
          onClick={() =>
            dispatch({ type: "set-pin-size", pinId: pin.id, size: nextSize })
          }
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        role="menuitem"
        className="pin-unpin-action"
        aria-label={`Unpin ${pin.label}`}
        onClick={() =>
          dispatch({
            type: "unpin-person",
            personId: pin.personId,
            pinId: pin.id as RunAPersonPinId,
          })
        }
      >
        Unpin
      </button>
    </div>
  );
}

interface PinRailProps {
  readonly people: readonly PinnedPersonDefinition[];
  readonly state: RunAUiState;
  readonly dispatch: (action: RunAUiAction) => void;
}

export function PinRail({ people, state, dispatch }: PinRailProps) {
  const pins = pinsForPeople(people, state.pinnedPersonIds);
  if (pins.length === 0) return null;

  return (
    <aside className="pin-rail" aria-label="Pinned references">
      <section
        className="pinned-collection"
        aria-label="Pinned references"
        data-testid="pinned-collection"
        data-empty={pins.length === 0 ? "true" : "false"}
      >
        <p className="pin-rail-label">Pinned reference</p>
        {pins.map((pin) => {
          const size = resolveRunAPinSize(state, pin.id);
          const controlsOpen = state.activePinMenuId === pin.id;
          return (
            <div className="pin-slot" key={pin.id}>
              <button
                type="button"
                className="context-pin civic-glass"
                data-pin-id={pin.id}
                data-size={size}
                aria-label={`${pin.label}. ${pin.kind}. Display size ${size}. Open pin controls.`}
                aria-expanded={controlsOpen}
                aria-controls={
                  controlsOpen ? `pin-controls-${pin.id}` : undefined
                }
                onClick={() =>
                  dispatch({ type: "toggle-pin-controls", pinId: pin.id })
                }
              >
                <span className="pin-monogram" aria-hidden="true">
                  {pin.shortLabel}
                </span>
                {size !== "tiny" ? (
                  <span className="pin-copy">
                    <span className="pin-kind">{pin.kind}</span>
                    <strong>{pin.label}</strong>
                    {size === "expanded" ? <small>{pin.detail}</small> : null}
                  </span>
                ) : null}
              </button>
              {controlsOpen ? (
                <PinControlMenu pin={pin} size={size} dispatch={dispatch} />
              ) : null}
            </div>
          );
        })}
      </section>
      <span className="sr-only" aria-live="polite">
        Pin changes are presentation-only.
      </span>
    </aside>
  );
}
