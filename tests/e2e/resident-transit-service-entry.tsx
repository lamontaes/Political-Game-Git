import { BrowserSaveStore } from "../../src/presentation/browser-world-repository";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { stableHash } from "../../src/simulation/ids";
import { residentTransitServiceFixture } from "../fixtures/resident-transit-service";

// A disclosed saved input only. Every player interaction runs through the
// normal application root, its calendar, navigation and save protocol.
const seed = "resident-transit-browser-slice";
const places = lifePlaceStateIdentities();
const place =
  places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!
    .jurisdictionKey;
const store = new BrowserSaveStore();
if (!(await store.mostRecent())) {
  const world = residentTransitServiceFixture(place, seed).world;
  const result = await store.save(world, store.newSaveId(world));
  if (result.status !== "saved")
    throw new Error("The authored resident input was not saved.");
}
const root = document.getElementById("root")!;
const notice = document.createElement("p");
notice.textContent = `Saved resident fixture: ${place}, seed ${seed}. Unanimous fixture votes and the $200 operating contract are authored inputs, not natural outcomes.`;
const open = document.createElement("a");
open.href = "/";
open.textContent = "Open the saved resident in the game";
root.append(notice, open);
