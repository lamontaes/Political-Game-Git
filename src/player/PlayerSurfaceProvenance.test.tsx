import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { searchLifePlaces } from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { World39News } from "./World39News";
import { FullDossier } from "./ShellDossier";
import { projectPersonDossier } from "../presentation/person-dossier";
import { projectPersonContact } from "../presentation/person-contact";
import { serializeWorld } from "../simulation/serialization";

/*
 * No source or provenance reference reaches a player.
 *
 * The rule is a separation rather than a deletion: provenance stays in the
 * engine and stays renderable behind `DIAGNOSTICS`, which reads an explicit
 * query-string opt-in that production navigation cannot reach. What it must
 * not do is appear in ordinary play.
 *
 * An earlier sweep took sixteen of these out, all of them sentences the engine
 * built. This one was a link: `World39News` rendered every officeholder's
 * institutional sources as `Institutional source 1`, `2`, … inside the Office
 * details disclosure, on a surface the shell mounts for every life. A sweep
 * over built sentences could not see it, so this proof is over rendered markup
 * instead — the thing the player's browser actually receives.
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
  it("renders the World overview with officeholders and no outbound link", () => {
    const { world, playerPersonId } = openingLife("player-surface-provenance");
    const markup = renderToStaticMarkup(
      <World39News
        world={world}
        personId={playerPersonId}
        onOpenPerson={() => {}}
      />,
    );

    // The proof is worthless if the surface came back empty, so establish that
    // it drew what carries the sources before asserting they are absent.
    expect(markup).toContain("In office");
    expect(markup).not.toContain("No public officeholders are named here yet.");
    expect(markup).toContain("Office details");

    expect(markup).not.toContain("href=");
    expect(markup).not.toContain("Institutional source");
    expect(markup.toLowerCase()).not.toContain("http");
  });
});


describe("full-record scene presence", () => {
  it("offers Meet for the projected scene without changing the saved world", () => {
    const { world, playerPersonId } = openingLife("full-record-scene-presence");
    // The full record receives the caller's current scene projection. Its
    // subject can be absent from the independently projected opening scene.
    const personId = world.personOrder.find((id) => {
      if (id === playerPersonId) return false;
      const contact = projectPersonContact(world, playerPersonId, id);
      return !contact.meet.available && !contact.meet.reason.endsWith("has died.");
    })!;
    expect(personId).toBeDefined();
    const dossier = projectPersonDossier(world, playerPersonId, personId, {
      presentNow: true,
    })!;
    const before = serializeWorld(world);
    const markup = renderToStaticMarkup(
      <FullDossier
        world={world}
        playerId={playerPersonId}
        dossier={dossier}
        pinned={false}
        onTogglePin={() => {}}
        onTalk={() => {}}
        onMeet={() => {}}
        talkUnavailable={null}
        onOpenLink={() => {}}
      />,
    );
    expect(markup).toContain("Here in the room with you.");
    expect(markup).toContain('data-testid="person-meet"');
    expect(markup).toContain("is in the room. Meet takes you back to that scene.");
    expect(markup).not.toContain("No recorded location for");
    expect(serializeWorld(world)).toBe(before);
  });
});
