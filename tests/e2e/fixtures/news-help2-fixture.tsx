import { createRoot } from "react-dom/client";

import "../../../src/player/player.css";
import { PublicInformationPanel } from "../../../src/player/PublicInformationPanel";
import { projectPublicInformationPanel } from "../../../src/presentation/public-information-adapters";
import { createNewGameWorld } from "../../../src/presentation/new-game";
import {
  publishPublicEvent,
  recordWorldEvent,
  serializeWorld,
} from "../../../src/simulation";

const game = createNewGameWorld({
  seed: "news-help2-browser-proof",
  placeKey: "kentucky",
  startAge: 30,
  depth: "summarize-earlier-life",
  startingLife: "ordinary-life",
  household: "shares-a-home",
  givenName: null,
  familyName: null,
});
const jurisdictionId = game.world.jurisdictionOrder[0]!;
const withEvent = recordWorldEvent(game.world, {
  stableKey: "news-help2:browser:civic-event",
  type: "civic.community-meeting-held",
  occurredAt: game.world.currentDate,
  recordedAt: game.world.currentDate,
  jurisdictionId,
  involvedEntityIds: [jurisdictionId, game.playerPersonId],
  participants: [
    {
      personId: game.playerPersonId,
      role: "presence:attendee",
      detail: null,
    },
  ],
  personFactConstraints: [],
  visibility: "public",
  tags: ["civic"],
  summary: "Residents met for a scheduled public community meeting.",
  context: {
    location: {
      jurisdictionId,
      label: "Community meeting room",
      setting: null,
    },
    socialContext: null,
    pressure: null,
    choice: null,
    motivation: null,
    immediateReaction: null,
  },
});
const sourceEvent = withEvent.history.events.at(-1)!;
const world = publishPublicEvent(withEvent, {
  stableKey: "civic-ledger:browser-proof",
  sourceEventId: sourceEvent.id,
});
const canonicalWorld = serializeWorld(world);
const model = projectPublicInformationPanel(world, jurisdictionId);
const root = createRoot(document.getElementById("root")!);

function render(): void {
  root.render(
    <PublicInformationPanel
      model={model}
      onClose={() => {
        document.body.dataset.panelClosed = "true";
      }}
      onOpenPerson={(personId) => {
        document.body.dataset.openedPersonId = personId;
        document.getElementById("opened-person")!.textContent = world.people[
          personId
        ]
          ? `Opened person ${personId}`
          : "Missing person";
      }}
    />,
  );
}

render();
document.body.dataset.worldBefore = canonicalWorld;
document.body.dataset.worldAfter = serializeWorld(world);
