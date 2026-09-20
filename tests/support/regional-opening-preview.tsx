import { BANKED_OPENING_REGIONAL_CANDIDATES } from "../../src/presentation/opening-regional-candidates";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { WorldOrientationPanel } from "../../src/player/WorldOrientationPanel";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { projectOpeningWorldSnapshot } from "../../src/presentation/opening-world-snapshot";
import { projectOrientationView } from "../../src/presentation/world-orientation";
import { makeIsoDate } from "../../src/simulation/dates";
/** Explicit June fixture, not normal-start time advancement or saved state. */
export function mountRegionalOpeningPreview() {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "regional-fixture",
      placeKey: "2160852",
      household: "lives-alone",
      startKind: "custom",
    }),
  ).game!;
  const world = { ...game.world, currentDate: makeIsoDate("2026-06-05") };
  const projected = projectOpeningWorldSnapshot(world, game.playerPersonId);
  const host = document.createElement("div");
  host.id = "regional-fixture";
  document.body.replaceChildren(host);
  createRoot(host).render(
    createElement(WorldOrientationPanel, {
      world,
      regionalCandidates: BANKED_OPENING_REGIONAL_CANDIDATES,
      personId: game.playerPersonId,
      view: projectOrientationView(projected.orientation, () => "Kentucky"),
      homeStateUsps: "KY",
      mode: "revisit",
      onClose: () => {},
      onOpenPerson: () => {},
      renderFigure: () => null,
    }),
  );
}
