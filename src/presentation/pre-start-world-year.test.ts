import { describe, expect, it } from "vitest";

import { addDays, ageOnDate } from "../simulation/dates";
import { deserializeWorld, serializeWorld, type EntityId } from "../simulation";
import {
  advanceWithWorldIntegrityAtEnd,
  assertWorldIntegrity,
} from "../simulation/world";
import {
  DEFAULT_NEW_GAME_SETUP,
  createNewGameWorld,
  newGameSetupProblems,
  productionWorldInputFor,
} from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { openOrdinaryLife, passOrdinaryDays } from "./ordinary-life";
import { completePreStartWorldYear } from "./pre-start-world-year";
import {
  buildPreStartBackgroundWorld,
  type PreStartProductionWorldInput,
} from "./production-world";

const ordinarySetup = {
  ...DEFAULT_NEW_GAME_SETUP,
  seed: "pre-start-year-ordinary-22",
  startAge: 22,
  birthMonth: 2,
  birthDay: 12,
  givenName: "Avery",
  familyName: "Stone",
  gender: "female" as const,
  preStartYearVersion: "pre-start-world-year-v1" as const,
};

const preStartInput = (): PreStartProductionWorldInput => {
  const input = productionWorldInputFor(ordinarySetup);
  if (!input.preStartYear)
    throw new Error("Missing versioned pre-start dates.");
  return { ...input, preStartYear: input.preStartYear };
};

describe("a versioned pre-start world year", () => {
  it("leaves an absent-version opening on its existing target date", () => {
    const setup = { ...ordinarySetup, preStartYearVersion: undefined };
    const generated = generateOpeningLife(prepareOpeningLife(setup));
    expect(generated.game!.world.currentDate).toBe(
      generated.game!.place.context.initialMoment.date,
    );
  }, 180_000);

  it("runs the world first, then adds the chosen player at Begin", () => {
    expect(() => createNewGameWorld(ordinarySetup)).toThrow(
      "two-phase opening",
    );
    const input = preStartInput();
    const target = input.preStartYear.targetStartDate;
    const prior = input.preStartYear.priorYearStartDate;
    const background = buildPreStartBackgroundWorld(input);
    expect(background.currentDate).toBe(prior);
    expect(background.control.kind).toBe("observer");
    expect(background.personOrder.length).toBeGreaterThan(0);

    const generated = generateOpeningLife(prepareOpeningLife(ordinarySetup));
    const world = generated.game!.world;
    const playerPersonId = generated.game!.playerPersonId;
    expect(world.currentDate).toBe(target);
    expect(world.currentMoment.date).toBe(target);
    expect(world.control).toEqual({ kind: "person", personId: playerPersonId });
    expect(background.people[playerPersonId]).toBeUndefined();
    expect(background.personOrder).not.toContain(playerPersonId);
    const player = world.people[playerPersonId]!;
    expect(ageOnDate(player.birthDate, target)).toBe(22);
    expect(player.birthDate.slice(5)).toBe("02-12");
    expect([player.givenName, player.familyName]).toEqual(["Avery", "Stone"]);
    expect(player.identity?.gender).toBe("female");
    // The finalizer appends retrospective childhood events at Begin. Their
    // historical dates are backstory, not evidence that the earlier clock had
    // this person. The receiver checks its actual pre-finalization World.
    expect(
      background.history.events.every(
        (event) =>
          !event.involvedEntityIds.includes(playerPersonId) &&
          event.participants.every(
            (participant) => participant.personId !== playerPersonId,
          ),
      ),
    ).toBe(true);
    expect(
      world.history.events.some(
        (event) => event.occurredAt > prior && event.occurredAt <= target,
      ),
    ).toBe(true);
    expect(generateOpeningLife(generated)).toBe(generated);
    const opened = openOrdinaryLife(world, playerPersonId);
    const nested = advanceWithWorldIntegrityAtEnd(() =>
      openOrdinaryLife(world, playerPersonId),
    );
    expect(serializeWorld(nested)).toEqual(serializeWorld(opened));
    const reopened = deserializeWorld(serializeWorld(opened));
    expect(reopened.currentDate).toBe(target);
    expect(reopened.history.events).toEqual(opened.history.events);
    expect(passOrdinaryDays(reopened, 1).currentDate).toBe(addDays(target, 1));
  }, 180_000);

  it("keeps observer control while the background clock advances", () => {
    const input = preStartInput();
    const background = buildPreStartBackgroundWorld(input);
    const target = input.preStartYear.targetStartDate;
    const advanced = completePreStartWorldYear(background, target);
    expect(advanced.currentDate).toBe(target);
    expect(advanced.control.kind).toBe("observer");
    expect(completePreStartWorldYear(advanced, target)).toBe(advanced);
    const firstResident = background.personOrder[0]!;
    expect(() =>
      completePreStartWorldYear(
        {
          ...background,
          control: { kind: "person", personId: firstResident },
        },
        target,
      ),
    ).toThrow("observer control");
  }, 180_000);

  it("restores full integrity checks after an opening refusal", () => {
    const background = buildPreStartBackgroundWorld(preStartInput());
    const missing = "person_missing_pre_start" as EntityId;
    expect(() => openOrdinaryLife(background, missing)).toThrow(
      "not in the world",
    );
    expect(() =>
      assertWorldIntegrity({
        ...background,
        control: { kind: "person", personId: missing },
      }),
    ).toThrow("missing person");
  });

  it("keeps unsupported office starts and birthday boundaries gated", () => {
    for (const startAge of [5, 6, 11, 14, 18]) {
      expect(
        newGameSetupProblems({ ...ordinarySetup, startAge }).some((problem) =>
          problem.message.includes("school or adulthood boundary"),
        ),
      ).toBe(true);
    }
    expect(
      newGameSetupProblems({
        ...ordinarySetup,
        startingLife: "legislative-office",
      }).some((problem) => problem.message.includes("ordinary life")),
    ).toBe(true);
  });
});
