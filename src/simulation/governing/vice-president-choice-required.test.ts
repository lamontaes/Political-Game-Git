import { beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { currentPresidentOf } from "../crisis/offices";
import { simulationMomentOnLocalDate } from "../dates";
import { currentFederalTenure } from "../federal-tenures";
import {
  cancelFutureDueItem,
  createFutureTransitionHandlerRegistry,
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import { stableHash } from "../ids";
import { lifePlaceStateIdentities, searchLifePlaces } from "../life-places";
import * as appointments from "../patronage/appointments";
import { personName } from "../people";
import { currentHistoricalCutoff } from "../queries";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { FutureDueItem, World } from "../types";
import { recordPersonDeath } from "../vitality";
import {
  applyOfficeContinuityNotices,
  vicePresidentNominationHandler,
  VICE_PRESIDENT_CONFIRMATION,
  VICE_PRESIDENT_NOMINATED_EVENT,
  VICE_PRESIDENT_NOMINATION,
} from "./office-continuity";

const seed = "A96-vp-choice-required";
// A fixture chooses a real starting place; this does not choose a nominee.
const state = new SeededRng(seed).pick(lifePlaceStateIdentities());
const place = searchLifePlaces("", 1, {
  stateJurisdictionKey: state.jurisdictionKey,
})[0]!;

function vacancy() {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  const vice = currentFederalTenure(game.world, "us-vice-president")!;
  const dead = recordPersonDeath(game.world, {
    stableKey: "a96:supplied-vp-death",
    personId: vice.personId,
    diedAt: game.world.currentDate,
    causeKey: "cause:external-fixture",
    sourceEntityIds: [game.world.id],
    summary: "The Vice President died in this supplied vacancy fixture.",
    provenance: {
      kind: "authored",
      note: "A96 controlled vacancy; no mortality outcome was simulated.",
    },
  });
  const death = dead.history.personDeaths.at(-1)!;
  let world = applyOfficeContinuityNotices(dead, [
    {
      noticeKey: `crisis:continuity:${death.id}`,
      sequence: death.sequence,
      originEventId: death.eventId,
      sourceRecordId: death.id,
      personId: vice.personId,
      kind: "death",
      effectiveDate: death.diedAt,
      recordedDate: dead.currentDate,
      visibility: "public",
      offices: [
        {
          officeKey: "us-vice-president",
          title: "Vice President of the United States",
          organizationId: null,
          termEvidenceId: vice.event.id,
        },
      ],
    },
  ]);
  const due = world.history.futureDueItems.find(
    (item) => item.transitionKey === VICE_PRESIDENT_NOMINATION,
  )!;
  expect(due).toBeDefined();
  // Isolate one actual due boundary with explicit cancellation records.
  for (const item of world.history.futureDueItems) {
    if (
      item.id === due.id ||
      item.dueAt > due.dueAt ||
      futureDueItemStateAt(world, item.id, currentHistoricalCutoff(world))
        ?.status !== "scheduled"
    )
      continue;
    world = cancelFutureDueItem(world, {
      stableKey: `a96:isolate:${item.id}`,
      dueItemId: item.id,
      effectiveAt: world.currentDate,
      reasonKey: "civic:fixture-isolation",
      context:
        "Scoped Vice-President nomination callback; other due families are canceled, not silently skipped.",
    });
  }
  world = {
    ...world,
    currentDate: due.dueAt,
    currentMoment: simulationMomentOnLocalDate(world.currentMoment, due.dueAt),
  };
  return { world, due };
}

describe("A96 requires the President's choice before nominating", () => {
  let world: World;
  let due: FutureDueItem;
  beforeAll(() => {
    ({ world, due } = vacancy());
  });

  it("does not choose for a player President", () => {
    const president = currentPresidentOf(world)!;
    const controlled: World = {
      ...world,
      control: { kind: "person", personId: president.personId },
    };
    const result = vicePresidentNominationHandler(controlled, due);
    console.info(
      "A96 empty-choice receipt",
      JSON.stringify({
        seed,
        place: place.displayName,
        state: state.jurisdictionKey,
        president: personName(world.people[president.personId]!),
        presidentId: president.personId,
        date: world.currentDate,
        status: result.status,
        nominations: result.world.history.events.filter(
          (event) => event.type === VICE_PRESIDENT_NOMINATED_EVENT,
        ).length,
      }),
    );
    expect(result.status).toBe("blocked");
    expect(result.world === controlled).toBe(true);
    expect(currentFederalTenure(result.world, "us-vice-president")).toBeNull();
    expect(
      result.world.history.events.some(
        (event) => event.type === VICE_PRESIDENT_NOMINATED_EVENT,
      ),
    ).toBe(false);
    expect(
      result.world.history.futureDueItems.some(
        (item) => item.transitionKey === VICE_PRESIDENT_CONFIRMATION,
      ),
    ).toBe(false);
    expect(vicePresidentNominationHandler(controlled, due).world).toBe(
      controlled,
    );
    const restored = deserializeWorld(serializeWorld(controlled));
    expect(vicePresidentNominationHandler(restored, due).world).toBe(restored);
  });

  it("keeps an empty NPC choice vacant without a substitute", () => {
    const spy = vi.spyOn(appointments, "chooseAppointee").mockReturnValue(null);
    try {
      const result = vicePresidentNominationHandler(world, due);
      expect(spy).toHaveBeenCalledOnce();
      expect(result.status).toBe("blocked");
      expect(result.world === world).toBe(true);
      expect(
        currentFederalTenure(result.world, "us-vice-president"),
      ).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });

  it("saves the blocked due receipt once and preserves it through Continue", () => {
    const president = currentPresidentOf(world)!;
    const controlled: World = {
      ...world,
      control: { kind: "person", personId: president.personId },
    };
    const registry = createFutureTransitionHandlerRegistry([
      [VICE_PRESIDENT_NOMINATION, vicePresidentNominationHandler],
    ]);
    const saved = resolveFutureDueItemsThrough(controlled, due.dueAt, registry);
    const state = futureDueItemStateAt(
      saved,
      due.id,
      currentHistoricalCutoff(saved),
    );
    expect(state?.status).toBe("blocked");
    expect(state?.reasonKey).toBe("government:vice-president-no-nominee");
    expect(state?.outcomeEventId).toBeNull();
    expect(currentFederalTenure(saved, "us-vice-president")).toBeNull();
    expect(saved.history.events).toBe(controlled.history.events);
    expect(saved.history.futureDueItems).toBe(
      controlled.history.futureDueItems,
    );
    expect(saved.history.futureDueItemStates.length).toBe(
      controlled.history.futureDueItemStates.length + 1,
    );
    const continued = deserializeWorld(serializeWorld(saved));
    expect(resolveFutureDueItemsThrough(continued, due.dueAt, registry)).toBe(
      continued,
    );
    expect(
      futureDueItemStateAt(
        continued,
        due.id,
        currentHistoricalCutoff(continued),
      ),
    ).toEqual(state);
  });

  it("preserves the actual selected nominee and nomination records", () => {
    const actual = appointments.chooseAppointee;
    const selections: appointments.AppointeeChoice[] = [];
    const spy = vi
      .spyOn(appointments, "chooseAppointee")
      .mockImplementation((inputWorld, input) => {
        const selected = actual(inputWorld, input);
        if (selected) selections.push(selected);
        return selected;
      });
    try {
      const result = vicePresidentNominationHandler(world, due);
      const selected = selections[0];
      if (!selected)
        throw new Error(
          "The saved nominee test needs an actual appointment choice.",
        );
      const nomineeId = selected.personId;
      const nomination = result.world.history.events.find(
        (event) => event.type === VICE_PRESIDENT_NOMINATED_EVENT,
      )!;
      expect(
        nomination.participants.find(
          (participant) => participant.role === "focus:subject",
        )?.personId,
      ).toBe(nomineeId);
      expect(
        result.world.history.futureDueItems.some(
          (item) => item.transitionKey === VICE_PRESIDENT_CONFIRMATION,
        ),
      ).toBe(true);
      console.info(
        "A96 selected-choice receipt",
        JSON.stringify({
          nomineeId,
          nominee: personName(result.world.people[nomineeId]!),
          nominationId: nomination.id,
          worldHash: stableHash(serializeWorld(result.world)),
        }),
      );
      expect(
        currentFederalTenure(result.world, "us-vice-president"),
      ).toBeNull();
    } finally {
      spy.mockRestore();
    }
  });
});
