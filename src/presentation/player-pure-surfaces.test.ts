import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "./new-game";
import {
  establishOpeningOfficeholders,
  openingOfficeholders,
} from "./opening-officeholders";
import { projectPersonDossier } from "./person-dossier";
import { forbiddenPlayerPhrasesIn } from "./player-copy";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { PersonCard } from "../player/PersonCard";
import type { EntityId, World } from "../simulation";

/**
 * What ordinary play actually renders.
 *
 * The distinction this file exists to hold is that a repository grep cannot
 * make it. Every phrase guarded here appears somewhere legitimate — in the
 * source domains that record why a retrieval failed, in the developer routes
 * that exist to show exactly that, in the tests pinning both. Grepping the tree
 * for "retrieved" would flag all of it and teach everyone to route around the
 * guard. So the subject is the rendered markup of a player surface, on a world
 * the game really generates, and nothing else.
 *
 * Only visible text is judged. A `data-record-class` attribute and an href the
 * player never reads are not things the player is told.
 */
function visibleText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expectPlayerPure(html: string, surface: string): void {
  const text = visibleText(html);
  const offenders = forbiddenPlayerPhrasesIn(text);
  expect(
    offenders.map((entry) => `${surface}: ${entry.because} — ${entry.pattern}`),
  ).toEqual([]);
}

function newLife(seed: string) {
  const game = createNewGameWorld({
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
  });
  return { world: game.world, personId: game.playerPersonId };
}

function renderCard(
  world: World,
  playerId: EntityId,
  personId: EntityId,
  expanded: boolean,
): string {
  const dossier = projectPersonDossier(world, playerId, personId);
  expect(dossier).not.toBeNull();
  return renderToStaticMarkup(
    createElement(PersonCard, {
      world,
      playerId,
      dossier: dossier!,
      pinned: false,
      expanded,
      mode: expanded ? ("workspace" as const) : ("overlay" as const),
      onTogglePin: () => {},
      onOpenPerson: () => {},
      onOpenLink: () => {},
    }),
  );
}

describe("the person card in ordinary play", () => {
  it("says nothing about the engine when it knows a stranger", () => {
    const { world, personId } = newLife("player-pure-stranger");
    const staffed = establishOpeningOfficeholders(world, personId);
    const holder = openingOfficeholders(staffed)[0]!;

    for (const expanded of [false, true]) {
      const html = renderCard(staffed, personId, holder.personId, expanded);
      expectPlayerPure(html, `public person card (expanded=${expanded})`);
      /* The public fact is present — this is not passing by rendering nothing. */
      expect(visibleText(html)).toContain(holder.title);
    }
  });

  it("says nothing about the engine when it knows nothing at all", () => {
    const { world, personId } = newLife("player-pure-unknown");
    /*
     * Somebody the world has, whom the player has no household, kin, public
     * position or office record for. This is the case that used to produce a
     * card made entirely of negative statements.
     */
    const stranger = Object.keys(world.people).find(
      (id) => id !== personId,
    ) as EntityId | undefined;
    expect(stranger).toBeDefined();

    for (const expanded of [false, true]) {
      const html = renderCard(world, personId, stranger!, expanded);
      expectPlayerPure(html, `unknown person card (expanded=${expanded})`);
      expect(visibleText(html)).not.toContain("No record establishes");
      expect(visibleText(html)).not.toContain("not known to you");
    }
  });

  it("renders the player's own card without narrating its bookkeeping", () => {
    const { world, personId } = newLife("player-pure-self");
    expectPlayerPure(renderCard(world, personId, personId, true), "own card");
  });

  it("survives a save and reopen without either card changing", () => {
    const { world, personId } = newLife("player-pure-reopen");
    const staffed = establishOpeningOfficeholders(world, personId);
    const holder = openingOfficeholders(staffed)[0]!;

    /*
     * A round trip through the save format, so the guard covers the card the
     * player sees on Continue and not only the one they see on New Game — a
     * reopened world that reconstructed a dossier differently would show its
     * seams here.
     */
    const reopened = JSON.parse(JSON.stringify(staffed)) as World;
    expect(renderCard(reopened, personId, holder.personId, true)).toBe(
      renderCard(staffed, personId, holder.personId, true),
    );
  });
});

describe("withheld capabilities explain themselves in world", () => {
  it("gives a reason a person could say out loud", () => {
    /*
     * A ten-year-old has no legislative office and no campaign, and the game
     * says why rather than showing an empty screen. Those reasons are rendered
     * text, so they are held to the same rule as everything else here.
     */
    const game = createNewGameWorld({
      placeKey: "kentucky",
      startAge: 10,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: "player-pure-withheld",
      givenName: null,
      familyName: null,
    });
    const capabilities = resolvePlayerCapabilities(
      game.world,
      game.playerPersonId,
    );
    expect(capabilities.withheld.length).toBeGreaterThan(0);
    for (const withheld of capabilities.withheld) {
      const offenders = forbiddenPlayerPhrasesIn(withheld.reason);
      expect(
        offenders.map((entry) => `${withheld.surface}: ${entry.because}`),
      ).toEqual([]);
    }
  });
});
