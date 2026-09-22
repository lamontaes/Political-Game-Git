import { useState } from "react";

import type { EntityId, World } from "../simulation";
import { WorldOrientationPanel } from "./WorldOrientationPanel";
import { useWorldOrientation } from "./useWorldOrientation";

/**
 * Reopening the world introduction later, from the public record.
 *
 * The same panels a new life saw, read again from the same saved World: no
 * replayed opening, no new people, no travel. Closing it only closes it.
 */
export function WorldOrientationEntry({
  world,
  personId,
  onOpenPerson,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onOpenPerson: (personId: EntityId) => void;
}) {
  const [open, setOpen] = useState(false);
  const { view, homeStateUsps, regionalPlate } = useWorldOrientation(
    world,
    personId,
  );
  if (!open) {
    return (
      <button
        type="button"
        className="ui-action"
        data-testid="orientation-reopen"
        onClick={() => setOpen(true)}
      >
        Who holds office
      </button>
    );
  }
  return (
    <WorldOrientationPanel
      world={world}
      personId={personId}
      view={view}
      homeStateUsps={homeStateUsps}
      regionalPlate={regionalPlate}
      mode="revisit"
      onClose={() => setOpen(false)}
      onOpenPerson={onOpenPerson}
    />
  );
}
