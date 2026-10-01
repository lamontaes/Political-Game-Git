import { describe, expect, it } from "vitest";

import {
  courtCasesOf,
  enterPlea,
  referForProsecution,
  sentencesOf,
  UNRESEARCHED_PROSECUTION,
} from "../simulation/justice/prosecution";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { observerPlace } from "./observer-world";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/**
 * The player answers a charge themselves. Nobody pleads for the player: with
 * no plea entered the court enters not guilty, and a plea the player enters
 * is the one the court takes. The place is drawn from all 56 by the seed.
 */
describe("the player enters their own plea", () => {
  const seed = "player-plea-1";
  const place = observerPlace(seed);
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const playerId = game.playerPersonId;
  const opened = openOrdinaryLife(game.world, playerId);
  const referred = referForProsecution(opened, {
    stableKey: `player-plea:${seed}`,
    subjectPersonId: playerId,
    jurisdictionId: opened.people[playerId]!.homeJurisdictionId,
    offenseKey: "campaign-funds-personal-use",
    referredBy: { kind: "regulator", label: "state regulator", personId: null },
    basisEventIds: [],
    evidence: "documentary",
    standingFindings: 2,
  });
  const referralId = referred.referralId;
  const charged = passOrdinaryDays(
    referred.world,
    UNRESEARCHED_PROSECUTION.chargeDecisionDays + 14,
  );

  it(`learns of the case only once charged (${place.key})`, () => {
    expect(courtCasesOf(referred.world, playerId)).toEqual([]);
    expect(
      enterPlea(referred.world, {
        personId: playerId,
        referralId,
        plea: "guilty",
      }),
    ).toMatchObject({
      ok: false,
      reason: "There is no charge against them to answer.",
    });
    const [open] = courtCasesOf(charged, playerId);
    expect(open).toMatchObject({
      referralId,
      offenseLabel: "taking campaign money for personal use",
      enteredPlea: null,
      outcome: null,
    });
    expect(open!.hearingOn! > charged.currentDate).toBe(true);
  });

  it("takes the player's guilty plea at the hearing, and only one plea", () => {
    const entered = enterPlea(charged, {
      personId: playerId,
      referralId,
      plea: "guilty",
    });
    expect(entered.ok).toBe(true);
    expect(courtCasesOf(entered.world, playerId)[0]!.enteredPlea).toBe(
      "guilty",
    );
    expect(
      enterPlea(entered.world, {
        personId: playerId,
        referralId,
        plea: "not-guilty",
      }),
    ).toMatchObject({ ok: false, reason: "A plea has already been entered." });

    const later = passOrdinaryDays(
      entered.world,
      UNRESEARCHED_PROSECUTION.resolveAfterDays + 14,
    );
    const [closed] = courtCasesOf(later, playerId);
    expect(closed).toMatchObject({ outcome: "plea", hearingOn: null });
    const ended = later.history.events.find(
      (event) =>
        event.type === "justice.case-ended" &&
        event.tags.includes(`justice.referral:${referralId}`),
    );
    expect(ended?.context.motivation).toBe("They chose to plead guilty.");
    // The game did not decide the plea for them.
    expect(
      later.history.decisionTraces.some(
        (trace) => trace.context.decisionType === "justice.plea",
      ),
    ).toBe(false);
    expect(closed!.sentencedEventId).not.toBeNull();
    expect(sentencesOf(later, playerId)).toHaveLength(1);
    expect(
      enterPlea(later, { personId: playerId, referralId, plea: "guilty" }),
    ).toMatchObject({ ok: false, reason: "The case is already over." });
  }, 600_000);
});
