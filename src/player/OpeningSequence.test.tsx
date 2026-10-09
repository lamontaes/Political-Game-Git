import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { projectOpeningStops } from "../presentation/opening-stops";
import { isTerritoryUsps } from "../simulation/state-reference";
import { OpeningLedger, OpeningSequence } from "./OpeningSequence";

/**
 * The cinematic opening's screen (owner, October 8, 2026, revised 11:14
 * p.m.): the first cut is the country under the President's address, every
 * number waits closed behind the Ledger, and the subtitles are the address
 * composer's words, never the screen's own. The place is drawn from all 56
 * by the named seed.
 */
const SEED = "p4-opening-screen";
const place = drawRandomPlace(SEED, (entry) => entry.scope === "locality");

describe(
  `the opening screen (${place.displayName}, seed ${SEED})`,
  { timeout: 300_000 },
  () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: SEED,
        placeKey: place.key,
        startAge: 34,
      }),
    ).game!;
    const { world, playerPersonId: personId } = game;
    const render = (props: Partial<Parameters<typeof OpeningSequence>[0]>) =>
      renderToStaticMarkup(
        <OpeningSequence
          world={world}
          personId={personId}
          mode="first"
          onClose={() => {}}
          onOpenPerson={() => {}}
          {...props}
        />,
      );

    it("opens on the country cut with the Ledger closed, and writes nothing", () => {
      const before = JSON.stringify(world);
      const html = render({});
      const view = projectOpeningStops(world, personId);
      expect(html).toContain('data-step="country"');
      expect(html).toContain(`data-address="${view.address}"`);
      expect(html).toContain('data-testid="opening-ledger-toggle"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).not.toContain('data-testid="opening-ledger"');
      expect(html).toContain('data-testid="orientation-place-backdrop"');
      expect(html).toContain(">Skip<");
      expect(JSON.stringify(world)).toBe(before);
    });

    it("shows the address composer's words for the cut, and none of its own", () => {
      const silent = render({});
      expect(silent).toMatch(
        /data-testid="orientation-step-country"[^>]*><\/p>/,
      );
      const spoken = render({
        subtitleFor: (stop) => (stop === "country" ? "Address words." : null),
      });
      expect(spoken).toMatch(
        /data-testid="orientation-step-country"[^>]*>Address words\.<\/p>/,
      );
    });

    it("is closed, not skipped, when reopened from the menu", () => {
      const html = render({ mode: "revisit" });
      expect(html).toContain(">Close<");
      expect(html).not.toContain(">Skip<");
    });

    it("keeps the state's voting out of a territory's Ledger", () => {
      const rows = projectOpeningStops(world, personId).ledger;
      // A state and a territory, each drawn by its own named seed.
      const usps = (seed: string, territory: boolean) =>
        drawRandomPlace(
          seed,
          (entry) =>
            isTerritoryUsps(entry.stateJurisdictionKey.replace(/^US-/, "")) ===
            territory,
        ).stateJurisdictionKey.replace(/^US-/, "");
      const state = renderToStaticMarkup(
        <OpeningLedger
          rows={rows}
          stateUsps={usps("p4-ledger-state", false)}
          asOf={world.currentDate}
        />,
      );
      expect(state).toContain('data-testid="opening-state-voting"');
      const territory = renderToStaticMarkup(
        <OpeningLedger
          rows={rows}
          stateUsps={usps("p4-ledger-territory", true)}
          asOf={world.currentDate}
        />,
      );
      expect(territory).not.toContain('data-testid="opening-state-voting"');
      expect(territory).toContain('data-testid="opening-state-population"');
      for (const row of rows) expect(territory).toContain(row.label);
    });
  },
);
