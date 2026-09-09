/** Isolated verification entrypoint. Never linked from the production player. */
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { MunicipalWorkspace } from "../../src/player/MunicipalWorkspace";
import { createScenarioWorld } from "../../src/simulation/demo";
import { requireLifePlace } from "../../src/simulation/life-places";
import { serializeWorld, deserializeWorld } from "../../src/simulation";
import { seatMunicipalMember } from "../../src/simulation/municipal-public-work";
import {
  municipalWorkspaceFor,
  synchronizeMunicipalPublicContext,
} from "../../src/presentation/municipal-workspace";
import "../../src/styles.css";
const placeKey = new URLSearchParams(location.search).get("place") ?? "5114968";
function initial() {
  const saved = sessionStorage.getItem(`municipal-proof:${placeKey}`);
  if (saved) return deserializeWorld(saved);
  const place = requireLifePlace(placeKey);
  const generated = createScenarioWorld(
    `municipal-browser:${placeKey}`,
    place.context,
    { peopleCount: 12 },
  );
  let world = {
    ...generated,
    control: { kind: "person" as const, personId: generated.personOrder[0]! },
  };
  if (new URLSearchParams(location.search).get("role") === "member") {
    world = synchronizeMunicipalPublicContext(world);
    world = seatMunicipalMember(world, {
      governmentKey: municipalWorkspaceFor(world)!.government.key,
      personId: world.control.personId,
      startedAt: world.currentDate,
      role: "member",
      seatLabel: "Authored verification role",
    });
  }
  return world;
}
function Proof() {
  const [world, setWorld] = useState(initial);
  return (
    <main
      style={{
        maxWidth: 960,
        margin: "2rem auto",
        padding: "2rem",
        background: "white",
        color: "#17212b",
      }}
    >
      <h1>Municipal feature verification</h1>
      <p>This isolated test entrypoint authors its role fixture explicitly.</p>
      <output data-testid="sequence">{world.history.nextSequence}</output>
      <output data-testid="roles">
        {world.history.organizationParticipations.length}
      </output>
      <output data-testid="work">{world.history.workItems.length}</output>
      <button
        onClick={() =>
          sessionStorage.setItem(
            `municipal-proof:${placeKey}`,
            serializeWorld(world),
          )
        }
      >
        Save verification world
      </button>
      <MunicipalWorkspace world={world} onWorldChange={setWorld} />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Proof />);
