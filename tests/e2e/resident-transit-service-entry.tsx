import { useState } from "react";
import { createRoot } from "react-dom/client";
import { PublicServiceRequestPanel } from "../../src/player/PublicServiceRequestPanel";
import { BrowserSaveStore } from "../../src/presentation/browser-world-repository";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { stableHash } from "../../src/simulation/ids";
import { personName } from "../../src/simulation/people";
import {
  performScheduledActivity,
  scheduledActivityState,
} from "../../src/simulation/time-work";
import { residentTransitServiceFixture } from "../fixtures/resident-transit-service";
import type { EntityId, World } from "../../src/simulation/types";

const seed = "resident-transit-browser-slice";
const places = lifePlaceStateIdentities();
const place =
  places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!
    .jurisdictionKey;
const store = new BrowserSaveStore({
  databaseName: "team6-resident-transit-slice",
});
const params = new URLSearchParams(location.search);
const savedId = params.get("saveId") as EntityId | null;
const loaded = savedId ? await store.load(savedId) : null;
const initial = loaded ?? residentTransitServiceFixture(place, seed).world;
const saveId = savedId ?? store.newSaveId(initial);

function Entry() {
  const [world, setWorld] = useState<World>(initial);
  const [message, setMessage] = useState("");
  const personId =
    world.control.kind === "person" ? world.control.personId : null;
  const activities = world.history.scheduledActivities.filter(
    (activity) =>
      activity.responsiblePersonId === personId &&
      activity.location?.locationKey.startsWith("public-service:"),
  );
  const receipts = world.history.events.filter(
    (event) => event.type === "service.delivery-recorded",
  );
  return (
    <main>
      <p>
        Controlled component proof in {place}, seed {seed}. The bill, unanimous
        fixture votes and $200 operating contract are authored test inputs.
      </p>
      <p>{personId ? personName(world.people[personId]!) : "Observer"}</p>
      <PublicServiceRequestPanel world={world} onWorldChange={setWorld} />
      <section aria-label="Requested trips">
        {activities.map((activity) => (
          <article key={activity.id}>
            <p>
              {activity.title}:{" "}
              {scheduledActivityState(world, activity.id).status}
            </p>
            {scheduledActivityState(world, activity.id).status ===
              "scheduled" && (
              <button
                onClick={() =>
                  setWorld(performScheduledActivity(world, activity.id))
                }
              >
                Take the scheduled trip
              </button>
            )}
          </article>
        ))}
      </section>
      <p data-testid="delivered-trips">
        Completed service receipts: {receipts.length}
      </p>
      <p data-testid="saved-transfers">
        Saved actual transfers: {world.history.resourceTransferOutcomes.length}
      </p>
      <button
        onClick={() =>
          void (async () => {
            const result = await store.save(world, saveId);
            if (result.status !== "saved") throw new Error("Save failed.");
            params.set("saveId", saveId);
            history.replaceState(null, "", `?${params}`);
            setMessage("Saved.");
          })()
        }
      >
        Save
      </button>
      <p role="status">{message}</p>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Entry />);
