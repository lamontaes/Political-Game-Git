import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "./new-game";
import {
  establishOpeningOfficeholders,
  openingOfficeholders,
} from "./opening-officeholders";
import { projectCampaign } from "./campaign-projection";
import { projectCampaignOffices } from "./campaign-office-discovery";
import { projectLifeRecord } from "./life-record";
import { projectLegislativeOfficeContext } from "./legislative-office-context";
import { projectPersonDossier } from "./person-dossier";
import { projectPublicInformationPanel } from "./public-information-adapters";
import { forbiddenPlayerPhrasesIn } from "./player-copy";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { PersonCard } from "../player/PersonCard";
import { recordWorldEvent } from "../simulation";
import { publishPublicEvent } from "../simulation/public-information";
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
    const stranger = Object.keys(world.people).find((id) => id !== personId) as
      EntityId | undefined;
    expect(stranger).toBeDefined();

    for (const expanded of [false, true]) {
      const html = renderCard(world, personId, stranger!, expanded);
      expectPlayerPure(html, `unknown person card (expanded=${expanded})`);
      expect(visibleText(html)).not.toContain("No record establishes");
      expect(visibleText(html)).not.toContain("not known to you");
    }
  });

  it("names the player as the player on somebody else's card", () => {
    const { world, personId } = newLife("evidence-seed");
    const relative = Object.keys(world.people).find(
      (id) => id !== personId,
    ) as EntityId;
    const html = visibleText(renderCard(world, personId, relative, true));

    /*
     * The connected-people row fell back to the edge's label for any node
     * without its own relationship, and the player has none — so the player's
     * own name appeared under the card subject's relationship, reading
     * "Diana Marshall / your dad" on her father's card. The subject keeps the
     * relationship; the player is "you".
     */
    const player = world.people[personId]!;
    const playerName = `${player.givenName} ${player.familyName}`;
    expect(html).toContain(playerName);
    expect(html).not.toMatch(
      new RegExp(`${playerName}\\s+your (?:dad|mum|mom|mother|father)`),
    );
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

describe("the reading surfaces ordinary play offers", () => {
  /*
   * News, Journal and the office/bill context are the screens the contract
   * names, and all three already read like what they are — a newspaper, a
   * biography and a set of government documents. They are pinned here anyway.
   * These projections are where a source note would surface if one were ever
   * threaded through, and the cost of finding that out from the guard rather
   * than from the owner playing the game is very low.
   */
  it("keeps the news reading like news", () => {
    const { world, personId } = newLife("player-pure-news");
    /*
     * A fresh life has published nothing, and looping over an empty digest
     * would have proved exactly nothing — which is what the first draft of this
     * test did. So a public event is recorded and published first, and the
     * digest is required to be non-empty before its copy is judged.
     */
    const withEvent = recordWorldEvent(world, {
      stableKey: "player-pure:news:forum",
      type: "civic.public-forum-held",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [personId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["civic"],
      summary: "A public forum concluded at the county building.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const staffed = publishPublicEvent(withEvent, {
      stableKey: "player-pure:news:forum-publication",
      sourceEventId: withEvent.history.events.at(-1)!.id,
    });
    const model = projectPublicInformationPanel(staffed);
    expect(model.items.length).toBeGreaterThan(0);
    for (const item of model.items) {
      expectPlayerPure(item.headline, "news headline");
      expectPlayerPure(item.body, "news body");
    }
    for (const outlet of model.outlets)
      expectPlayerPure(outlet.outletName, "news outlet");
  });

  it("keeps the journal reading like a biography", () => {
    const { world, personId } = newLife("player-pure-journal");
    const record = projectLifeRecord(world, personId);
    expect(
      record.chapters.flatMap((chapter) => chapter.entries).length,
    ).toBeGreaterThan(0);
    expectPlayerPure(record.summary, "journal summary");
    for (const chapter of record.chapters) {
      expectPlayerPure(chapter.heading, "journal chapter");
      for (const entry of chapter.entries)
        expectPlayerPure(entry.sentence, "journal entry");
    }
    for (const person of record.people)
      expectPlayerPure(person.sentence, "journal person");
  });

  it("offers a candidacy without reciting how the rules were compiled", () => {
    const { world, personId } = newLife("player-pure-campaign");
    /*
     * Every office the pack offers, not just the default view. Passing null
     * takes the aggregate branch and leaves the per-office line untested, which
     * is how the first version of this check passed with the leak still in
     * place — it went green whether or not the note was rendered.
     */
    const offices = projectCampaignOffices(world, personId);
    expect(offices.length).toBeGreaterThan(0);
    const views = [
      projectCampaign(world, personId, null),
      ...offices.map((office) =>
        projectCampaign(world, personId, office.officeKey),
      ),
    ];
    /*
     * This is the leak the first pass missed. The seat-count line fell through
     * to the rule pack's own note when the number was unknown — "the formal
     * chamber seat count was carried from compiled research, but no instrument
     * fixing it was separately read for this pack. The unresolved formal count
     * carries no numeric fallback." That is addressed to whoever compiles
     * packs, not to somebody deciding whether to run, and every Kentucky office
     * has an unknown seat count, so every one of these views carried it.
     */
    for (const view of views) {
      if (view.officeAuthority !== null)
        expectPlayerPure(view.officeAuthority, "campaign office authority");
      if (view.unavailableReason)
        expectPlayerPure(view.unavailableReason, "campaign unavailable reason");
      for (const offer of view.offers)
        expectPlayerPure(offer.label, "campaign offer");
    }
  });

  it("explains an office and its bills without citing its paperwork", () => {
    const { world, personId } = newLife("player-pure-office");
    const context = projectLegislativeOfficeContext(world, personId, null);
    for (const [name, field] of [
      ["term commencement", context.termCommencement],
      ["term expiry", context.termExpiry],
      ["committee membership", context.committeeMembership],
    ] as const) {
      if (field.kind === "unavailable") expectPlayerPure(field.reason, name);
    }
  });
});
