import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import {
  currentOpeningLifeScene,
  openNextLifeScene,
} from "../../presentation/life-scene-flow";
import { LifeScenePanel } from "./LifeScenePanel";

function openScene() {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    household: "shares-a-home",
    startAge: 24,
    seed: "ui46-room-scene",
  });
  const world = openNextLifeScene(game.world, game.playerPersonId);
  expect(currentOpeningLifeScene(world, game.playerPersonId)).not.toBeNull();
  return { world, personId: game.playerPersonId };
}

let opened: ReturnType<typeof openScene>;
beforeAll(() => {
  opened = openScene();
}, 120_000);

function render(variant?: "room" | "workspace") {
  const { world, personId } = opened;
  return renderToStaticMarkup(
    <LifeScenePanel
      world={world}
      playerPersonId={personId}
      onWorldChange={() => {}}
      onTalkTo={() => {}}
      {...(variant ? { variant } : {})}
    />,
  );
}

describe("LifeScenePanel variants", () => {
  it("in the room, draws the scene alone: prose and choices, no errands", () => {
    const html = render("room");
    expect(html).toContain('data-testid="life-scene-prose"');
    expect(html).toContain('data-testid="life-scene-choices"');
    expect(html).not.toContain('data-testid="life-walks"');
    expect(html).not.toContain("Join a neighborhood walking group");
    expect(html).not.toContain("Personal plans");
  });

  it("in Personal, keeps the walks and personal plans beside the scene", () => {
    const html = render();
    expect(html).toContain('data-testid="life-scene-prose"');
    expect(html).toContain('data-testid="life-walks"');
    expect(html).toContain("Personal plans");
  });
});
