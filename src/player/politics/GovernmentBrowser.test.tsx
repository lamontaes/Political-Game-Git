import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { GovernmentBrowser } from "./GovernmentBrowser";

describe("GovernmentBrowser court route", () => {
  it("shows the saved opening court rosters at State and Federal scopes", () => {
    const session = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "team-e-court-route",
      }),
    );
    const game = session.game!;
    expect(game.world.judiciary).toBeDefined();
    const renderScope = (scope: "state" | "federal") =>
      renderToStaticMarkup(
        <GovernmentBrowser
          world={game.world}
          personId={game.playerPersonId}
          place="here"
          scope={scope}
          onSelectionChange={() => {}}
          onOpenPerson={() => {}}
          onOpenMeasure={() => {}}
        />,
      );

    const state = renderScope("state");
    expect(state).toContain('data-testid="government-scope-state"');
    expect(state).toContain('data-testid="state-court-roster"');
    expect(state).toContain('data-testid="person-portrait"');

    const federal = renderScope("federal");
    expect(federal).toContain('data-testid="government-scope-federal"');
    expect(federal).toContain('data-testid="federal-court-roster"');
    expect(federal).toContain("Supreme Court");
  });
});
