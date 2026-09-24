import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
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
  });
});
