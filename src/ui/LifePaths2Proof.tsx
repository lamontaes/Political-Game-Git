import { useState } from "react";
import { createRoot } from "react-dom/client";
import { LifePathsPanel } from "../player/LifePathsPanel";
import {
  createDemoWorld,
  createWorld,
  createResourcePosition,
  money,
  serializeWorld,
  deserializeWorld,
  recordKinship,
  recordGoalState,
} from "../simulation";
import type { World } from "../simulation";
const namespace = "life-paths2-isolated-proof-v1";
function initial(): World {
  const stored = localStorage.getItem(namespace);
  if (stored) return deserializeWorld(stored);
  const demo = createDemoWorld("life-paths2-browser-proof");
  let w = createWorld({
    seed: demo.seed,
    currentDate: demo.currentDate,
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: demo.personOrder.map((id) => demo.people[id]!),
    control: { kind: "person", personId: demo.personOrder[0]! },
  });
  w = createResourcePosition(w, {
    stableKey: "proof-funds",
    owner: { kind: "person", personId: w.personOrder[0]! },
    openedAt: w.currentDate,
    openingBalance: money(100000, "USD"),
    provenance: {
      kind: "authored",
      note: "Isolated synthetic browser proof funds.",
    },
  });
  w = recordKinship(w, {
    stableKey: "proof-kin",
    personIds: [w.personOrder[0]!, w.personOrder[1]!],
    establishedAt: w.currentDate,
    kind: "collateral:cousin",
    provenance: { kind: "authored", note: "Synthetic proof kinship." },
  });
  return recordGoalState(w, {
    stableKey: "proof-seek",
    goalKey: "life-paths2:seek-work",
    personId: w.personOrder[1]!,
    recordedAt: w.currentDate,
    objective: "Seek suitable work.",
    domain: "work",
    scope: "personal",
    priority: "moderate",
    status: "active",
    targetEntityId: null,
    deadline: null,
    outcome: null,
    provenance: {
      kind: "authored",
      sourceRefs: [],
      note: "Synthetic proof intention.",
    },
    replacesGoalId: null,
    supersedesGoalStateId: null,
  });
}
function Proof() {
  const [world, setWorld] = useState(initial);
  return (
    <main
      style={{
        maxWidth: 900,
        margin: "2rem auto",
        padding: "1rem",
        fontFamily: "system-ui",
      }}
    >
      <h1>LIFE-PATHS2 isolated proof</h1>
      <p>
        Synthetic proof, separate save. Normal navigation awaits UI-CORE-RELEASE
        integration.
      </p>
      <p data-testid="clock">{world.currentDate}</p>
      <LifePathsPanel
        world={world}
        onWorldChange={(w) => {
          setWorld(w);
          localStorage.setItem(namespace, serializeWorld(w));
        }}
      />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Proof />);
