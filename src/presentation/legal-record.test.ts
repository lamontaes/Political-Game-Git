import { describe, expect, it } from "vitest";

import { fileClemencyPetition } from "../simulation/justice/clemency";
import {
  enterPlea,
  referForProsecution,
  PROSECUTION_TIMING_PROFILE,
} from "../simulation/justice/prosecution";
import { prosecutionTimingFor } from "../simulation/justice/prosecution-timing";
import { smallWorld } from "../../tests/fixtures/small-world";
import { composeWorldTimeHandlers } from "../simulation/campaigns";
import { addDays } from "../simulation/dates";
import { resolveFutureDueItemsThrough } from "../simulation/future-transitions";
import type { World } from "../simulation/types";
import { projectLegalRecord } from "./legal-record";
import { observerPlace } from "./observer-world";

/**
 * The Legal tab's record follows the player's own case from the charge to
 * the sentence and a clemency request, and offers only the steps the actions
 * themselves allow. The place is drawn from all 56 by the seed.
 */
describe("the player's legal record", () => {
  const seed = "legal-record-1";
  const place = observerPlace(seed);
  // A small world (tests/fixtures/small-world.ts) with its governor seated,
  // advanced only to each case's due date: no opening life, no daily run.
  const small = smallWorld({ place: place.key, seed, offices: ["governor"] });
  const playerId = small.personId;
  const opened = small.world;
  const passDays = (world: World, days: number): World =>
    resolveFutureDueItemsThrough(
      world,
      addDays(world.currentDate, days),
      composeWorldTimeHandlers(),
    );
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
    const charged = passDays(
      referred.world,
      PROSECUTION_TIMING_PROFILE.chargeDecisionDays + 14,
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

    const sentenced = passDays(
      entered.world,
      prosecutionTimingFor(place.stateJurisdictionKey).resolveAfterDays + 14,
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
  });
});
