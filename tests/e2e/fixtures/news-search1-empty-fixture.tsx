import { createRoot } from "react-dom/client";

import "../../../src/player/player.css";
import { PublicInformationPanel } from "../../../src/player/PublicInformationPanel";
import { projectPublicInformationPanel } from "../../../src/presentation/public-information-adapters";
import { createNewGameWorld } from "../../../src/presentation/new-game";

const game = createNewGameWorld({
  seed: "news-search1-empty-browser-proof",
  placeKey: "kentucky",
  startAge: 30,
  depth: "summarize-earlier-life",
  startingLife: "ordinary-life",
  household: "shares-a-home",
  givenName: null,
  familyName: null,
});
const jurisdictionId = game.world.jurisdictionOrder[0]!;
const model = projectPublicInformationPanel(game.world, jurisdictionId);
const root = createRoot(document.getElementById("root")!);

root.render(
  <PublicInformationPanel
    model={model}
    onClose={() => {
      document.body.dataset.panelClosed = "true";
    }}
    onOpenPerson={() => {}}
  />,
);
