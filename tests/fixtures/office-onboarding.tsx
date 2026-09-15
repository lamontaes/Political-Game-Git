import { useState } from "react";
import { createRoot } from "react-dom/client";

import { OfficeOnboardingWorkspace } from "../../src/player/OfficeOnboardingWorkspace";
import {
  deserializeWorld,
  serializeWorld,
  currentOfficeWorkflowPreference,
} from "../../src/simulation";
import { preparedOfficeOnboardingWorld } from "./office-onboarding-world";
import "../../src/player/player.css";

const prepared = preparedOfficeOnboardingWorld();

function Review() {
  const [world, setWorld] = useState(prepared.world);
  const preference = currentOfficeWorkflowPreference(
    world,
    prepared.personId,
    prepared.seat.relationshipId,
  );
  const votes = (world.history.legislativeVotes ?? []).length;
  return (
    <main>
      <p>
        Ordinary seated-member office route. Opening does not vote. Staff are
        actual legislative-staff records, not a ceremonial aide.
      </p>
      <output aria-label="Recorded votes">{votes}</output>
      <output aria-label="Preference mode">
        {preference?.votingMode ?? "none"}
      </output>
      <button
        type="button"
        onClick={() => setWorld(deserializeWorld(serializeWorld(world)))}
      >
        Reload snapshot
      </button>
      <OfficeOnboardingWorkspace
        world={world}
        playerPersonId={prepared.personId}
        selectedMeasureId={prepared.measureId}
        onWorldChange={setWorld}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Review />);
