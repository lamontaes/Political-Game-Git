import {
  nextRunAPinSize,
  resolveRunAPinSize,
  type RunAPinId,
  type RunAUiAction,
  type RunAUiState,
} from "../presentation/run-a-state";

interface PinDefinition {
  readonly id: RunAPinId;
  readonly shortLabel: string;
  readonly label: string;
  readonly detail: string;
  readonly kind: string;
}

const PINS: readonly PinDefinition[] = [
  {
    id: "briefing",
    shortLabel: "B",
    label: "Afternoon briefing",
    detail: "Three constituent-service points are ready for review.",
    kind: "Current",
  },
  {
    id: "person",
    shortLabel: "AC",
    label: "Andre Collins",
    detail: "Senior legislative aide · in the office",
    kind: "Person",
  },
  {
    id: "district-notes",
    shortLabel: "N",
    label: "District notes",
    detail: "Working notes from this morning's constituent requests.",
    kind: "Reference",
  },
];

interface PinRailProps {
  readonly state: RunAUiState;
  readonly dispatch: (action: RunAUiAction) => void;
}

export function PinRail({ state, dispatch }: PinRailProps) {
  return (
    <aside className="pin-rail" aria-label="Pinned context">
      <p className="pin-rail-label">Pinned</p>
      {PINS.map((pin) => {
        const size = resolveRunAPinSize(state, pin.id);
        return (
          <button
            key={pin.id}
            type="button"
            className="context-pin civic-glass"
            data-pin-id={pin.id}
            data-size={size}
            aria-label={`${pin.label}. ${pin.kind}. Display size ${size}. Activate to change size.`}
            onClick={() =>
              dispatch({
                type: "set-pin-size",
                pinId: pin.id,
                size: nextRunAPinSize(size),
              })
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
        );
      })}
      <span className="sr-only" aria-live="polite">
        Pin display changes are presentation-only.
      </span>
    </aside>
  );
}
