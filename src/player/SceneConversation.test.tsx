import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SceneConversation } from "./SceneConversation";
import { LieButton } from "./LieButton";
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
    [true, false, false],
    [true, true, true],
    [false, true, false],
  ] as const)(
    "Lie button available=%s active=%s",
    (available, active, pressed) => {
      const html = renderToStaticMarkup(
        <LieButton available={available} active={active} onToggle={() => {}} />,
      );
      // The owner's control name, beside the replies (design record, Oct 8).
      expect(html).toContain(">Lie</button>");
      expect(html).toContain('data-testid="talk-lie-toggle"');
      expect(html).toContain(`aria-pressed="${pressed}"`);
      expect(html.includes('disabled=""')).toBe(!available);
      expect(html.includes('data-problem="no-lie-on-offer"')).toBe(!available);
    },
  );

  it("puts the Lie button beside an ordinary conversation's replies, resting while no lie is offered", () => {
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
    const html = renderToStaticMarkup(
      <SceneConversation
        world={world}
        playerPersonId={player}
        subject="life-talk"
        addressee={view.addressee}
        onWorldChange={() => {}}
        onChange={() => {}}
        onBack={() => {}}
      />,
    );
    const row = html.slice(html.indexOf('class="pg-reply-row"'));
    expect(row).toMatch(/^class="pg-reply-row"><button[^>]*talk-lie-toggle/);
    expect(row.indexOf("talk-lie-toggle")).toBeLessThan(
      row.indexOf("life-talk-choice"),
    );
    expect(row).toMatch(/talk-lie-toggle"[^>]*disabled=""/);
  });

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
