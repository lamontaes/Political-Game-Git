import { REGIONAL_TYPE_REVIEW_CANDIDATES } from "../../src/presentation/opening-regional-candidates";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { WorldOrientationPanel } from "../../src/player/WorldOrientationPanel";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { projectOpeningWorldSnapshot } from "../../src/presentation/opening-world-snapshot";
import { projectOrientationView } from "../../src/presentation/world-orientation";
import { daysBetween, makeIsoDate } from "../../src/simulation/dates";
import {
  advanceWorld,
  createCampaignElectionTransitionRegistry,
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation";

let root: Root | undefined;
let readPurity = () => false;
export function regionalPreviewUnchanged() {
  return readPurity();
}

/** Test-only seasonal fixture. Both date and moment advance through the real
 * simulation writer before the read-only panel receives a saved/reloaded World. */
export function mountRegionalOpeningPreview(options: {
  placeKey: string;
  stateName: string;
  summer: boolean;
  reviewCandidates: boolean;
}) {
  root?.unmount();
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: `regional-fixture:${options.placeKey}`,
      placeKey: options.placeKey,
      household: "lives-alone",
      startKind: "custom",
    }),
  ).game!;
  const prepared = options.summer
    ? advanceWorld(
        game.world,
        daysBetween(game.world.currentDate, makeIsoDate("2026-06-05")),
        createCampaignElectionTransitionRegistry(),
      )
    : game.world;
  const saved = serializeWorld(prepared);
  const world = deserializeWorld(saved);
  const projected = projectOpeningWorldSnapshot(world, game.playerPersonId);
  if (
    JSON.stringify(projected) !==
    JSON.stringify(projectOpeningWorldSnapshot(prepared, game.playerPersonId))
  )
    throw new Error("Saved regional opening changed on reload");
  readPurity = () => serializeWorld(world) === saved;
  const host = document.createElement("div");
  host.id = "regional-fixture";
  document.body.replaceChildren(host);
  root = createRoot(host);
  root.render(
    createElement(WorldOrientationPanel, {
      world,
      ...(options.reviewCandidates
        ? { regionalCandidates: REGIONAL_TYPE_REVIEW_CANDIDATES }
        : {}),
      personId: game.playerPersonId,
      view: projectOrientationView(
        projected.orientation,
        () => options.stateName,
      ),
      homeStateUsps: projected.orientation.homeState?.stateUsps ?? null,
      mode: "revisit",
      onClose: () => {},
      onOpenPerson: () => {},
      renderFigure: () => null,
    }),
  );
  return { date: world.currentDate, moment: world.currentMoment };
}
