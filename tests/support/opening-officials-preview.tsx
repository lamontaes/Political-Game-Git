import { createRoot } from "react-dom/client";
import { smallWorld } from "../fixtures/small-world";
import { SeededRng } from "../../src/simulation/rng";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { ensureNationalElectionJurisdiction } from "../../src/simulation/national-election-geography";
import { serializeWorld } from "../../src/simulation/serialization";
import { projectWorldOrientation } from "../../src/presentation/living-world-orientation";
import { projectOrientationView } from "../../src/presentation/world-orientation";
import { WorldOrientationPanel } from "../../src/player/WorldOrientationPanel";
import { GovernmentBrowser } from "../../src/player/politics/GovernmentBrowser";

// A read-only browser fixture built from the existing small-world producers.
// Names, appearances and office identities are never supplied by this fixture.
const seed = "Owner opening officials figure review";
const home = new SeededRng(seed).pick(lifePlaceStateIdentities());
const game = smallWorld({
  place: home.jurisdictionKey,
  seed,
  offices: ["congress"],
});
const world = ensureNationalElectionJurisdiction(game.world);
const personId = game.personId;
const before = serializeWorld(world);
const orientation = projectWorldOrientation(world, personId);
const projected = projectOrientationView(orientation, (key) => key);
const view = {
  ...projected,
  steps: projected.steps.filter((step) => step.key === "congress"),
};
const root = createRoot(document.getElementById("root")!);
const params = new URLSearchParams(window.location.search);
const government = params.get("view") === "represented";
root.render(
  government ? (
    <GovernmentBrowser
      world={world}
      personId={personId}
      place="home"
      scope="federal"
      onSelectionChange={() => {}}
      onOpenPerson={() => {}}
      onOpenMeasure={() => {}}
    />
  ) : (
    <WorldOrientationPanel
      world={world}
      personId={personId}
      view={view}
      homeStateUsps={orientation.homeState?.stateUsps ?? null}
      mode="revisit"
      onClose={() => {}}
      onOpenPerson={() => {}}
    />
  ),
);
Object.assign(window, {
  openingOfficialsEvidence: () => ({
    seed,
    home: home.jurisdictionKey,
    unchanged: before === serializeWorld(world),
    namedPeople: view.steps[0]?.people.map((person) => ({
      id: person.personId,
      name: person.name,
      title: person.title,
    })),
  }),
});
