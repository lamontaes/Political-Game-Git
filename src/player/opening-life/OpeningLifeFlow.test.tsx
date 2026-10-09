import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { currentOpeningLifeScene } from "../../presentation/life-scene-flow";
import { OpeningLifeFlow } from "./OpeningLifeFlow";

describe("ordinary life without a situation", () => {
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

    const available = renderToStaticMarkup(
      <OpeningLifeFlow
        world={life.world}
        playerPersonId={life.playerPersonId}
        onWorldChange={() => {}}
        onTalkTo={() => {}}
        pendingAvailable
        pendingOpen={false}
        pendingLife={<div />}
        onOpenPending={() => {}}
      />,
    );
    expect(available).not.toContain('data-testid="open-moment"');
    expect(available).not.toContain("Your choices here");
    expect(available).not.toContain(
      "Who is here with you, and what you can do",
    );
  });

  it("shows an opened moment over the room even when no authored opening beat is current", () => {
    // A new life's first moment opens when the world introduction closes
    // (owner playtest A9); it must not wait on an authored opening scene.
    const life = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "ordinary-moment-hidden",
      startKind: "custom",
      startAge: 8,
    });
    expect(currentOpeningLifeScene(life.world, life.playerPersonId)).toBeNull();
    const html = renderToStaticMarkup(
      <OpeningLifeFlow
        world={life.world}
        playerPersonId={life.playerPersonId}
        onWorldChange={() => {}}
        onTalkTo={() => {}}
        pendingAvailable
        pendingOpen
        pendingLife={<div data-testid="first-moment" />}
        onOpenPending={() => {}}
        onClosePending={() => {}}
      />,
    );
    expect(html).toContain('data-testid="pending-life-surface"');
    expect(html).toContain('data-testid="first-moment"');
    expect(html).toContain('data-testid="pending-life-return"');
  });
});
