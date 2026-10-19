import { describe, expect, it } from "vitest";
import { piecesInput, piecesSource as source } from "./core-pieces-fixture";
import { coreAPI, assertCoreIntegrity } from "./state";
import { createRenewalCore } from "./births-setup";
import { buildNewborn } from "./births-people";
import { advanceCore, availableActs } from "./life";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { addDays, makeIsoDate } from "./kernel/dates";
import type { CoreInput } from "./types";

function family(): CoreInput {
  const input = piecesInput(),
    person = input.people[0]!;
  const mother = {
    ...person,
    id: "mother",
    birthDate: "1996-01-01",
    looks: { gender: "female" },
    jobId: "job",
    liquidMinor: 1_000_000,
    familyIds: ["father", "grandparent"],
    knownIds: [],
    pastFacts: [
      {
        id: "mother:parent",
        date: "1996-01-01",
        kind: "family:parent",
        summary: "parent",
        source,
        facts: { otherPersonId: "grandparent" },
      },
      {
        id: "mother:partner",
        date: "2023-07-01",
        kind: "family:partner",
        summary: "partner",
        source,
        facts: { otherPersonId: "father" },
      },
    ],
  };
  const father = {
    ...person,
    id: "father",
    birthDate: "1995-01-01",
    looks: { gender: "male" },
    liquidMinor: 1_000_000,
    familyIds: ["mother"],
    knownIds: [],
  };
  const grandparent = {
    ...person,
    id: "grandparent",
    birthDate: "1970-01-01",
    tier: "husk",
    householdId: "grandparent-home",
    familyIds: ["mother"],
    knownIds: [],
  };
  return {
    ...input,
    people: [mother, father, grandparent],
    households: [
      { ...input.households[0]!, memberIds: [mother.id, father.id] },
      {
        id: "grandparent-home",
        placeId: "place",
        memberIds: [grandparent.id],
        source,
      },
    ],
    organizations: [
      {
        id: "employer",
        name: "employer",
        kind: "firm",
        placeId: "place",
        liquidMinor: 0,
        source,
      },
    ],
    jobs: [
      {
        id: "job",
        personId: mother.id,
        organizationId: "employer",
        title: "role",
        wageDailyMinor: 30_000,
        hoursDaily: 0,
        source,
      },
    ],
    familyLinks: [
      { id: "couple", kind: "partner", personIds: [mother.id, father.id] },
      {
        id: "ancestry",
        kind: "parent-child",
        personIds: [grandparent.id, mother.id],
      },
    ],
  };
}

describe("births Part 1", () => {
  it("calls P15 builders while preserving existing kin and beginning every fact at birth", () => {
    const core = createRenewalCore(family(), {
        scheduledWork: false,
        observer: true,
      }),
      api = coreAPI(core);
    const before = structuredClone(
      [...core.people.values()].map((person) => ({
        id: person.id,
        traits: person.traits,
        past: person.pastFacts,
      })),
    );
    const first = buildNewborn(api, "pregnancy", ["mother", "father"], source);
    expect(
      buildNewborn(api, "pregnancy", ["mother", "father"], source),
    ).toEqual(first);
    expect(first.kin).toContainEqual({
      otherId: "grandparent",
      relation: "grandparent",
      inverse: "grandchild",
    });
    expect(first.person.familyIds).toEqual(
      expect.arrayContaining(["mother", "father", "grandparent"]),
    );
    expect(
      first.person.pastFacts?.every((fact) => fact.date === core.date),
    ).toBe(true);
    expect(first.person.knownIds).toEqual([]);
    expect(first.person.jobId).toBeUndefined();
    expect(
      [...core.people.values()].map((person) => ({
        id: person.id,
        traits: person.traits,
        past: person.pastFacts,
      })),
    ).toEqual(before);
    expect(() =>
      api.addBornPersonV1(
        first.person,
        ["mother", "father"],
        first.kin.filter((row) => row.otherId !== "father"),
      ),
    ).toThrow();
    expect(core.people.has(first.person.id)).toBe(false);
    expect(core.households.get("home")?.memberIds).toEqual([
      "mother",
      "father",
    ]);
    api.addBornPersonV1(first.person, ["mother", "father"], first.kin);
    expect(core.peopleByPlace.get("place")?.has(first.person.id)).toBe(true);
    expect(core.peopleByTier.get("newborn")?.has(first.person.id)).toBe(true);
    expect(core.households.get("home")?.memberIds).toContain(first.person.id);
    expect(core.people.get("grandparent")?.familyIds.has(first.person.id)).toBe(
      true,
    );
    expect(
      core.people.get("grandparent")?.pastFacts?.at(-1)?.facts?.otherPersonId,
    ).toBe(first.person.id);
    assertCoreIntegrity(core);
    const size = core.people.size;
    expect(() =>
      api.addBornPersonV1(first.person, ["mother", "father"], first.kin),
    ).toThrow();
    expect(core.people.size).toBe(size);
  });

  it("retains a deceased parent's kin without teaching them a posthumous name", () => {
    const core = createRenewalCore(family(), { scheduledWork: false });
    const api = coreAPI(core);
    api.updatePerson("father", { alive: false });
    const generated = buildNewborn(
      api,
      "posthumous-pregnancy",
      ["mother", "father"],
      source,
    );
    const baby = api.addBornPersonV1(
      generated.person,
      ["mother", "father"],
      generated.kin,
    );
    expect(core.people.get("father")!.familyIds.has(baby.id)).toBe(true);
    expect(core.people.get("father")!.knownIds.has(baby.id)).toBe(false);
    expect(api.knows("father", `person:${baby.id}:name`)).toBeUndefined();
    expect(api.knows("mother", `person:${baby.id}:name`)).toBeDefined();
    assertCoreIntegrity(core);
  });

  it("requires both partners' own agreement and preserves both alternatives and reasons", () => {
    const core = createRenewalCore(family(), { scheduledWork: false });
    core.people.get("father")!.affect.stress = 10;
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const store = coreAPI(core).moduleState(RENEWAL_MODULE_ID);
    const plans = store.table("plans").rows();
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.every((plan) => plan.agreed === false)).toBe(true);
    expect(plans[0]!.agreed).toBe(false);
    expect(store.table("pregnancies").size).toBe(0);
    const decisions = plans[0]!.decisions as unknown as {
      selected: string;
      scores: unknown[];
      circumstances: { health: number };
    }[];
    expect(decisions.every((decision) => decision.scores.length === 2)).toBe(
      true,
    );
    expect(decisions[1]!.selected).toBe("renewal-wait");
    expect(decisions[1]!.circumstances.health).toBeLessThan(
      decisions[0]!.circumstances.health,
    );
  });

  it("delivers on the recorded date exactly once, updates the household and publishes a traceable event", () => {
    const core = createRenewalCore(family(), {
        scheduledWork: false,
        observer: true,
      }),
      api = coreAPI(core);
    const seen: string[] = [];
    api.subscribeEvents("birth-test", ["person-birth"], (_api, event) =>
      seen.push(event.id),
    );
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const store = api.moduleState(RENEWAL_MODULE_ID);
    expect(
      store.table("pregnancies").size,
      JSON.stringify(store.table("plans").rows()),
    ).toBe(1);
    const pregnancy = store.table("pregnancies").rows()[0]!;
    const cash = [...core.people.values()].reduce(
      (sum, person) => sum + person.liquidMinor,
      0,
    );
    advanceCore(core, addDays(makeIsoDate(String(pregnancy.dueDate)), -1));
    expect(store.table("births").size).toBe(0);
    advanceCore(core, String(pregnancy.dueDate));
    expect(store.table("births").size).toBe(1);
    const birth = store.table("births").rows()[0]!,
      baby = core.people.get(String(birth.childId))!;
    expect(baby.birthDate).toBe(pregnancy.dueDate);
    expect(baby.liquidMinor).toBe(0);
    expect(
      [...core.people.values()].reduce(
        (sum, person) => sum + person.liquidMinor,
        0,
      ),
    ).toBe(cash);
    expect(core.familyLinks.get(`${baby.id}:parent:mother`)?.personIds).toEqual(
      ["mother", baby.id],
    );
    expect(seen).toEqual([`${baby.id}:birth`]);
    const log = core.durableLog.get(`${baby.id}:birth`);
    expect(log?.facts?.pregnancyId).toBe(pregnancy.id);
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
    expect(store.table("births").size).toBe(1);
    expect(availableActs(core, baby.id)).toEqual([]);
    expect(baby.actCount).toBe(0);
    expect(
      [...core.relationships.values()].some(
        (tie) =>
          (tie.actorId === baby.id || tie.otherId === baby.id) && tie.level > 0,
      ),
    ).toBe(true);
    assertCoreIntegrity(core);
  });
});
