import {
  applySavedLegalOutcome,
  legalOutcomeRegistration,
} from "./legal-outcome";
import type {
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../law-consequence-types";
import { describe, expect, it } from "vitest";
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
import {
  PRETRIAL_HELD_EVENT,
  PRETRIAL_RELEASED_EVENT,
} from "../justice/jail-terms";
import { pretrialGoverningLawAt } from "../justice/pretrial";
import {
  advanceProsecutions,
  referForProsecution,
  UNRESEARCHED_PROSECUTION,
} from "../justice/prosecution";

describe("shared legal outcome adapter", () => {
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
        evidence: "documentary",
        standingFindings: 6,
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
      const after = advanceProsecutions(world);
      const events = after.history.events.filter(
        (event) =>
          (event.type === PRETRIAL_HELD_EVENT ||
            event.type === PRETRIAL_RELEASED_EVENT) &&
          event.involvedEntityIds.includes(subjectId),
      );
      expect(events).toHaveLength(1);
      const row: LawConsequenceRow = {
        id: "team9:actual-saved-legal-determination",
        kind: "legal-outcome",
        when: "assessment",
        who: { selector: "legal-outcome.saved-defendant", predicates: [] },
        what: "attribute-saved-legal-outcome",
        decision: {
          op: "record",
          key: "legal-outcome.saved-decision",
          type: "decision",
        },
        conditions: [
          {
            capability: "legal-outcome.governing-question",
            parameters: {
              questionKey:
                "us-policy-positions:justice-public-safety.end-cash-bail",
            },
          },
        ],
        lag: { days: 0, sourceIds: ["existing-justice-writer"] },
        onRepeal: "preserve-completed",
        evidence: {
          sourceIds: ["existing-justice-writer"],
          population: "actual defendant",
          scope: "saved determination",
          why: "court applies operative law",
          uncertainty: "attribution proof only",
        },
      };
      const unstamped = {
        ...after,
        history: {
          ...after.history,
          events: after.history.events.map((event) =>
            event.id === events[0]!.id
              ? { ...event, lawEffectStamps: [] }
              : event,
          ),
        },
      };
      const resolved: ResolvedLawConsequence = {
        row,
        law: law!,
        questionKey: "us-policy-positions:justice-public-safety.end-cash-bail",
        jurisdictionId,
        subject: { kind: "person", id: subjectId },
        activityId: events[0]!.id,
        effectiveAt: after.currentDate,
        sourceRecordIds: [referral.referralId, events[0]!.id],
        value: { type: "decision", value: events[0]!.type },
      };
      const applied = applySavedLegalOutcome(unstamped, resolved);
      expect(applied).not.toBe(unstamped);
      expect(applied.history.events).toHaveLength(after.history.events.length);
      expect(applied.history.events.at(-1)!.summary).toBe(
        after.history.events.at(-1)!.summary,
      );
      const reloaded = deserializeWorld(serializeWorld(applied));
      expect(applySavedLegalOutcome(reloaded, resolved)).toBe(reloaded);
      expect(
        applySavedLegalOutcome(reloaded, {
          ...resolved,
          law: { ...law!, answer: law!.answer === "yes" ? "no" : "yes" },
        }),
      ).toBe(reloaded);
      expect(
        legalOutcomeRegistration.resolve(reloaded, row, {
          onDate: reloaded.currentDate,
          activity: "assessment",
          activityId: resolved.activityId,
          subjectIds: [subjectId],
        }),
      ).toHaveLength(1);
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
      const repeated = advanceProsecutions(reloaded);
      expect(repeated.history.events).toEqual(applied.history.events);
      const trialReady = {
        ...reloaded,
        history: {
          ...reloaded.history,
          events: reloaded.history.events.map((event) =>
            event.id === referral.referralId
              ? {
                  ...event,
                  occurredAt: addDays(
                    reloaded.currentDate,
                    -UNRESEARCHED_PROSECUTION.chargeDecisionDays -
                      UNRESEARCHED_PROSECUTION.resolveAfterDays,
                  ),
                }
              : event.type === "justice.charged" &&
                  event.involvedEntityIds.includes(subjectId)
                ? {
                    ...event,
                    occurredAt: addDays(
                      reloaded.currentDate,
                      -UNRESEARCHED_PROSECUTION.resolveAfterDays,
                    ),
                  }
                : event,
          ),
        },
      };
      const sentenced = advanceProsecutions(trialReady);
      const sentence = sentenced.history.events.find(
        (event) =>
          event.type === PROSECUTION_SENTENCED_EVENT &&
          event.involvedEntityIds.includes(subjectId),
      );
      expect(
        sentence,
        JSON.stringify(
          sentenced.history.events.slice(-4).map((event) => event.summary),
        ),
      ).toBeDefined();
      const minimumStamp = (
        sentence as LawEffectStampedRecord
      ).lawEffectStamps?.find(
        (stamp) =>
          stamp.questionKey ===
          "us-policy-positions:justice-public-safety.mandatory-minimum-sentences",
      );
      expect(minimumStamp).toBeDefined();
      const sentenceReload = deserializeWorld(serializeWorld(sentenced));
      expect(
        (
          sentenceReload.history.events.find(
            (event) => event.id === sentence!.id,
          ) as LawEffectStampedRecord
        ).lawEffectStamps,
      ).toEqual((sentence as LawEffectStampedRecord).lawEffectStamps);
      expect(advanceProsecutions(sentenceReload).history.events).toEqual(
        sentenceReload.history.events,
      );
    },
  );
});
