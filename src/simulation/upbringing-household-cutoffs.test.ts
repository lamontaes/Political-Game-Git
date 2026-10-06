import { describe, expect, it, vi } from "vitest";
import * as families from "./family-shape";
import { ensurePeopleTraits } from "./people-traits";
import { smallWorld } from "../../tests/fixtures/small-world";
import { addDays } from "./dates";
import {
  createHousehold,
  recordKinship,
  startHouseholdMembership,
} from "./life";
import { upbringingFor } from "./people-upbringing";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { World } from "./types";

const provenance = {
  kind: "authored" as const,
  note: "Controlled dated household reader facts.",
};
function fixture() {
  const base = smallWorld({
    place: "OH",
    seed: "session5-household-cutoffs",
    people: 8,
    household: true,
  }).world;
  const ordered = [...base.personOrder].sort((a, b) =>
    base.people[a]!.birthDate.localeCompare(base.people[b]!.birthDate),
  );
  const parentId = ordered[0]!;
  const childId = ordered.at(-1)!;
  const formedAt = addDays(base.currentDate, -10);
  let world = createHousehold(base, {
    stableKey: "cutoff:older-home",
    label: "Recorded older home",
    formedAt,
    provenance,
  });
  const householdId = world.history.households.at(-1)!.id;
  world = startHouseholdMembership(world, {
    stableKey: "cutoff:older-parent",
    personId: parentId,
    householdId,
    startedAt: formedAt,
    residenceRole: "secondary",
    kind: "resident:member",
    provenance,
  });
  world = recordKinship(world, {
    stableKey: "cutoff:parent",
    personIds: [parentId, childId],
    establishedAt: formedAt,
    kind: "lineal:parent-child",
    provenance,
  });
  return { world, parentId, childId, householdId };
}
function readAll(world: World) {
  return world.personOrder.map((id) => upbringingFor(world, id));
}
function dated(world: World, days: number): World {
  return { ...world, currentDate: addDays(world.currentDate, days) };
}
function noUnavailableUnrelatedMemberships(world: World): World {
  const related = new Set(
    world.history.kinshipRelationships.flatMap((row) => row.personIds),
  );
  const available = new Set(
    world.history.householdMemberships
      .filter(
        (row) =>
          row.startedAt <= world.currentDate &&
          row.sequence < world.history.nextSequence,
      )
      .map((row) => row.personId),
  );
  return {
    ...world,
    people: { ...world.people },
    history: {
      ...world.history,
      householdMemberships: world.history.householdMemberships.filter(
        (row) => related.has(row.personId) || available.has(row.personId),
      ),
    },
  };
}

describe("historical household cohort cutoffs", () => {
  it("preserves full upbringing before later unrelated residences become available", () => {
    const { world } = fixture();
    for (const days of [-11, -1, 0, 1]) {
      const atDate = dated(world, days);
      expect(readAll(atDate)).toEqual(
        readAll(noUnavailableUnrelatedMemberships(atDate)),
      );
    }
  });
  it("preserves the exact sequence-exclusive boundary independently of date", () => {
    const { world } = fixture();
    const membership = world.history.householdMemberships[0]!;
    const cutoffs = [
      membership.sequence,
      membership.sequence + 1,
      membership.sequence + 2,
      world.history.nextSequence,
    ];
    for (const order of [cutoffs, [...cutoffs].reverse()]) {
      const sharedPeople = { ...world.people };
      for (const nextSequence of order) {
        // Read-only historical cutoff controls retain later rows, never persist this view.
        const view: World = {
          ...world,
          people: sharedPeople,
          history: { ...world.history, nextSequence },
        };
        expect(readAll(view)).toEqual(
          readAll(noUnavailableUnrelatedMemberships(view)),
        );
      }
    }
  });
  it("keeps another older residence and the parent's household despite future own membership", () => {
    const { world, parentId, childId, householdId } = fixture();
    const view = dated(world, -1);
    const parent = upbringingFor(view, parentId).familyContext!;
    const child = upbringingFor(view, childId).familyContext!;
    expect(parent.householdId).toBe(householdId);
    expect(parent.householdMemberIds).toContain(parentId);
    expect(child.parentIds).toContain(parentId);
    expect(child.householdId).toBe(householdId);
    expect(child.householdMemberIds).toContain(parentId);
    expect(child.caregiverPersonIds).toContain(parentId);
    expect(child.caregiverCapacity).toBeGreaterThan(0);
  });
  it("retains cache identity and rebuilds across appended facts, date boundaries and reload", () => {
    const { world, parentId, childId, householdId } = fixture();
    const original = dated(world, -1);
    const prior = upbringingFor(original, childId);
    expect(upbringingFor(original, childId)).toBe(prior);
    const appended = startHouseholdMembership(world, {
      stableKey: "cutoff:child-home",
      personId: childId,
      householdId,
      startedAt: world.currentDate,
      residenceRole: "secondary",
      kind: "resident:member",
      provenance,
    });
    const before = dated(appended, -1);
    expect(readAll(before)).toEqual(readAll(original));
    const current = upbringingFor(appended, childId);
    expect(current.familyContext!.householdMemberIds).toContain(parentId);
    expect(current.familyContext!.householdMemberIds).toContain(childId);
    expect(upbringingFor(original, childId)).toBe(prior);
    const loaded = deserializeWorld(serializeWorld(appended));
    expect(readAll(loaded)).toEqual(readAll(appended));
  });
  it("excludes state and kinship sequence s at cutoff s, admitting it at s + 1 in both orders", () => {
    const { world, parentId, childId, householdId } = fixture();
    const membership = world.history.householdMemberships[0]!;
    const state = world.history.householdMembershipStates.find(
      (row) => row.membershipId === membership.id,
    )!;
    for (const order of [
      [state.sequence, state.sequence + 1],
      [state.sequence + 1, state.sequence],
    ]) {
      const people = { ...world.people };
      for (const nextSequence of order) {
        const view: World = {
          ...world,
          people,
          history: { ...world.history, nextSequence },
        };
        const own = upbringingFor(view, membership.personId);
        expect(own.familyContext!.householdId).toBe(
          nextSequence === state.sequence ? null : membership.householdId,
        );
        expect(readAll(view)).toEqual(
          readAll({ ...view, people: { ...people } }),
        );
      }
    }
    const relationship = world.history.kinshipRelationships.at(-1)!;
    for (const order of [
      [relationship.sequence, relationship.sequence + 1],
      [relationship.sequence + 1, relationship.sequence],
    ]) {
      const people = { ...world.people };
      for (const nextSequence of order) {
        const view: World = {
          ...dated(world, -1),
          people,
          history: { ...world.history, nextSequence },
        };
        const own = upbringingFor(view, childId).familyContext!;
        if (nextSequence === relationship.sequence) {
          expect(own.parentIds).not.toContain(parentId);
          expect(own.householdId).toBeNull();
        } else {
          expect(own.parentIds).toContain(parentId);
          expect(own.householdId).toBe(householdId);
        }
        expect(readAll(view)).toEqual(
          readAll({ ...view, people: { ...people } }),
        );
      }
    }
  });
  it("reuses cohorts across irrelevant trait appends in both snapshot orders", () => {
    const { world } = fixture();
    const npc = world.personOrder.find(
      (id) => world.control.kind !== "person" || id !== world.control.personId,
    )!;
    const changed = ensurePeopleTraits(world, [npc]);
    expect(changed.history.personalityTendencies.length).toBeGreaterThan(
      world.history.personalityTendencies.length,
    );
    expect(changed.people).toBe(world.people);
    const expected = upbringingFor(
      { ...world, people: { ...world.people } },
      npc,
    );
    const spy = vi.spyOn(families, "recordedFamilyEstimates");
    try {
      for (const order of [
        [world, changed],
        [changed, world],
      ]) {
        const people = { ...world.people };
        const first = upbringingFor({ ...order[0]!, people }, npc);
        const calls = spy.mock.calls.length;
        expect(calls).toBeGreaterThan(0);
        const second = upbringingFor({ ...order[1]!, people }, npc);
        expect(first).toEqual(expected);
        expect(second).toEqual(expected);
        expect(spy.mock.calls.length).toBe(calls);
      }
    } finally {
      spy.mockRestore();
    }
  });
  it("keeps future first rows when another older residence exists, preserving representatives and revisions", () => {
    let world = smallWorld({
      place: "OH",
      seed: "session5-older-residence-order",
      people: 8,
      household: true,
    }).world;
    const [first, second, focus] = world.personOrder;
    expect(world.history.kinshipRelationships).toHaveLength(0);
    const formedAt = addDays(world.currentDate, -10);
    world = createHousehold(world, {
      stableKey: "order:first-home",
      label: "First older home",
      formedAt,
      provenance,
    });
    const firstHome = world.history.households.at(-1)!.id;
    world = createHousehold(world, {
      stableKey: "order:second-home",
      label: "Second older home",
      formedAt,
      provenance,
    });
    const secondHome = world.history.households.at(-1)!.id;
    // Append older memberships in the opposite order to their future first rows.
    for (const [personId, householdId] of [
      [second!, secondHome],
      [first!, firstHome],
    ]) {
      world = startHouseholdMembership(world, {
        stableKey: `order:older:${personId}`,
        personId,
        householdId,
        startedAt: formedAt,
        residenceRole: "secondary",
        kind: "resident:member",
        provenance,
      });
    }
    const view = dated(world, -1);
    expect(upbringingFor(view, first!).familyContext!.householdId).toBe(
      firstHome,
    );
    const before = upbringingFor(view, focus!).familyContext!;
    expect(before.cohortScope).toBe("household");
    expect(before.comparablePersonIds).toEqual([first, second]);
    expect(before.caregiverCapacity).toBeGreaterThan(0);
    const rows = [...view.history.householdMemberships];
    [rows[0], rows[1]] = [rows[1]!, rows[0]!];
    // A read-only revised ordering is a cache rebuild control, never persisted.
    const revised: World = {
      ...view,
      history: { ...view.history, householdMemberships: rows },
    };
    expect(
      upbringingFor(revised, focus!).familyContext!.comparablePersonIds,
    ).toEqual([second, first]);
    expect(readAll(revised)).toEqual(
      readAll({ ...revised, people: { ...revised.people } }),
    );
    expect(upbringingFor(view, focus!).familyContext).toBe(before);
  });
});
