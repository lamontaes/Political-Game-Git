import { createRoot } from "react-dom/client";
import { smallWorld } from "../fixtures/small-world";
import { drawRandomPlace } from "./random-place";
import { serializeWorld } from "../../src/simulation/serialization";
import { projectWorldOrientation } from "../../src/presentation/world-orientation-contract";
import { projectOrientationView } from "../../src/presentation/world-orientation";
import { stateNameForUsps } from "../../src/player/useWorldOrientation";
import { WorldOrientationPanel } from "../../src/player/WorldOrientationPanel";

// The production tour receives an actual saved world and its actual player.
// Navigate its existing Next controls to the state card before capturing it.
const seed =
  new URLSearchParams(window.location.search).get("seed") ??
  "opening-state-owner-all56-0";
const place = drawRandomPlace(seed);
const game = smallWorld({ place: place.key, seed, offices: ["governor"] });
const world = game.world;
const personId = game.personId;
const before = serializeWorld(world);
const orientation = projectWorldOrientation(world, personId);
const view = projectOrientationView(orientation, stateNameForUsps);
const state = view.steps.find((step) => step.key === "state");
if (!state)
  throw new Error("The saved orientation has no home-government step.");
createRoot(document.getElementById("root")!).render(
  <WorldOrientationPanel
    world={world}
    personId={personId}
    view={view}
    homeStateUsps={orientation.homeState?.stateUsps ?? null}
    mode="revisit"
    onClose={() => {}}
    onOpenPerson={() => {}}
  />,
);
Object.assign(window, {
  openingStateOwnerEvidence: () => ({
    seed,
    placeKey: place.key,
    home: orientation.homeState?.stateUsps ?? null,
    playerId: personId,
    unchanged: before === serializeWorld(world),
    summary: state.summary,
    namedPeople: state.people.map((person) => ({
      id: person.personId,
      name: person.name,
      title: person.title,
    })),
  }),
});
