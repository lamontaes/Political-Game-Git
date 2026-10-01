import { beforeAll, describe, expect, it, vi } from "vitest";
import type * as LawEffectsModule from "../../src/simulation/enacted-law-effects";
import type * as ProsecutionTransitionsModule from "../../src/simulation/justice/prosecution-transitions";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { openSavedPlayedLife } from "../../src/presentation/open-saved-played-life";
import { addDays } from "../../src/simulation/dates";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../../src/simulation/life-places";
import { SeededRng, pickDistinct } from "../../src/simulation/rng";
import {
  serializeWorld,
  deserializeWorld,
} from "../../src/simulation/serialization";
import { personName } from "../../src/simulation/people";
import {
  observeFromOpening,
  retireControlledCharacter,
} from "../../src/simulation/people-continuation";
import { assertWorldIntegrityFully } from "../../src/simulation/world";
import {
  sentencingJudge,
  type CourtCase,
} from "../../src/simulation/justice/court-reasoning";
import {
  advanceProsecutions,
  referForProsecution,
  PROSECUTION_CHARGED_EVENT,
  PROSECUTION_ENDED_EVENT,
  PROSECUTION_SENTENCED_EVENT,
  PROSECUTION_MISTRIAL_EVENT,
  UNRESEARCHED_PROSECUTION,
} from "../../src/simulation/justice/prosecution";
import type { World } from "../../src/simulation/types";

// Actual implementations run unchanged; these wrappers only observe boundaries.
const trace = vi.hoisted(() => ({
  order: [] as string[],
  laws: [] as { input: World; output: World }[],
  recovery: [] as { input: World; output: World }[],
}));
vi.mock("../../src/simulation/enacted-law-effects", async (importOriginal) => {
  const original = await importOriginal<typeof LawEffectsModule>();
  return {
    ...original,
    applyStartingLawConsequences(world: World) {
      trace.order.push("starting-laws:entry");
      const output = original.applyStartingLawConsequences(world);
      trace.laws.push({ input: world, output });
      trace.order.push("starting-laws:exit");
      return output;
    },
  };
});
vi.mock(
  "../../src/simulation/justice/prosecution-transitions",
  async (importOriginal) => {
    const original =
      await importOriginal<typeof ProsecutionTransitionsModule>();
    return {
      ...original,
      recoverOverdueProsecutions(world: World) {
        trace.order.push("recovery:entry");
        const output = original.recoverOverdueProsecutions(world);
        trace.recovery.push({ input: world, output });
        trace.order.push("recovery:exit");
        return output;
      },
    };
  },
);

// Subset of 6a716cb6702fb563a0b626c1d90d064cbd86a3f1:
// src/simulation/justice/no-judge-pending.test.ts:56–151; vacancy omitted.
function preparedCase(
  state: ReturnType<typeof lifePlaceStateIdentities>[number],
) {
  const place =
    searchLifePlaces("", 5000, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    })[0] ??
    searchLifePlaces("", 5, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "state",
    })[0]!;
  const caseSeed = `team9-g13-no-judge:${state.jurisdictionKey}`;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: caseSeed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const personId = game.playerPersonId;
  const venue = game.world.people[personId]!.homeJurisdictionId;
  const referred = referForProsecution(game.world, {
    stableKey: "g13-pending-fixture",
    subjectPersonId: personId,
    jurisdictionId: venue,
    offenseKey: "crime:robbery",
    referredBy: { kind: "police", label: "police", personId: null },
    basisEventIds: [],
    evidence: "documentary",
    standingFindings: 6,
  });
  // AUTHORED CONTROLLED STALE-SAVE FIXTURE from the published producer test.
  // Historical event dates are authored inputs, not a canonical 180-day
  // advance or proof that native scheduling naturally strands this case.
  const due: World = {
    ...referred.world,
    history: {
      ...referred.world.history,
      events: referred.world.history.events.map((event) =>
        event.id === referred.referralId
          ? { ...event, occurredAt: addDays(game.world.currentDate, -200) }
          : event,
      ),
    },
  };
  const charged = advanceProsecutions(due);
  expect(
    charged.history.events.some(
      (event) =>
        event.type === PROSECUTION_CHARGED_EVENT &&
        event.involvedEntityIds.includes(personId),
    ),
  ).toBe(true);
  const trialDue: World = {
    ...charged,
    history: {
      ...charged.history,
      events: charged.history.events.map((event) =>
        event.type === PROSECUTION_CHARGED_EVENT &&
        event.involvedEntityIds.includes(personId)
          ? {
              ...event,
              occurredAt: addDays(
                charged.currentDate,
                -UNRESEARCHED_PROSECUTION.resolveAfterDays,
              ),
            }
          : event,
      ),
    },
  };
  const referral = trialDue.history.events.find(
    (event) => event.id === referred.referralId,
  )!;
  const courtCase: CourtCase = {
    caseKey: referral.stableKey,
    defendantId: personId,
    offenseKey: "crime:robbery",
    offenseLabel: "robbery",
    evidence: "documentary",
    standingFindings: 6,
    venueJurisdictionId: venue,
    stateKey: state.jurisdictionKey,
  };
  expect(sentencingJudge(trialDue, courtCase, 0)).not.toBeNull();
  const judgments = (world: World) =>
    world.history.events.filter(
      (event) =>
        [
          PROSECUTION_ENDED_EVENT,
          PROSECUTION_SENTENCED_EVENT,
          PROSECUTION_MISTRIAL_EVENT,
        ].includes(event.type) && event.involvedEntityIds.includes(personId),
    );
  return {
    place,
    caseSeed,
    personId,
    openingWorld: game.world,
    trialDue,
    referral,
    courtCase,
    judgments,
  };
}

describe.sequential(
  "prosecution recovery at actual opening and played-save boundaries",
  () => {
    const state = pickDistinct(
      new SeededRng("team9-g10-floor-five-20260930"),
      lifePlaceStateIdentities(),
      1,
    )[0]!;
    let fixture: ReturnType<typeof preparedCase>;
    let openingTrace: typeof trace;
    beforeAll(() => {
      fixture = preparedCase(state);
      openingTrace = {
        order: [...trace.order],
        laws: [...trace.laws],
        recovery: [...trace.recovery],
      };
    });

    it("fresh full opening recovers once after actual starting laws without advancing time", () => {
      expect(openingTrace.laws).toHaveLength(1);
      expect(openingTrace.recovery).toHaveLength(1);
      expect(openingTrace.order).toEqual([
        "starting-laws:entry",
        "starting-laws:exit",
        "recovery:entry",
        "recovery:exit",
      ]);
      const laws = openingTrace.laws[0]!;
      const recovery = openingTrace.recovery[0]!;
      expect(recovery.input).toBe(laws.output);
      expect(recovery.output).toBe(fixture.openingWorld);
      expect(recovery.input.currentDate).toBe(laws.input.currentDate);
      expect(recovery.output.currentDate).toBe(laws.input.currentDate);
      expect(recovery.output.currentMoment).toEqual(laws.input.currentMoment);
      assertWorldIntegrityFully(recovery.output);
    });

    it("played SaveContinue recovers the authored stale case and preserves its original dates", () => {
      const {
        trialDue,
        personId,
        referral,
        courtCase,
        judgments,
        place,
        caseSeed,
      } = fixture;
      expect(judgments(trialDue)).toHaveLength(0);
      const actualJudge = sentencingJudge(trialDue, courtCase, 0);
      expect(actualJudge).not.toBeNull();
      const originalStages = trialDue.history.events.filter(
        (event) =>
          event.id === referral.id ||
          (event.type === PROSECUTION_CHARGED_EVENT &&
            event.involvedEntityIds.includes(personId)),
      );
      expect(originalStages).toHaveLength(2);
      const saved = serializeWorld(trialDue);
      const loaded = deserializeWorld(saved);
      assertWorldIntegrityFully(loaded);
      const recovered = openSavedPlayedLife(loaded, personId);
      assertWorldIntegrityFully(recovered);
      expect(recovered.currentDate).toBe(trialDue.currentDate);
      expect(recovered.currentMoment).toEqual(trialDue.currentMoment);
      expect(judgments(recovered).length).toBeGreaterThan(0);
      for (const stage of originalStages)
        expect(
          recovered.history.events.find((event) => event.id === stage.id),
        ).toEqual(stage);
      for (const judgment of judgments(recovered))
        expect(judgment.occurredAt).toBe(trialDue.currentDate);
      expect(recovered.judiciary!.seatTenures).toEqual(
        trialDue.judiciary!.seatTenures,
      );
      expect(sentencingJudge(recovered, courtCase, 0)).toBe(actualJudge);
      expect(serializeWorld(loaded)).toBe(saved);

      const repeated = openSavedPlayedLife(recovered, personId);
      expect(repeated.history.events).toEqual(recovered.history.events);
      assertWorldIntegrityFully(repeated);
      const continued = deserializeWorld(serializeWorld(recovered));
      const reopened = openSavedPlayedLife(continued, personId);
      assertWorldIntegrityFully(reopened);
      expect(reopened.history.events).toEqual(recovered.history.events);
      for (const stage of originalStages)
        expect(
          reopened.history.events.find((event) => event.id === stage.id),
        ).toEqual(stage);
      expect(reopened.currentDate).toBe(trialDue.currentDate);
      process.stdout.write(
        `${JSON.stringify({
          kind: "prosecution-played-load-boundary",
          seed: caseSeed,
          placeKey: place.key,
          placeName: place.displayName,
          personId,
          personName: personName(reopened.people[personId]!),
          actualJudgeId: actualJudge,
          originalStages,
          recoveredJudgments: judgments(recovered),
          currentDate: reopened.currentDate,
          fixtureMeaning:
            "Authored historical event-date stale save; not a naturally stranded native-clock case or full UI proof.",
        })}\n`,
      );
    });

    it("canonical observer and retired saves remain unchanged without recovery", () => {
      const { trialDue, personId } = fixture;
      // These are real existing control/retirement writers, not edited controls
      // or fabricated death records. Dead-player coverage remains outside scope.
      for (const readOnly of [
        observeFromOpening(trialDue, personId),
        retireControlledCharacter(trialDue, personId),
      ]) {
        const count = trace.recovery.length;
        const saved = serializeWorld(readOnly);
        const loaded = deserializeWorld(saved);
        assertWorldIntegrityFully(loaded);
        expect(openSavedPlayedLife(loaded, personId)).toBe(loaded);
        expect(serializeWorld(loaded)).toBe(saved);
        expect(trace.recovery).toHaveLength(count);
      }
    });
  },
);
