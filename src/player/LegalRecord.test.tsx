import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { observerPlace } from "../presentation/observer-world";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../presentation/ordinary-life";
import {
  enterPlea,
  referForProsecution,
  PROSECUTION_TIMING_PROFILE,
} from "../simulation/justice/prosecution";
import { LegalRecordPanel, SelfRecordTabs } from "./LegalRecord";

/**
 * The Legal tab shows the player's own case from the court's records and
 * offers a plea only while the court would take one. The place is drawn from
 * all 56 by the seed.
 */
describe("the Legal tab of the player's own record", () => {
  const seed = "legal-tab-ui-1";
  const place = observerPlace(seed);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 41,
      questionnaire: "skipped",
    }),
  ).game!;
  const playerId = game.playerPersonId;
  const opened = openOrdinaryLife(game.world, playerId);
  const panel = (world: typeof opened, readOnly = false): string =>
    renderToStaticMarkup(
      <LegalRecordPanel
        world={world}
        personId={playerId}
        readOnly={readOnly}
        onWorldChange={() => undefined}
      />,
    );

  it(`reads a clean record before any charge (${place.key}, seed ${seed})`, () => {
    const html = panel(opened);
    expect(html).toContain("No one has charged you with a crime.");
    expect(html).toContain("No charges on record.");
    expect(html).toContain("No sentences on record.");
    expect(html).not.toContain("Plead guilty");
  });

  it(`offers the plea while the charge is open, and not after (${place.key}, seed ${seed})`, () => {
    const referred = referForProsecution(opened, {
      stableKey: `legal-tab-ui:${seed}`,
      subjectPersonId: playerId,
      jurisdictionId: opened.people[playerId]!.homeJurisdictionId,
      offenseKey: "campaign-funds-personal-use",
      referredBy: {
        kind: "regulator",
        label: "state regulator",
        personId: null,
      },
      basisEventIds: [],
      evidence: "documentary",
      standingFindings: 2,
    });
    const charged = passOrdinaryDays(
      referred.world,
      PROSECUTION_TIMING_PROFILE.chargeDecisionDays + 14,
    );
    const open = panel(charged);
    expect(open).toContain("taking campaign money for personal use");
    expect(open).toContain("The hearing is set for");
    expect(open).toContain("Plead not guilty");
    expect(open).toContain("Plead guilty");
    expect(open).toContain("One charge against you is waiting for your plea.");
    // A watched life offers no actions.
    expect(panel(charged, true)).not.toContain("Plead guilty");

    const pleaded = enterPlea(charged, {
      personId: playerId,
      referralId: referred.referralId,
      plea: "guilty",
    });
    expect(pleaded.ok).toBe(true);
    const after = panel(pleaded.world);
    expect(after).toContain("You will plead guilty at the hearing");
    expect(after).not.toContain("Plead not guilty");
  }, 600_000);

  it("shows the record tab first, with Legal beside it", () => {
    const html = renderToStaticMarkup(
      <SelfRecordTabs record={<p>the dossier</p>} legal={<p>legal</p>} />,
    );
    expect(html).toContain('data-testid="self-record-tab-legal"');
    expect(html).toContain("the dossier");
    expect(html).not.toContain("<p>legal</p>");
  });
});
