import {
  createResourcePosition,
  createResourceFlow,
  money,
  addDays,
} from "../../src/simulation/index";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { responseFixture } from "../../src/simulation/incident-response.fixture";
import { IncidentResponsePanel } from "../../src/player/IncidentResponsePanel";
import { advanceWorldMinutes } from "../../src/simulation/time-work";
import {
  serializeWorld,
  deserializeWorld,
} from "../../src/simulation/serialization";
function Proof() {
  const [world, setWorld] = useState(() => {
    const f = responseFixture();
    const w = createResourcePosition(f.w, {
      stableKey: "browser-response-funds",
      owner: { kind: "organization", organizationId: f.organizationId },
      openedAt: f.w.currentDate,
      openingBalance: money(10000, "USD"),
      provenance: { kind: "authored", note: "Diagnostic internal funds." },
    });
    return createResourceFlow(w, {
      stableKey: "browser-allocation",
      source: { kind: "organization", organizationId: f.organizationId },
      recipient: { kind: "person", personId: f.staff },
      startsAt: addDays(w.currentDate, 1),
      initialStatus: "expected",
      amount: money(2500, "USD"),
      cadenceKind: "custom:one-time",
      basisKind: "custom:incident-response",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: f.jurisdictionId,
      provenance: { kind: "authored", note: "Diagnostic internal allocation." },
    });
  });
  const [save, setSave] = useState("");
  return (
    <main>
      <h1>Feature diagnostic — not normal-player reachability</h1>
      <IncidentResponsePanel world={world} onWorldChange={setWorld} />
      <button onClick={() => setWorld(advanceWorldMinutes(world, 30))}>
        Continue 30 minutes
      </button>
      <button onClick={() => setWorld(advanceWorldMinutes(world, 1440))}>
        Continue to next day
      </button>
      <p data-testid="delivery-count">
        {world.history.resourceTransferOutcomes.length} deliveries
      </p>
      <button onClick={() => setSave(serializeWorld(world))}>
        Save diagnostic
      </button>
      <button disabled={!save} onClick={() => setWorld(deserializeWorld(save))}>
        Reload diagnostic
      </button>
      <p>
        {world.currentMoment.date} {world.currentMoment.minuteOfDay}
      </p>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Proof />);
