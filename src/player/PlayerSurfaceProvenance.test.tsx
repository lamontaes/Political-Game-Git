import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { searchLifePlaces } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { World39News } from "./World39News";

/*
 * No source or provenance reference reaches a player.
 *
 * The rule is a separation rather than a deletion: provenance stays in the
 * engine and stays renderable behind `DIAGNOSTICS`, which reads an explicit
 * query-string opt-in that production navigation cannot reach. What it must
 * not do is appear in ordinary play.
 *
 * News no longer repeats the opening's officeholder section. The proof must
 * establish that the current public overview rendered, keep that retired
 * section absent, and check the markup for outbound provenance links.
 *
 * Markup proof, in the style of the other component tests here: pointer and
 * keyboard behavior is a browser proof and is not claimed by this file.
 */

function openingLife(seed: string) {
  const place = searchLifePlaces("", 1, {
    stateJurisdictionKey: "US-NV",
    scope: "locality",
  })[0]!;
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
}

describe("a player surface names no source", () => {
  it("renders the public overview without the retired officeholder section or outbound links", () => {
    const { world, playerPersonId } = openingLife("player-surface-provenance");
    const markup = renderToStaticMarkup(
      <World39News
        world={world}
        personId={playerPersonId}
        onOpenPerson={() => {}}
      />,
    );

    // Establish a populated public overview before checking for source leaks.
    expect(markup).toContain('aria-label="World overview"');
    expect(markup).toContain('data-testid="world39-standing"');
    expect(markup).toContain("Lately");
    expect(markup).not.toContain("In office");
    expect(markup).not.toContain("No public officeholders are named here yet.");
    expect(markup).not.toContain("Office details");

    expect(markup).not.toContain("href=");
    expect(markup).not.toContain("Institutional source");
    expect(markup.toLowerCase()).not.toContain("http");
  });
});
