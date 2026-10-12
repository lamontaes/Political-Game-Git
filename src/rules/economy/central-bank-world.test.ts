import { recordWorldEvent } from "../../simulation/world";
import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  makeIsoDate,
  simulationMomentOnLocalDate,
} from "../../simulation/dates";
import {
  ensureWorldStartingConditions,
  macroStartingConditions,
} from "../../simulation/world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../simulation/world-setup/types";
import {
  ensureMacroEconomyStarted,
  macroStartForHistory,
} from "../../simulation/macro-economy/producer";
import * as native from "../../simulation/macro-economy/central-bank";
import { personTrait } from "../../simulation/people-traits";
import { personName } from "../../simulation/people";
import { evaluateDecision } from "../../simulation/decisions";
import { rateConsiderations as nativeConsiderations } from "../../simulation/macro-economy/rate-choice";
import { rateConsiderations } from "./macro-rate-choice";
import {
  openingCentralBankTerms,
  votingReserveBanks,
  centralBankReadings,
  prepareReserveBankSuccession,
  resumeReserveBankSuccession,
  prepareCentralBankMeeting,
  rateChoiceFromEvaluation,
  resolveCentralBankMeeting,
  completedCentralBankMeeting,
  type CentralBankFacts,
  type RateChoice,
} from "./central-bank";
import type { World, EntityId } from "../../simulation/types";
import type { MacroReleaseRecord } from "../../simulation/macro-economy/types";
function facts(world: World): CentralBankFacts {
  return {
    onDate: world.currentDate,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    worldId: world.id,
    bank: world.macroEconomy?.centralBank ?? null,
    store: world.macroEconomy ?? null,
    events: world.history.events,
    deaths: world.history.personDeaths,
    people: world.people,
    names: new Map(
      world.personOrder.map((id) => [id, personName(world.people[id]!)]),
    ),
    traits: new Map(
      world.personOrder.map((id) => [
        id,
        {
          risk: personTrait(world, id, "risk").value,
          deliberation: personTrait(world, id, "deliberation").value,
        },
      ]),
    ),
    controlledPersonId:
      world.control.kind === "person" ? world.control.personId : null,
  };
}
function compareMeeting(world: World, month: string) {
  const raw = facts(world),
    prepared = prepareCentralBankMeeting(raw, month)!;
  expect(prepared).not.toBeNull();
  const choices = new Map<EntityId, RateChoice>();
  for (const request of prepared.requests) {
    const seat = prepared.members.find((s) => s.personId === request.personId)!;
    const view = {
      inflationLean: seat.inflationLean,
      ...raw.traits.get(seat.personId)!,
    };
    expect(request.rows).toEqual(nativeConsiderations(view, prepared.readings));
    expect(rateConsiderations(view, prepared.readings)).toEqual(
      nativeConsiderations(view, prepared.readings),
    );
    choices.set(
      request.personId,
      rateChoiceFromEvaluation(
        request,
        evaluateDecision(world, request.input).selectedOptionKey,
      ),
    );
  }
  const plan = resolveCentralBankMeeting(raw, prepared, choices),
    observed = native.holdCentralBankMeeting(world, month);
  const event = observed.history.events.find(
    (e) => e.stableKey === plan.event.stableKey,
  )!;
  expect(event).toBeDefined();
  const written = recordWorldEvent(world, plan.event).history.events.at(-1)!;
  expect(event).toEqual(written);
  expect(completedCentralBankMeeting(raw, plan, event.id)).toEqual(
    observed.macroEconomy!.centralBank,
  );
  expect(prepareCentralBankMeeting(facts(observed), month)).toBeNull();
}
describe("economy: central-bank calendar, succession and public meeting owner", () => {
  it.each(Object.keys(STATES))(
    "matches native public records and labeled controls in %s",
    (usps) => {
      const base = smallWorld({
        place: `US-${usps}`,
        date: "2026-01-01",
        seed: `rules2:central-bank:${usps}`,
      });
      const conditioned = ensureWorldStartingConditions(base.world, {
        openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      });
      let world = ensureMacroEconomyStarted(
        conditioned,
        macroStartForHistory(macroStartingConditions(conditioned)),
      );
      world = native.ensureReserveBankPresidents(
        native.ensureCentralBankSeated(world, {
          lowerPct: 3.5,
          upperPct: 3.75,
          basis: "retained-reference",
          decisionEventId: null,
        }),
      );
      const bank = world.macroEconomy!.centralBank!;
      expect(openingCentralBankTerms(world.currentDate)).toEqual(
        bank.seats.map((s, seat) => ({ seat, termEnds: s!.termEnds })),
      );
      for (const year of [1900, 2025, 2026, 2031, 2100])
        expect(votingReserveBanks(year)).toEqual(
          native.votingReserveBanks(year),
        );
      const raw = facts(world);
      expect(
        centralBankReadings(raw, world.macroEconomy!, 3.625, null),
      ).toEqual(
        native.centralBankReadings(world, world.macroEconomy!, 3.625, null),
      );
      // Explicit saved public-release counts around the native 60/240 normal-rate window. No ordinary twenty-year run claim.
      for (const count of [0, 59, 60, 240, 241]) {
        const releases = Array.from({ length: count }, (_, i) => ({
          key: "fixture:released:" + i,
          indicator: "unemployment-rate",
          scope: "national",
          referencePeriodStart: makeIsoDate("2025-01-01"),
          referencePeriodEnd: makeIsoDate("2025-01-31"),
          releasedAt: makeIsoDate("2025-02-01"),
          value: 4 + (i % 7) / 10,
          inputMonthKeys: [],
        })) as unknown as MacroReleaseRecord[];
        const store = { ...world.macroEconomy!, releases };
        expect(centralBankReadings(raw, store, 3.625, null)).toEqual(
          native.centralBankReadings(world, store, 3.625, null),
        );
      }
      compareMeeting(world, "2026-01");
      for (const option of ["hold", "raise-half", "cut-quarter"] as const) {
        const controlled = {
          ...world,
          control: { kind: "person" as const, personId: bank.chair!.personId },
        };
        const selected = native.chooseCentralBankRate(controlled, option);
        compareMeeting(selected, "2026-01");
      }
      const oldest = bank.presidents![0]!;
      // Read-only saved age/term-date control, not an ordinary death/retirement event.
      for (const date of ["2026-02-27", "2026-02-28", "2026-06-01"]) {
        const onDate = makeIsoDate(date);
        const saved = {
          ...world,
          currentDate: onDate,
          currentMoment: simulationMomentOnLocalDate(
            world.currentMoment,
            onDate,
          ),
          people: {
            ...world.people,
            [oldest.personId]: {
              ...world.people[oldest.personId]!,
              birthDate: makeIsoDate("1940-01-01"),
            },
          },
        };
        const prepared = prepareReserveBankSuccession(facts(saved))!;
        const observed = native.stepCentralBankSeats(saved),
          actual = observed.macroEconomy!.centralBank!;
        const replacements = prepared.requests.map(
          (r) => actual.presidents![r.seat]!,
        );
        const patch = resumeReserveBankSuccession(prepared, replacements);
        expect(patch ? { ...bank, ...patch } : bank).toEqual(actual);
        for (const request of prepared.requests)
          expect(
            observed.history.events.some(
              (e) => e.stableKey === request.stableKey + ":appointed",
            ),
          ).toBe(true);
      }
    },
  );
});
