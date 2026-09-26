import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { deserializeWorld, serializeWorld } from "../simulation";
import { EMPTY_JOURNAL } from "../presentation/shell-navigation";
import { createNewGameWorld } from "../presentation/new-game";
import { World39Journal } from "./World39Journal";

describe("the live My life Journal", () => {
  it("shows the owner's heading and assembled first-person work line after Save/Continue", () => {
    const game = createNewGameWorld({
      placeKey: "kentucky",
      startAge: 34,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: "grounded-english-proof-2026-09-24",
      givenName: null,
      familyName: null,
    });
    const world = deserializeWorld(serializeWorld(game.world));
    const html = renderToStaticMarkup(
      <World39Journal
        world={world}
        personId={game.playerPersonId}
        journal={EMPTY_JOURNAL}
        onJournalChange={() => undefined}
        onOpenPerson={() => undefined}
      />,
    );
    expect(html).toContain("<h3>My life</h3>");
    expect(html).toContain(
      "I started work at Neighborhood Market as a store assistant.",
    );
    expect(html).not.toMatch(/\bYou (?:began|were born)\b/);
    expect(html).not.toContain('<details class="world39-record"');
    expect(html).not.toContain(
      "You began working as Store assistant at Neighborhood Market.",
    );
  });
});
