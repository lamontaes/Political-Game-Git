import { useState } from "react";
import { type EntityId, type World } from "../simulation";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { describeRoutineOutcome } from "../presentation/routine-outcome";
import { LifePathsPanel } from "./LifePathsPanel";
import { PlacesWorkspace, type PlacesEntityRef } from "./PlacesWorkspace";

/** A owns the Personal root mount. This leaf owns no navigation or save store. */
export function PersonalRoutinePanel({
  world,
  personId,
  onWorldChange,
  onOpenEntity,
  onTogglePin,
  isPinned,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly onOpenEntity: (ref: PlacesEntityRef) => void;
  readonly onTogglePin: (ref: PlacesEntityRef) => void;
  readonly isPinned: (ref: PlacesEntityRef) => boolean;
}) {
  const [notice, setNotice] = useState("");
  if (world.control.kind !== "person" || world.control.personId !== personId)
    return null;
  const commit = (next: World, requestedMinutes?: number) => {
    setNotice(describeRoutineOutcome(world, next, personId, requestedMinutes));
    if (next !== world) onWorldChange(next);
  };
  return (
    <details data-testid="personal-routine">
      <summary>Jobs, study and outings</summary>
      <p>
        Read offers and accepted terms here. Reading does not pass time. Attend
        includes any journey disclosed by the offer.
      </p>
      {notice ? (
        <p
          role="status"
          data-testid="personal-routine-outcome"
          style={{ whiteSpace: "pre-line" }}
        >
          {notice}
        </p>
      ) : null}
      <LifePathsPanel
        world={world}
        onWorldChange={(next) => commit(next)}
        transitionHandlers={createCampaignElectionTransitionRegistry()}
        showTimeControl={false}
      />
      <PlacesWorkspace
        world={world}
        personId={personId}
        onWorldChange={(next) => commit(next)}
        onOpenEntity={onOpenEntity}
        onTogglePin={onTogglePin}
        isPinned={isPinned}
        transitionHandlers={createCampaignElectionTransitionRegistry()}
      />
    </details>
  );
}
