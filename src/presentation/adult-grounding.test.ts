import { describe, expect, it } from "vitest";

import { buildProductionWorld } from "./production-world";
import { buildLifeIntroduction } from "./life-introduction";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { ageOnDate, requireLifePlace } from "../simulation";

/**
 * An adult start says what the generator wrote, before the first decision.
 *
 * The owner play was told "You're 34, and you live in Lexington, Kentucky. You
 * live on your own." — two facts they had typed in themselves — and then handed
 * a dilemma. The records held a parent, schools and a job the entire time.
 * The first repair exposed those records; the next owner play showed that one
 * of them was canonically wrong, because the generator called age seven high
 * school. The projection remains literal. The dates it exposes now have to be
 * right before they reach it.
 */

function adultInLexington(seed: string, gender: "male" | "female" = "male") {
  return buildProductionWorld({
    seed,
    place: requireLifePlace("lexington-fayette"),
    age: 34,
    givenName: null,
    familyName: null,
    identity: {
      gender,
      pronouns: gender === "male" ? "he-him" : "she-her",
    },
  });
}

function adultAt(seed: string, age: number) {
  return buildProductionWorld({
    seed,
    place: requireLifePlace("lexington-fayette"),
    age,
    givenName: null,
    familyName: null,
  });
}

describe("the opening grounds an adult life in its own records", () => {
  it("surfaces family, schooling and work the generator established", () => {
    const built = adultInLexington("grounding-seed");
    const introduction = buildLifeIntroduction(
      built.world,
      built.playerPersonId,
    );
    expect(introduction).not.toBeNull();
    const kinds = new Set(introduction!.grounding.map((fact) => fact.kind));
    expect(introduction!.grounding.length).toBeGreaterThan(0);
    expect(kinds.has("family")).toBe(true);
    expect(kinds.has("education")).toBe(true);
    expect(kinds.has("work")).toBe(true);
  });

  it("says nothing the opening sentences already said", () => {
    const built = adultInLexington("grounding-seed");
    const introduction = buildLifeIntroduction(
      built.world,
      built.playerPersonId,
    )!;
    // The age and the place are in the sentences above; a grounding line that
    // repeated either would be the redundancy the owner objected to.
    for (const fact of introduction.grounding) {
      expect(fact.text).not.toContain("You're 34");
      expect(fact.text).not.toBe("You live on your own.");
    }
  });

  it("traces every line back to the record that established it", () => {
    const built = adultInLexington("grounding-seed");
    const introduction = buildLifeIntroduction(
      built.world,
      built.playerPersonId,
    )!;
    const serialized = JSON.stringify(built.world.history);
    for (const fact of introduction.grounding) {
      expect(fact.basis).toBeTruthy();
      // The basis is a real record in this world, not a label.
      expect(serialized).toContain(fact.basis);
    }
  });

  it("is deterministic for a seed", () => {
    const a = adultInLexington("repeat-seed");
    const b = adultInLexington("repeat-seed");
    expect(
      buildLifeIntroduction(a.world, a.playerPersonId)!.grounding,
    ).toStrictEqual(
      buildLifeIntroduction(b.world, b.playerPersonId)!.grounding,
    );
  });

  it.each(
    [18, 21, 34, 55, 80].flatMap((age) =>
      ["chronology-a", "chronology-b", "chronology-c"].map(
        (seed) => [age, `${seed}-${age}`] as const,
      ),
    ),
  )("keeps generated age-%i history chronological for seed %s", (age, seed) => {
    const built = adultAt(seed, age);
    const person = built.world.people[built.playerPersonId]!;
    const education = built.world.history.educationEnrollments.filter(
      (record) => record.personId === person.id,
    );
    const elementary = education.find(
      (record) => record.programKind === "schooling:elementary",
    );
    const middle = education.find(
      (record) => record.programKind === "schooling:middle",
    );
    const high = education.find(
      (record) => record.programKind === "schooling:secondary",
    );
    expect(elementary).toBeDefined();
    expect(middle).toBeDefined();
    expect(high).toBeDefined();

    const elementaryAge = ageOnDate(person.birthDate, elementary!.startedAt);
    const middleAge = ageOnDate(person.birthDate, middle!.startedAt);
    const highAge = ageOnDate(person.birthDate, high!.startedAt);
    expect(elementaryAge).toBeGreaterThanOrEqual(5);
    expect(elementaryAge).toBeLessThanOrEqual(7);
    expect(middleAge).toBeGreaterThan(elementaryAge);
    expect(highAge).toBeGreaterThanOrEqual(13);
    expect(highAge).toBeLessThanOrEqual(15);
    expect(highAge).toBeGreaterThan(middleAge);

    const playerWork = built.world.history.workRelationships.filter(
      (record) => record.personId === person.id,
    );
    expect(playerWork.length).toBeGreaterThan(0);
    for (const work of playerWork) {
      expect(
        ageOnDate(person.birthDate, work.startedAt),
      ).toBeGreaterThanOrEqual(16);
      expect(work.startedAt <= built.world.currentDate).toBe(true);
    }

    const formativeEvents = built.world.history.events.filter(
      (event) =>
        event.stableKey.startsWith("production:earlier-life:event:") &&
        event.involvedEntityIds.includes(person.id),
    );
    const eventDates = formativeEvents.map((event) => event.occurredAt);
    expect(eventDates).toStrictEqual([...eventDates].sort());
    for (const date of eventDates) {
      expect(date >= person.birthDate).toBe(true);
      expect(date <= built.world.currentDate).toBe(true);
    }
  });
});

describe("a Lexington adult can stand for a Kentucky seat", () => {
  it("offers the campaign surface through the state above the city", () => {
    const built = adultInLexington("candidacy-seed");
    const capabilities = resolvePlayerCapabilities(built.world);
    expect(capabilities.campaign).toBe(true);
    expect(
      capabilities.withheld.some((entry) => entry.surface === "campaign"),
    ).toBe(false);
  });
});
