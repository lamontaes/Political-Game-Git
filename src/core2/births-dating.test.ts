import { describe, expect, it } from "vitest";
import { piecesInput, piecesSource as source } from "./core-pieces-fixture";
import {
  applyCoreEvent,
  assertCoreIntegrity,
  coreAPI,
  registerModule,
} from "./state";
import { createRenewalCore } from "./births-setup";
import { RENEWAL_PARAMETERS } from "./births-parameters";
import { advanceCore } from "./life";
import { RENEWAL_MODULE_ID } from "./modules/renewal";
import { addDays, makeIsoDate } from "../simulation/dates";
import type { CoreInput } from "./types";

// Births to couples who don't live together: a dating couple weighs a child
// the way a couple at home does, with living apart weighing against it, and a
// baby is born into the mother's home whether or not the other parent lives
// there.
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

/** The same two, dating: no partner link, the father in his own home. */
function dating(): CoreInput {
  const input = family();
  return {
    ...input,
    people: input.people.map((person) =>
      person.id === "mother"
        ? {
            ...person,
            familyIds: ["grandparent"],
            pastFacts: person.pastFacts!.filter(
              (fact) => fact.kind !== "family:partner",
            ),
          }
        : person.id === "father"
          ? { ...person, familyIds: [], householdId: "father-home" }
          : person,
    ),
    households: [
      { ...input.households[0]!, memberIds: ["mother"] },
      { id: "father-home", placeId: "place", memberIds: ["father"], source },
      input.households[1]!,
    ],
    familyLinks: input.familyLinks.filter((link) => link.kind !== "partner"),
  };
}

describe("births to couples who don't live together", () => {
  it("weighs a child for a dating couple while they court, and ends their plans when the courting stops", () => {
    const core = createRenewalCore(dating(), { scheduledWork: false });
    // Partnering's courtship record for the two (its module stands in here).
    registerModule(core, {
      id: "partnering",
      state: { schemaVersion: 1, tables: { courtships: {} } },
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    api
      .moduleState("partnering")
      .table("courtships")
      .put({
        id: "father:mother",
        value: 1,
        date: core.date,
        by: ["father", "mother"],
      });
    applyCoreEvent(core, {
      id: "courting:father:mother",
      date: core.date,
      kind: "family.courting",
      personIds: ["mother", "father"],
      placeId: "place",
      publicRecord: false,
      facts: { courtshipId: "father:mother" },
      source,
    });
    const store = api.moduleState(RENEWAL_MODULE_ID);
    const row = store.table("couples").get("dating:father:mother");
    expect(row?.status).toBe("active");
    expect(row?.courtshipId).toBe("father:mother");
    const plan = store
      .table("plans")
      .query("byCouple", ["dating:father:mother"])[0]!;
    const decisions = plan.decisions as unknown as {
      circumstances: { partnership: number };
    }[];
    // Living apart weighs against a child.
    for (const decision of decisions)
      expect(decision.circumstances.partnership).toBe(
        -RENEWAL_PARAMETERS.renewalApartPull!.value,
      );
    // Without a renewed courtship, the next review ends their plans.
    if (!plan.agreed) {
      advanceCore(
        core,
        addDays(
          makeIsoDate(core.date),
          RENEWAL_PARAMETERS.renewalReviewDays!.value + 1,
        ),
      );
      expect(store.table("couples").get("dating:father:mother")?.status).toBe(
        "inactive",
      );
    }
  });

  it("delivers into the mother's home when the parents parted during the pregnancy", () => {
    const core = createRenewalCore(family(), { scheduledWork: false }),
      api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const store = api.moduleState(RENEWAL_MODULE_ID);
    const pregnancy = store.table("pregnancies").rows()[0]!;
    expect(pregnancy).toBeDefined();
    core.households.set("father-home", {
      id: "father-home",
      placeId: "place",
      memberIds: [],
      source,
    });
    api.moveIntoHouseholdV1("father", "father-home");
    advanceCore(core, String(pregnancy.dueDate));
    const birth = store.table("births").rows()[0]!;
    const baby = core.people.get(String(birth.childId))!;
    expect(baby.householdId).toBe(core.people.get("mother")!.householdId);
    expect(baby.householdId).not.toBe(core.people.get("father")!.householdId);
    expect(core.familyLinks.get(`${baby.id}:parent:father`)).toBeDefined();
    assertCoreIntegrity(core);
  });
});
