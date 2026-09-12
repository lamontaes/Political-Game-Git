import { makeIsoDate } from "../simulation/dates";
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
} from "../simulation";
import { LEXINGTON_DEMO_CONTEXT } from "../simulation/demo";
import type { World } from "../simulation";
const key = "edu-path7-diagnostic-v1";
function initial() {
  const save = localStorage.getItem(key);
  if (save) return deserializeWorld(save);
  const d = createDemoWorld("edu-browser", {
    context: {
      ...LEXINGTON_DEMO_CONTEXT,
      initialMoment: {
        ...LEXINGTON_DEMO_CONTEXT.initialMoment,
        date: makeIsoDate("2026-01-05"),
      },
    },
  });
  let w = createWorld({
    seed: d.seed,
    currentDate: d.currentDate,
    people: d.personOrder.map((id) => d.people[id]!),
    jurisdictions: d.jurisdictionOrder.map((id) => d.jurisdictions[id]!),
    control: { kind: "person", personId: d.personOrder[0]! },
  });
  w = createResourcePosition(w, {
    stableKey: "funds",
    owner: { kind: "person", personId: w.personOrder[0]! },
    openedAt: w.currentDate,
    openingBalance: money(100000, "USD"),
    provenance: {
      kind: "authored",
      note: "Synthetic browser diagnostic funds",
    },
  });
  return w;
}
function Proof() {
  const [world, setWorld] = useState(initial);
  const update = (w: World) => {
    setWorld(w);
  };
  return (
    <main>
      <h1>EDU-PATH7 diagnostic — not normal-route acceptance</h1>
      <button onClick={() => localStorage.setItem(key, serializeWorld(world))}>
        Save study journey
      </button>
      {/*
        LifePathsPanel already owns the education panel, so mounting one here
        too put two "Search institutions" boxes on the page and every search in
        this proof resolved to both. Study has one owner — that is UI9-01's
        whole point — and a diagnostic that mounts it twice is not showing the
        route it claims to be showing.
      */}
      <LifePathsPanel world={world} onWorldChange={update} />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Proof />);
