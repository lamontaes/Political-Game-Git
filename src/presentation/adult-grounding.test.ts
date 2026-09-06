import { describe, expect, it } from "vitest";

import { buildProductionWorld } from "./production-world";
import { buildLifeIntroduction } from "./life-introduction";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { requireLifePlace } from "../simulation";

/**
 * An adult start says what the generator wrote, before the first decision.
 *
 * The owner play was told "You're 34, and you live in Lexington, Kentucky. You
 * live on your own." — two facts they had typed in themselves — and then handed
 * a dilemma. The records held a parent, two schools and a job the entire time.
 * This is the projection failing, not the generator.
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
