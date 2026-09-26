import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import {
  currentOpeningLifeScene,
  currentPlayerOpeningLifeScene,
  openNextLifeScene,
} from "../../presentation/life-scene-flow";
import { projectPlayerStoryMoment } from "../../presentation/life-story";
import { projectToday } from "../../presentation/day-overview";
import { OpeningLifeFlow } from "./OpeningLifeFlow";

describe("ordinary life without a situation", () => {
  it("does not expose an archived authored moment as a player scene", () => {
    const life = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "archived-life-scene-cutover",
      startKind: "custom",
      startAge: 8,
    });
    const world = openNextLifeScene(life.world, life.playerPersonId);
    const archived = currentOpeningLifeScene(world, life.playerPersonId);
    expect(archived).not.toBeNull();
    expect(
      currentPlayerOpeningLifeScene(world, life.playerPersonId),
    ).toBeNull();
    expect(
      projectPlayerStoryMoment(world, life.playerPersonId).scene.kind,
    ).toBe("ordinary-stretch");
    expect(projectToday(world, life.playerPersonId).now).toBe("");
    const html = renderToStaticMarkup(
      <OpeningLifeFlow
        world={world}
        playerPersonId={life.playerPersonId}
        onWorldChange={() => {}}
        onTalkTo={() => {}}
        pendingAvailable={false}
      />,
    );
    expect(html).not.toContain(archived!.prose);
    expect(html).not.toContain('data-testid="life-scene-prose"');
  });
  it("does not reopen a blank moment even when a stale panel-open flag remains", () => {
    const life = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "ordinary-moment-hidden",
      startKind: "custom",
      startAge: 8,
    });
    const html = renderToStaticMarkup(
      <OpeningLifeFlow
        world={life.world}
        playerPersonId={life.playerPersonId}
        onWorldChange={() => {}}
        onTalkTo={() => {}}
        pendingAvailable={false}
        pendingOpen
        pendingLife={<div data-testid="blank-moment" />}
        onOpenPending={() => {}}
        onClosePending={() => {}}
      />,
    );
    expect(html).not.toContain('data-testid="blank-moment"');
    expect(html).not.toContain('data-testid="open-moment"');
  });
});
