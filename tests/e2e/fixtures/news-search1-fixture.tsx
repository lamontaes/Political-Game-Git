import { createRoot } from "react-dom/client";

import "../../../src/player/player.css";
import { PublicInformationPanel } from "../../../src/player/PublicInformationPanel";
import { projectPublicInformationPanel } from "../../../src/presentation/public-information-adapters";
import { createNewGameWorld } from "../../../src/presentation/new-game";
import {
  correctPublication,
  publishPublicEvent,
  recordWorldEvent,
  serializeWorld,
} from "../../../src/simulation";

const game = createNewGameWorld({
  seed: "news-search1-browser-proof",
  placeKey: "kentucky",
  startAge: 30,
  depth: "summarize-earlier-life",
  startingLife: "ordinary-life",
  household: "shares-a-home",
  givenName: null,
  familyName: null,
});
const jurisdictionId = game.world.jurisdictionOrder[0]!;

function publishCommunityMeeting(stableKey: string, summary: string) {
  const withEvent = recordWorldEvent(game.world, {
    stableKey: `${stableKey}:event`,
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
    summary,
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
  game.world = publishPublicEvent(withEvent, {
    stableKey,
    sourceEventId: sourceEvent.id,
  });
}

publishCommunityMeeting(
  "news-search1:meeting-alpha",
  "Residents met for a scheduled public community meeting downtown.",
);
publishCommunityMeeting(
  "news-search1:meeting-beta",
  "A second public forum discussed the budget with bracketed [special] notes.",
);

const firstPublication = game.world.history.publications!.find(
  (publication) => publication.stableKey === "news-search1:meeting-beta",
)!;
game.world = correctPublication(game.world, {
  stableKey: "news-search1:meeting-beta-correction",
  correctsPublicationId: firstPublication.id,
  headline: `${firstPublication.headline} — corrected`,
  body: `${firstPublication.body} Clarified the chamber location.`,
  correctionNote: "Typo in chamber name.",
});

const canonicalWorld = serializeWorld(game.world);
const model = projectPublicInformationPanel(game.world, jurisdictionId);
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
        document.getElementById("opened-person")!.textContent = game.world
          .people[personId]
          ? `Opened person ${personId}`
          : "Missing person";
      }}
    />,
  );
}

render();
document.body.dataset.worldBefore = canonicalWorld;
document.body.dataset.worldAfter = serializeWorld(game.world);
