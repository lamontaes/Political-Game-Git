import { useRef, useState } from "react";

import { resolveBackdrop } from "./art";

/**
 * The title / home screen.
 *
 * DEVELOPMENT-ONLY. It follows the newest owner direction exactly: the released
 * illustrated plate stays visually dominant, the wordmark and the menu sit
 * directly over it as transparent type, and there is no opaque slab, no card
 * around the block, no frosted column, no raster button and no launcher card
 * with an icon and a description. Unselected items are text; the selected item
 * takes the ornament.
 *
 * The wordmark is typography plus one restrained brass rule. It is deliberately
 * not a seal-shaped badge, carries no dome or other federal symbol — this game
 * is not primarily about Washington — and does not use "OCD" as a monogram. The
 * final logo is not locked and this is not a proposal for one.
 *
 * U03-01 moved the whole grouping up and to the left and made it smaller, as
 * one unit: the wordmark, the rule and the menu scale together, because scaling
 * only the wordmark leaves the original menu footprint behind and the block
 * stops reading as a block. The lectern staging area on the right of the plate
 * is left clear. The slogan and the asset caption are gone from the composition
 * — the asset id is still true and still readable, in the developer inspector,
 * which is where a technical identity belongs.
 */

export interface TitleAction {
  readonly id: string;
  readonly label: string;
  readonly onSelect: () => void;
  readonly disabledReason?: string;
}

interface TitleScreenProps {
  readonly sceneId: string;
  readonly actions: readonly TitleAction[];
}

export function TitleScreen({ sceneId, actions }: TitleScreenProps) {
  const backdrop = resolveBackdrop(sceneId);
  const [selected, setSelected] = useState(0);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  /**
   * Arrow keys walk the menu the way a game menu does, and Tab still walks it
   * the way the platform does. Both land on the same item and both show the
   * same visible state, so neither input is second class.
   */
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const next = (selected + delta + actions.length) % actions.length;
    setSelected(next);
    buttonRefs.current[next]?.focus();
  }

  return (
    <div className="p-title" data-testid="title-screen">
      <div
        className="p-backdrop"
        data-plate={backdrop.url ? "released" : "missing"}
        data-asset-id={backdrop.assetId ?? "none"}
        data-testid="title-backdrop"
        style={
          backdrop.url ? { backgroundImage: `url(${backdrop.url})` } : undefined
        }
        role="img"
        aria-label={`${backdrop.label}, with nobody in it.`}
      />
      {backdrop.url ? null : (
        <p className="p-backdrop-missing">
          This room has no released plate. Nothing is being substituted for it.
        </p>
      )}

      <div className="p-title-inner">
        <h1 className="p-wordmark">
          <span className="p-wordmark-line p-wordmark-our">Our</span>
          <span className="p-wordmark-line p-wordmark-civic">Civic Duty</span>
          <span className="p-wordmark-rule" aria-hidden="true" />
        </h1>

        <div
          className="p-title-menu"
          role="menu"
          aria-label="Title menu"
          onKeyDown={onKeyDown}
        >
          {actions.map((action, index) => (
            <button
              key={action.id}
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              type="button"
              role="menuitem"
              className="p-title-action"
              data-testid={`title-${action.id}`}
              data-selected={selected === index ? "true" : "false"}
              disabled={Boolean(action.disabledReason)}
              aria-describedby={
                action.disabledReason ? `title-reason-${action.id}` : undefined
              }
              onFocus={() => setSelected(index)}
              onMouseEnter={() => setSelected(index)}
              onClick={action.onSelect}
            >
              <span className="p-title-action-marker" aria-hidden="true" />
              <span>{action.label}</span>
              {action.disabledReason ? (
                <span
                  className="p-title-action-reason"
                  id={`title-reason-${action.id}`}
                >
                  {action.disabledReason}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
