import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { projectDayRhythm } from "../presentation/day-rhythm";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { passOrdinaryDays } from "../presentation/ordinary-life";
import {
  DEFAULT_PREFERENCES,
  INITIAL_INTERFACE_PROGRESS,
} from "../presentation/shell-navigation";
import { MorningThoughtPanel } from "./MorningThoughtPanel";
import { WorldRecapPanel } from "./WorldRecapPanel";

describe("daily notes in the player room", () => {
  it("shows the saved Today facts in the optional morning note", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "day-rhythm-player-ui",
        startAge: 34,
      }),
    ).game!;
    const read = projectDayRhythm(
      game.world,
      game.playerPersonId,
      {
        ...INITIAL_INTERFACE_PROGRESS,
        recapFrontier: game.world.history.nextSequence,
        recapThroughMoment: game.world.currentMoment,
      },
      DEFAULT_PREFERENCES,
    );
    expect(read.morningThought).not.toBeNull();
    const html = renderToStaticMarkup(
      <MorningThoughtPanel
        thought={read.morningThought!}
        onDismiss={() => {}}
        onOpenToday={() => {}}
      />,
    );
    expect(html).toContain(read.morningThought!.today.now);
    expect(html).toContain('data-testid="morning-thought-open-today"');
    expect(html).toContain('data-testid="morning-thought-dismiss"');
  });

  it("lets a quiet crossed day be acknowledged without claiming nothing happened", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "day-rhythm-player-quiet",
        startAge: 34,
      }),
    ).game!;
    const next = passOrdinaryDays(game.world, 1);
    const read = projectDayRhythm(
      next,
      game.playerPersonId,
      {
        ...INITIAL_INTERFACE_PROGRESS,
        recapFrontier: game.world.history.nextSequence,
        recapThroughMoment: game.world.currentMoment,
      },
      DEFAULT_PREFERENCES,
    );
    expect(read.summary?.completedDay).toBe(true);
    expect(read.summary?.recap).toBeNull();
    const html = renderToStaticMarkup(
      <WorldRecapPanel
        summary={read.summary!}
        onDismiss={() => {}}
        onOpenNews={() => {}}
        onOpenPerson={() => {}}
      />,
    );
    expect(html).toContain("No new notices reached you during this time.");
    expect(html).toContain('data-testid="recap-dismiss"');
    expect(html).not.toContain('data-testid="recap-open-news"');
  });
});
