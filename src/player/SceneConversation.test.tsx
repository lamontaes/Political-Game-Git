import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SceneConversation, ConversationScales } from "./SceneConversation";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { openNextLifeScene } from "../presentation/life-scene-flow";
import { projectPlayerConversation } from "../presentation/player-conversation";
import { commitConversationTurn } from "../presentation/run-b-conversation";
import { conversationExchangeTurns } from "../presentation/scene-conversation";
import { deserializeWorld, serializeWorld } from "../simulation";

describe("locked conversation presentation", () => {
  it.each([
    [true, false, "level", false],
    [true, true, "tipped", true],
    [false, true, "level", false],
  ] as const)(
    "scales available=%s active=%s",
    (available, active, icon, pressed) => {
      const html = renderToStaticMarkup(
        <ConversationScales
          available={available}
          active={active}
          onToggle={() => {}}
        />,
      );
      expect(html).toContain(`scales-${icon}.svg`);
      expect(html).toContain(`aria-pressed="${pressed}"`);
      expect(html).toContain('aria-label="Show knowingly false replies"');
      expect(html).toContain('width="34" height="34"');
      expect(html.includes('disabled=""')).toBe(!available);
      expect(html).not.toMatch(/>Lie<|lie-marker/);
    },
  );

  it("deploys the selected SVG bytes unchanged", () => {
    for (const name of ["scales-level.svg", "scales-tipped.svg"]) {
      expect(readFileSync(`public/ui/kit12/${name}`)).toEqual(
        readFileSync(`docs/codex/ui-logo-packet/01_kit12_ui/${name}`),
      );
    }
  });

  it("keeps real portraits, offered words and a canonical committed turn through reload", () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "locked-dialogue-reload",
      startAge: 34,
      household: "shares-a-home",
      startingLife: "ordinary-life",
    });
    const player = game.playerPersonId;
    const world = openNextLifeScene(
      openOrdinaryLife(game.world, player),
      player,
    );
    const view = projectPlayerConversation(world, player, "life-talk")!;
    expect(view).not.toBeNull();
    const props = {
      playerPersonId: player,
      subject: "life-talk" as const,
      addressee: view.addressee,
      onWorldChange: () => {},
      onChange: () => {},
      onBack: () => {},
    };
    const html = renderToStaticMarkup(
      <SceneConversation {...props} world={world} />,
    );
    expect(html).toContain(`data-person-id="${player}"`);
    expect(html).toContain(`data-person-id="${view.addressee}"`);
    expect(html).toContain('class="pg-talk-choice-number"');
    expect(html).not.toContain('data-testid="lie-marker"');
    for (const option of view.intents.filter(
      (entry) =>
        entry.key !== "listen" && entry.truthIntent !== "deliberate-deception",
    )) {
      expect(html).toContain(
        renderToStaticMarkup(<>{option.spokenWords ?? option.label}</>),
      );
    }
    const after = commitConversationTurn(world, {
      session: view.session,
      room: view.room,
      progress: view.progress,
      turnOrdinal: view.turnOrdinal,
      addressee: view.addressee,
      audibility: view.audibility,
      intent: "greet",
    }).world;
    const payload = serializeWorld(after);
    const loaded = deserializeWorld(payload);
    expect(serializeWorld(loaded)).toBe(payload);
    const beforeTurns = conversationExchangeTurns(
      after,
      player,
      "life-talk",
      view.addressee === "everyone" ? null : view.addressee,
    );
    expect(beforeTurns).toHaveLength(1);
    expect(
      conversationExchangeTurns(
        loaded,
        player,
        "life-talk",
        view.addressee === "everyone" ? null : view.addressee,
      ),
    ).toEqual(beforeTurns);
    expect(
      renderToStaticMarkup(<SceneConversation {...props} world={loaded} />),
    ).toBe(
      renderToStaticMarkup(<SceneConversation {...props} world={after} />),
    );
  });
});
