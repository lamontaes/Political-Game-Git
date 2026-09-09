import { useState } from "react";
import { createRoot } from "react-dom/client";
import { JudicialOfficeWork } from "../../src/player/JudicialOfficeWork";
import { BrowserSaveStore } from "../../src/presentation/browser-world-repository";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import { initializeJudicialOfficePractice } from "../../src/simulation/judicial-office-start";
import { judicialOfficeContexts } from "../../src/simulation/judicial-office-work";
import { serializeWorld } from "../../src/simulation/serialization";
import type { EntityId, World } from "../../src/simulation/types";

const store = new BrowserSaveStore({ databaseName: "jud-work2-feature-proof" });
function Proof() {
  const [world, setWorld] = useState<World | null>(null);
  const [saveId, setSaveId] = useState<EntityId | null>(null);
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [personId, setPersonId] = useState<EntityId | null>(null);
  function begin() {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "jud-work2-browser",
      startKind: "custom",
      startAge: 40,
      depth: "summarize-earlier-life",
    });
    const start = initializeJudicialOfficePractice(game.world, {
      mode: "custom",
      jurisdictionId: game.place.context.jurisdiction.id,
    });
    if (!start.ok) {
      setStatus(start.reason);
      return;
    }
    setWorld(start.world);
    setSaveId(store.newSaveId(start.world));
  }
  async function save() {
    if (!world || !saveId) return;
    const result = await store.save(world, saveId);
    setStatus(result.status);
  }
  async function load() {
    const listing = await store.list();
    const id = saveId ?? listing.saves[0]?.saveId;
    if (!id) {
      setStatus("No saved proof");
      return;
    }
    const loaded = await store.load(id);
    if (loaded) {
      setWorld(loaded);
      setSaveId(id);
      setStatus("Loaded");
    }
  }
  const office = world && judicialOfficeContexts(world)[0];
  return (
    <main
      style={{
        maxWidth: "56rem",
        margin: "2rem auto",
        padding: "1rem",
        fontFamily: "system-ui",
        color: "#edf0f5",
        background: "#182332",
      }}
    >
      <h1>JUD-WORK2 feature proof</h1>
      <p>
        Developer proof only. UI-core normal-route integration remains pending.
      </p>
      {!world && (
        <button onClick={begin}>Begin authored office practice</button>
      )}
      <button onClick={() => void load()}>Load saved proof</button>
      {world && (
        <>
          <p data-testid="clock">
            {world.currentMoment.date} · {world.currentMoment.minuteOfDay}
          </p>
          <p data-testid="sequence">{world.history.nextSequence}</p>
          <button onClick={() => setOpen(!open)}>Work</button>
          <button onClick={() => void save()}>Save proof</button>
          <output data-testid="world-snapshot" hidden>
            {serializeWorld(world)}
          </output>
        </>
      )}
      <p role="status">{status}</p>
      {world && office && open && (
        <section
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        >
          <button onClick={() => setOpen(false)}>Close work</button>
          <JudicialOfficeWork
            world={world}
            courtOrganizationId={office.courtOrganizationId}
            onWorldChange={setWorld}
            onPerson={setPersonId}
          />
        </section>
      )}
      {personId && <p data-testid="selected-person">{personId}</p>}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Proof />);
