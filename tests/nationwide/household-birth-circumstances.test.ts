import { describe, expect, it } from "vitest";
import { createDemoWorld } from "../../src/simulation/demo";
import { ageOnDate } from "../../src/simulation/dates";
import {
  createHousehold,
  recordHouseholdLocation,
  recordHouseholdMembershipState,
  startHouseholdMembership,
} from "../../src/simulation/life";
import { householdBirthCircumstances } from "../../src/simulation/living-world/household-birth-circumstances";
import { recordWorldEvent } from "../../src/simulation/world";

function fixture() {
  let world = createDemoWorld("birth-circumstances");
  const adults = world.personOrder
    .filter(
      (id) => ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
    )
    .slice(0, 2);
  const town = world.people[adults[0]!]!.homeJurisdictionId;
  const provenance = {
    kind: "authored" as const,
    note: "Birth circumstance regression fixture.",
  };
  world = createHousehold(world, {
    stableKey: "birth-fixture:household",
    label: "Birth fixture household",
    formedAt: world.currentDate,
    provenance,
  });
  const householdId = world.history.households.at(-1)!.id;
  world = recordHouseholdLocation(world, {
    stableKey: "birth-fixture:location",
    householdId,
    effectiveAt: world.currentDate,
    jurisdictionId: town,
    label: "Fixture town",
    kind: "residence:primary",
    provenance,
    supersedesLocationId: null,
  });
  for (const personId of adults) {
    for (const membership of world.history.householdMemberships.filter(
      (row) => row.personId === personId,
    )) {
      const state = world.history.householdMembershipStates
        .filter((row) => row.membershipId === membership.id)
        .at(-1)!;
      if (state.status === "ended" || state.residenceRole !== "primary")
        continue;
      world = recordHouseholdMembershipState(world, {
        stableKey: `birth-fixture:end:${membership.id}`,
        membershipId: membership.id,
        effectiveAt: world.currentDate,
        status: "ended",
        residenceRole: state.residenceRole,
        kind: state.kind,
        provenance,
        supersedesStateId: state.id,
      });
    }
    world = startHouseholdMembership(world, {
      stableKey: `birth-fixture:member:${personId}`,
      householdId,
      personId,
      startedAt: world.currentDate,
      residenceRole: "primary",
      kind: "resident:member",
      provenance,
    });
  }
  return { world, householdId, town, adults };
}

describe("recorded household circumstances before a birth decision", () => {
  it("reads ages and sources without inferring intent, money, housing or a birth", () => {
    const f = fixture();
    const before = JSON.stringify(f.world);
    const facts = householdBirthCircumstances(f.world, f.householdId, f.town);
    expect(facts.adults.map((row) => row.personId).sort()).toEqual(
      [...f.adults].sort(),
    );
    for (const row of facts.adults) {
      expect(row.age).toBe(
        ageOnDate(f.world.people[row.personId]!.birthDate, f.world.currentDate),
      );
      expect(
        f.world.history.householdMemberships.some(
          (record) => record.id === row.membershipId,
        ),
      ).toBe(true);
      expect(
        f.world.history.householdMembershipStates.some(
          (record) => record.id === row.membershipStateId,
        ),
      ).toBe(true);
    }
    expect(facts.plans).toEqual([]);
    expect(facts.missing).toContain("recorded-child-intention");
    expect(facts.missing).toContain("intention-to-birth-timing");
    expect(facts.missing).toContain("household-policy-pressure-response");
    expect(facts.dwellingIds).toEqual([]);
    expect(facts.monthlyPayTermsMinor).toBeNull();
    expect(facts.monthlyRentTermsMinor).toBeNull();
    expect(JSON.stringify(f.world)).toBe(before);
    expect(
      householdBirthCircumstances(JSON.parse(before), f.householdId, f.town),
    ).toEqual(facts);
  });
  it("preserves a recorded request without treating it as agreement or pregnancy", () => {
    const f = fixture();
    const world = recordWorldEvent(f.world, {
      stableKey: "birth-fixture:intention",
      type: "life.family-intended",
      occurredAt: f.world.currentDate,
      recordedAt: f.world.currentDate,
      jurisdictionId: f.town,
      involvedEntityIds: f.adults,
      participants: [
        {
          personId: f.adults[0]!,
          role: "agency:actor",
          detail: "Requested a child",
        },
        { personId: f.adults[1]!, role: "focus:asked-of", detail: "Was asked" },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["family-plan.kind:birth"],
      summary: "One adult requested a child.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const facts = householdBirthCircumstances(world, f.householdId, f.town);
    expect(facts.plans).toHaveLength(1);
    expect(facts.plans[0]!.answer).toBe("waiting");
    expect(facts.plans[0]!.childPersonId).toBeNull();
    expect(facts.plans[0]!.resolvesOn).toBeNull();
    expect(facts.missing).toContain("reproductive-capacity");
    expect(facts.missing).toContain("intention-to-birth-timing");
  });
  it("refuses policy pressure for a place the household does not occupy", () => {
    const f = fixture();
    const otherTown = Object.values(f.world.jurisdictions).find(
      (row) => row.id !== f.town,
    )!.id;
    expect(() =>
      householdBirthCircumstances(f.world, f.householdId, otherTown),
    ).toThrow("household's recorded place");
  });
});
