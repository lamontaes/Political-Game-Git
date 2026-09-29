import { describe, expect, it } from "vitest";

import { fileClemencyPetition } from "../simulation/justice/clemency";
import {
  enterPlea,
  referForProsecution,
  UNRESEARCHED_PROSECUTION,
} from "../simulation/justice/prosecution";
import { projectLegalRecord } from "./legal-record";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { observerPlace } from "./observer-world";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";

/**
 * The Legal tab's record follows the player's own case from the charge to
 * the sentence and a clemency request, and offers only the steps the actions
 * themselves allow. The place is drawn from all 56 by the seed.
 */
describe("the player's legal record", () => {
  const seed = "legal-record-1";
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
    stableKey: `legal-record:${seed}`,
    subjectPersonId: playerId,
    jurisdictionId: opened.people[playerId]!.homeJurisdictionId,
    offenseKey: "campaign-funds-personal-use",
    referredBy: { kind: "regulator", label: "state regulator", personId: null },
    basisEventIds: [],
    evidence: "documentary",
    standingFindings: 2,
  });
  const referralId = referred.referralId;

  it(`is empty until a charge, then offers the plea (${place.key})`, () => {
    expect(projectLegalRecord(referred.world, playerId)).toEqual({
      cases: [],
      sentences: [],
    });
    const charged = passOrdinaryDays(
      referred.world,
      UNRESEARCHED_PROSECUTION.chargeDecisionDays + 14,
    );
    const before = charged.history.events.length;
    const [open] = projectLegalRecord(charged, playerId).cases;
    expect(open).toMatchObject({
      referralId,
      offense: "taking campaign money for personal use",
      enteredPlea: null,
      canEnterPlea: true,
    });
    expect(open!.status).toMatch(/^The hearing is set for /);
    // Reading the record writes nothing.
    expect(charged.history.events).toHaveLength(before);

    const entered = enterPlea(charged, {
      personId: playerId,
      referralId,
      plea: "guilty",
    });
    const [pleaded] = projectLegalRecord(entered.world, playerId).cases;
    expect(pleaded).toMatchObject({
      enteredPlea: "guilty",
      canEnterPlea: false,
    });
    expect(pleaded!.status).toMatch(
      /^You will plead guilty at the hearing on /,
    );

    const sentenced = passOrdinaryDays(
      entered.world,
      UNRESEARCHED_PROSECUTION.resolveAfterDays + 14,
    );
    const record = projectLegalRecord(sentenced, playerId);
    expect(record.cases[0]!.status).toMatch(/^Ended in a guilty plea on /);
    expect(record.sentences).toHaveLength(1);
    const [term] = record.sentences;
    expect(term!.term).toMatch(/^\d+ months (in jail|of probation), from /);
    expect(term!.requests).toEqual([]);

    // The tab offers a request exactly when the action would take one.
    const asked = fileClemencyPetition(sentenced, {
      personId: playerId,
      sentencedEventId: term!.sentencedEventId,
    });
    expect(term!.canAskForClemency).toBe(asked.ok);
    expect(term!.whyNoRequest).toBe(asked.ok ? null : asked.reason);
    if (asked.ok) {
      const [after] = projectLegalRecord(asked.world, playerId).sentences;
      expect(after!.requests).toHaveLength(1);
      expect(after!.requests[0]).toMatchObject({
        petitionId: asked.petitionId,
        status: "open",
      });
      expect(after!.canAskForClemency).toBe(false);
      expect(after!.whyNoRequest).toBe(
        "A request on this sentence is already waiting.",
      );
    }
  }, 600_000);
});
