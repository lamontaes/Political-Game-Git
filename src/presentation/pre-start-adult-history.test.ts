import { describe, expect, it } from "vitest";
import { addDays } from "../simulation/dates";
import { requireLifePlace } from "../simulation/life-places";
import { settleLocalBusinesses } from "../simulation/local-economy";
import { advanceWorld } from "../simulation/world";
import type { EntityId, World } from "../simulation/types";
import { projectPersonalRecord } from "./personal-record";
import {
  buildPreStartBackgroundWorld,
  finalizePreStartPlayer,
} from "./production-world";
import { projectWorld39Journal } from "./world39-journal";

const place = requireLifePlace("kentucky");

function start(
  age: number,
  placeKey = "kentucky",
  seed = `pre-start-adult-${age}`,
) {
  const casePlace = requireLifePlace(placeKey);
  const caseTarget = casePlace.context.initialMoment.date;
  const casePrior = addDays(caseTarget, -365);
  const input = {
    seed,
    place: casePlace,
    age,
    givenName: "Morgan",
    familyName: "Reed",
    startingLife: "ordinary-life" as const,
    depth:
      age < 18
        ? ("play-formative-years" as const)
        : ("summarize-earlier-life" as const),
    household: age < 18 ? ("shares-a-home" as const) : ("lives-alone" as const),
    preStartYear: {
      version: "pre-start-world-year-v1" as const,
      targetStartDate: caseTarget,
      priorYearStartDate: casePrior,
    },
  };
  const background = buildPreStartBackgroundWorld(input);
  const advanced = advanceWorld(background, 365);
  return finalizePreStartPlayer(advanced, input);
}

function expectHistoryAndDistinctNames(
  world: World,
  personId: EntityId,
  label: string,
): void {
  const journal = projectWorld39Journal(world, personId);
  const preBegin = journal.entries.filter(
    (entry) =>
      entry.at < world.currentDate &&
      !entry.id.startsWith("birth:") &&
      !entry.text.startsWith("You were born"),
  );
  expect(preBegin.length).toBeGreaterThan(0);
  const family = new Set(
    world.history.kinshipRelationships
      .filter((row) => row.personIds.includes(personId))
      .flatMap((row) => row.personIds),
  );
  const living = [...family]
    .map((id) => world.people[id])
    .filter(
      (person) =>
        person &&
        !world.history.personDeaths.some(
          (death) =>
            death.personId === person.id && death.diedAt <= world.currentDate,
        ),
    );
  expect(
    new Set(
      living.map((person) => person!.givenName.toLocaleLowerCase("en-US")),
    ).size,
    `${label}: living close relatives must have distinct first names`,
  ).toBe(living.length);
}

describe("pre-start adult history reaches the ordinary readers", () => {
  for (const age of [22, 35, 52, 70]) {
    it(`shows family, shared years, and personal money at target age ${age}`, () => {
      const { world, playerPersonId } = start(age);
      const family = new Set(
        world.history.kinshipRelationships
          .filter((row) => row.personIds.includes(playerPersonId))
          .flatMap((row) => row.personIds)
          .filter((id) => id !== playerPersonId),
      );
      expect(family.size).toBeGreaterThanOrEqual(3);
      // A parent, not always a mother: a father-only home is a real share.
      const parent = [...family].find(
        (id) =>
          world.people[id]!.birthDate <
            world.people[playerPersonId]!.birthDate &&
          world.history.kinshipRelationships.some(
            (row) =>
              row.kind === "lineal:parent-child" &&
              row.personIds.includes(id) &&
              row.personIds.includes(playerPersonId),
          ),
      );
      expect(parent).toBeDefined();
      expect(
        world.history.events.some(
          (event) =>
            event.type === "life.family-time" &&
            event.participants.some((person) => person.personId === parent) &&
            event.participants.some(
              (person) => person.personId === playerPersonId,
            ),
        ),
      ).toBe(true);
      const journal = projectWorld39Journal(world, playerPersonId);
      expectHistoryAndDistinctNames(world, playerPersonId, `age ${age}`);
      expect(
        journal.entries.some((entry) =>
          entry.text.includes("spent time together"),
        ),
      ).toBe(true);
      const personal = projectPersonalRecord(world, playerPersonId);
      expect(
        personal?.purses.find((purse) => purse.kind === "personal")?.balance
          ?.minorUnits,
      ).toBeGreaterThan(0);
    });
  }
});

describe("pre-start child history reaches the ordinary Journal", () => {
  it("gives a ten-year-old a family circle and shared childhood without a long blank span", () => {
    const { world, playerPersonId } = start(
      10,
      "kentucky",
      "pre-start-child-10",
    );
    const family = new Set(
      world.history.kinshipRelationships
        .filter((row) => row.personIds.includes(playerPersonId))
        .flatMap((row) => row.personIds)
        .filter((id) => id !== playerPersonId),
    );
    expect(family.size).toBeGreaterThanOrEqual(3);
    const journal = projectWorld39Journal(world, playerPersonId);
    expectHistoryAndDistinctNames(world, playerPersonId, "age 10");
    expect(
      journal.entries.some((entry) =>
        entry.text.includes("spent time together"),
      ),
    ).toBe(true);
  });
});

describe("pre-start wages", () => {
  it("starts the pay flow at construction and settles only forward months", () => {
    const { world, playerPersonId } = start(35);
    const flow = world.history.resourceFlows.find(
      (row) =>
        row.basisReference.kind === "work" &&
        row.recipient.kind === "person" &&
        row.recipient.personId === playerPersonId,
    );
    expect(flow?.startsAt).toBe(world.currentDate);
    expect(
      world.history.resourceTransferOutcomes.filter(
        (row) => row.resourceFlowId === flow?.id,
      ),
    ).toHaveLength(0);
    const later = advanceWorld(world, 35);
    const settled = settleLocalBusinesses(later, place.context.jurisdiction.id);
    const outcomes = settled.history.resourceTransferOutcomes.filter(
      (row) => row.resourceFlowId === flow?.id,
    );
    expect(outcomes.length).toBeGreaterThan(0);
    expect(outcomes.length).toBeLessThanOrEqual(2);
    expect(outcomes.every((row) => row.occurredAt > world.currentDate)).toBe(
      true,
    );
  });
});

describe("five-place prior-date source coverage", () => {
  const cases = [
    ["kentucky", 10],
    ["3260600", 22],
    ["lexington-fayette", 35],
    ["0203000", 52],
    ["1319000", 70],
  ] as const;
  for (const [placeKey, age] of cases) {
    it(`${placeKey}, target age ${age} has a dated family and a readable Journal`, () => {
      const casePlace = requireLifePlace(placeKey);
      const caseTarget = casePlace.context.initialMoment.date;
      const { world, playerPersonId } = start(
        age,
        placeKey,
        `pre-start-five-places:${placeKey}:${age}`,
      );
      expect(world.currentDate).toBe(caseTarget);
      const family = new Set(
        world.history.kinshipRelationships
          .filter((row) => row.personIds.includes(playerPersonId))
          .flatMap((row) => row.personIds)
          .filter((id) => id !== playerPersonId),
      );
      expect(family.size).toBeGreaterThanOrEqual(3);
      const journal = projectWorld39Journal(world, playerPersonId);
      expectHistoryAndDistinctNames(world, playerPersonId, placeKey);
      expect(
        journal.entries.some((entry) =>
          entry.text.includes("spent time together"),
        ),
      ).toBe(true);
      if (age >= 18)
        expect(
          projectPersonalRecord(world, playerPersonId)?.purses.find(
            (purse) => purse.kind === "personal",
          )?.balance?.minorUnits,
        ).toBeGreaterThan(0);
    });
  }
});
