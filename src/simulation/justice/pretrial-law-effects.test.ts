import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { observerPlace } from "../../presentation/observer-world";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { addDays } from "../dates";
import { isLawEffectStamp } from "../law-effect-stamp";
import type { LawEffectStampedRecord } from "../law-effect-stamp";
import { PRETRIAL_HELD_EVENT, PRETRIAL_RELEASED_EVENT } from "./jail-terms";
import { pretrialGoverningLawAt } from "./pretrial";
import {
  advanceProsecutions,
  referForProsecution,
  UNRESEARCHED_PROSECUTION,
} from "./prosecution";

describe("saved pretrial law attribution", () => {
  it("attributes the actual defendant consequence and preserves it in serialized history", () => {
    const seed = "team9-pretrial-stamp-20260930";
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
    const subjectId = game.playerPersonId;
    const jurisdictionId = game.world.people[subjectId]!.homeJurisdictionId;
    const referral = referForProsecution(game.world, {
      stableKey: "team9-stamp-case",
      subjectPersonId: subjectId,
      jurisdictionId,
      offenseKey: "crime:robbery",
      referredBy: { kind: "police", label: "police", personId: null },
      basisEventIds: [],
      evidence: "testimony",
      standingFindings: 0,
    });
    const world = {
      ...referral.world,
      currentDate: addDays(
        referral.world.currentDate,
        UNRESEARCHED_PROSECUTION.chargeDecisionDays,
      ),
    };
    const law = pretrialGoverningLawAt(world, jurisdictionId);
    expect(law).not.toBeNull();
    const after = advanceProsecutions(world);
    const events = after.history.events.filter(
      (event) =>
        (event.type === PRETRIAL_HELD_EVENT ||
          event.type === PRETRIAL_RELEASED_EVENT) &&
        event.involvedEntityIds.includes(subjectId),
    );
    expect(events).toHaveLength(1);
    const saved = JSON.parse(
      JSON.stringify(events[0]),
    ) as LawEffectStampedRecord;
    expect(saved.lawEffectStamps).toHaveLength(1);
    const stamp = saved.lawEffectStamps![0]!;
    expect(isLawEffectStamp(stamp)).toBe(true);
    expect(stamp.governingLawKey).toBe(law!.measureId);
    expect(stamp.jurisdictionId).toBe(jurisdictionId);
    expect(stamp.sourceRecordIds).toContain(referral.referralId);
    expect(stamp.sourceRecordIds).toContain(events[0]!.id);
    console.log(
      JSON.stringify({
        seed,
        place: place.key,
        personId: subjectId,
        consequence: events[0]!.summary,
        lawKey: stamp.governingLawKey,
        stampedConsequences: events.length,
      }),
    );
    const repeated = advanceProsecutions(after);
    expect(repeated.history.events).toEqual(after.history.events);
  });
});
