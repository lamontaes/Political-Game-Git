import { describe, expect, it, vi } from "vitest";
import { appendFileSync } from "node:fs";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { addDays } from "../dates";
import { isLawEffectStamp } from "../law-effect-stamp";
import type { LawEffectStampedRecord } from "../law-effect-stamp";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import { SeededRng, pickDistinct } from "../rng";
import { serializeWorld, deserializeWorld } from "../serialization";
import { PRETRIAL_HELD_EVENT, PRETRIAL_RELEASED_EVENT } from "./jail-terms";
import { pretrialGoverningLawAt } from "./pretrial";
import {
  advanceProsecutions,
  referForProsecution,
  UNRESEARCHED_PROSECUTION,
} from "./prosecution";

const { consequenceCalls } = vi.hoisted(() => ({ consequenceCalls: vi.fn() }));
vi.mock("../enacted-law-effects", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  applyLawConsequences: consequenceCalls.mockImplementation((world) => world),
}));

describe("saved pretrial law attribution", () => {
  const baseSeed = "team9-pretrial-stamp-20260930-five";
  const rng = new SeededRng(baseSeed);
  const states = pickDistinct(rng, lifePlaceStateIdentities(), 5);
  it.each(states)(
    "attributes a saved consequence after real world reload ($jurisdictionKey)",
    (state) => {
      const seed = `${baseSeed}:${state.jurisdictionKey}`;
      const towns = searchLifePlaces("", 5000, {
        stateJurisdictionKey: state.jurisdictionKey,
        scope: "locality",
      });
      const place = towns.length
        ? rng.pick(towns)
        : searchLifePlaces("", 5, {
            stateJurisdictionKey: state.jurisdictionKey,
            scope: "state",
          })[0]!;
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
      // An authored historical referral is due today. Keep canonical time
      // untouched: this focused writer fixture does not advance every other
      // person's life for sixty days or skip their scheduled transitions.
      const world = {
        ...referral.world,
        history: {
          ...referral.world.history,
          events: referral.world.history.events.map((event) =>
            event.id === referral.referralId
              ? {
                  ...event,
                  occurredAt: addDays(
                    referral.world.currentDate,
                    -UNRESEARCHED_PROSECUTION.chargeDecisionDays,
                  ),
                }
              : event,
          ),
        },
      };
      const law = pretrialGoverningLawAt(world, jurisdictionId);
      expect(law).not.toBeNull();
      consequenceCalls.mockClear();
      const after = advanceProsecutions(world);
      const events = after.history.events.filter(
        (event) =>
          (event.type === PRETRIAL_HELD_EVENT ||
            event.type === PRETRIAL_RELEASED_EVENT) &&
          event.involvedEntityIds.includes(subjectId),
      );
      expect(events).toHaveLength(1);
      const call = consequenceCalls.mock.calls.find(
        ([, context]) => context.activityId === events[0]!.id,
      );
      expect(call).toBeDefined();
      expect(call![1]).toEqual({
        onDate: events[0]!.occurredAt,
        activity: "case-stage",
        activityId: events[0]!.id,
        subjectIds: [subjectId],
      });
      expect(call![0].history.events.at(-1).lawEffectStamps).toHaveLength(1);
      const reloaded = deserializeWorld(serializeWorld(after));
      const saved = reloaded.history.events.find(
        (event) => event.id === events[0]!.id,
      )! as LawEffectStampedRecord;
      expect(saved.lawEffectStamps).toHaveLength(1);
      const stamp = saved.lawEffectStamps![0]!;
      expect(isLawEffectStamp(stamp)).toBe(true);
      expect(stamp.governingLawKey).toBe(law!.measureId);
      expect(stamp.questionKey).toBe(
        "us-policy-positions:justice-public-safety.end-cash-bail",
      );
      expect(stamp.jurisdictionId).toBe(jurisdictionId);
      expect(stamp.sourceRecordIds).toContain(referral.referralId);
      expect(stamp.sourceRecordIds).toContain(events[0]!.id);
      const receipt = JSON.stringify({
        seed,
        place: place.key,
        personId: subjectId,
        consequence: events[0]!.summary,
        lawKey: stamp.governingLawKey,
        stampedConsequences: events.length,
        jurisdiction: state.jurisdictionKey,
        reloadedStampValid: true,
      });
      if (process.env.TEAM9_PRETRIAL_RECEIPT)
        appendFileSync(process.env.TEAM9_PRETRIAL_RECEIPT, `${receipt}\n`);
      consequenceCalls.mockClear();
      const repeated = advanceProsecutions(reloaded);
      expect(repeated.history.events).toEqual(after.history.events);
      expect(consequenceCalls).not.toHaveBeenCalled();
    },
  );
});
