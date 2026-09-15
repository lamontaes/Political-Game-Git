import { useState } from "react";
import { createRoot } from "react-dom/client";
import { suppliedLegislativeSeat } from "../fixtures/supplied-legislative-seat";
import { BrowserSaveStore } from "../../src/presentation/browser-world-repository";
import { TransitWorkspace } from "../../src/player/TransitWorkspace";
import { DocketWorkspace } from "../../src/player/DocketWorkspace";
import { passOrdinaryDays } from "../../src/presentation/ordinary-life";
import { resolveActiveMemberSeat } from "../../src/presentation/legislative-member-seat";
import { projectTransitWork } from "../../src/presentation/transit-work";
import { selectDocketBill } from "../../src/presentation/legislation-docket-selection";
import type { EntityId, World } from "../../src/simulation/types";

// Component receipt, not a primary-root mount or an ordinary election producer.
// Only the terminal-seat boundary is supplied; no tax law/public cash is supplied.
const store = new BrowserSaveStore({
  databaseName: "a39-transit-component-proof",
});
const query = new URLSearchParams(location.search);
const restoredId = query.get("saveId") as EntityId | null;
const restored = restoredId ? await store.load(restoredId) : null;
const supplied = restored
  ? null
  : suppliedLegislativeSeat(
      "US-AK",
      query.get("chamber") === "senate" ? "senate" : "house",
    );
const initialWorld = restored ?? supplied!.world;
const saveId = restoredId ?? store.newSaveId(initialWorld);

function Entry() {
  const [world, setWorld] = useState<World>(initialWorld);
  const [measureId, setMeasureId] = useState<EntityId | null>(null);
  const [message, setMessage] = useState("");
  if (world.control.kind !== "person")
    throw new Error("Expected the controlled member.");
  const personId = world.control.personId;
  const view = projectTransitWork(world, personId);
  const seat = resolveActiveMemberSeat(world, personId);
  if (seat.kind !== "seated") throw new Error(seat.reason);
  const bill = view.bills.find(
    (entry) => entry.bill.measureId === measureId,
  )?.bill;
  async function save() {
    const result = await store.save(world, saveId);
    if (result.status !== "saved")
      throw new Error(`Save refused: ${result.status}`);
    query.set("saveId", saveId);
    history.replaceState(null, "", `${location.pathname}?${query.toString()}`);
    setMessage("Saved.");
  }
  return (
    <main
      data-testid="transit-entry"
      data-world-id={world.id}
      data-person-id={personId}
      data-payments={
        world.history.resourceFlows.filter(
          (flow) => flow.basisReference.kind === "public-funding",
        ).length
      }
      data-effects={world.history.effectActivations.length}
    >
      <p>
        Controlled-member component proof. Primary root and ordinary tax
        producer acceptance remain separate.
      </p>
      <button onClick={() => void save()}>Save</button>
      <p role="status">{message}</p>
      {measureId ? (
        <>
          <button onClick={() => setMeasureId(null)}>Return to transit</button>
          <DocketWorkspace
            world={world}
            playerPersonId={personId}
            scenarioKey={bill!.scenarioKey}
            jurisdictionId={seat.seat.governingJurisdictionId}
            onWorldChange={setWorld}
            onGoToFloor={(selected) => setMeasureId(selected.measureId)}
            floorNote={null}
          />
        </>
      ) : (
        <section aria-label="Transit service">
          <TransitWorkspace
            world={world}
            personId={personId}
            onWorldChange={setWorld}
            onContinue={(days) => setWorld(passOrdinaryDays(world, days))}
            onOpenBill={(key) => {
              const selected = view.bills.find(
                (entry) => entry.bill.docketKey === key,
              )?.bill;
              if (!selected) return;
              setWorld(
                selectDocketBill(world, selected.scenarioKey, personId, key),
              );
              setMeasureId(selected.measureId);
            }}
          />
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Entry />);
