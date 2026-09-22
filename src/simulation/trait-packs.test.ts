import { describe, expect, it } from "vitest";

import {
  describeTraitLoad,
  leansForDecision,
  loadTraitPacks,
  magnitudeForStrength,
  packOfQualifiedKey,
  strengthForMagnitude,
  type DecisionDeclaration,
  type TraitPack,
} from "./trait-packs";
import { peopleTraitPack, PEOPLE_TRAIT_SCALE } from "./people-trait-pack";
import {
  PEOPLE_TRAITS,
  peopleTraitDefinition,
} from "./people-trait-definitions";

const ORDINARY: DecisionDeclaration = {
  id: "contact.answer",
  scope: "life:ordinary",
  options: ["accept", "decline", "counter"],
};

const BARGAINING: DecisionDeclaration = {
  id: "bargaining.commitment",
  scope: "government:bargaining",
  options: ["remind-of-commitment"],
};

function leaning(rows: TraitPack["effects"]): TraitPack {
  return { pack: "test-pack", traits: [], effects: rows };
}

describe("a trait pack is loaded, not imported", () => {
  it("registers the five without changing what any save already holds", () => {
    const registry = loadTraitPacks([peopleTraitPack()], [ORDINARY]);
    expect(registry.report.rejections).toEqual([]);

    // The qualified key is the stable key the records already carry, so every
    // existing world resolves unchanged. This is the migration story.
    for (const trait of PEOPLE_TRAITS) {
      const qualified = `people-mind-v1:${trait}`;
      expect(registry.traits.has(qualified)).toBe(true);
      expect(peopleTraitDefinition(trait).stableKey).toBe(qualified);
    }
  });

  it("says what each pack registered and what reads it, not that it parsed", () => {
    const registry = loadTraitPacks([peopleTraitPack()], [ORDINARY]);
    const report = registry.report.packs[0]!;
    expect(report.traitsRegistered).toHaveLength(5);
    expect(report.leansRegistered).toBe(0);
    // Five traits nothing leans on: loaded, and affecting nothing. A pack that
    // validates while reaching no consumer must be visible as exactly that.
    expect(report.registeredButUnused).toHaveLength(5);
    expect(describeTraitLoad(registry.report)).toContain("read by nothing");
  });

  it("carries the scale the five have always used, and no fourth strength", () => {
    expect(strengthForMagnitude(PEOPLE_TRAIT_SCALE, 1)).toBe("moderate");
    expect(strengthForMagnitude(PEOPLE_TRAIT_SCALE, 2)).toBe("strong");
    expect(magnitudeForStrength(PEOPLE_TRAIT_SCALE, "strong")).toBe(2);
    // `defining` used to decode as 2, the same as strong, with nothing saying
    // so. It is undeclared now, so it decodes to nothing at all.
    expect(magnitudeForStrength(PEOPLE_TRAIT_SCALE, "defining")).toBeNull();
    expect(strengthForMagnitude(PEOPLE_TRAIT_SCALE, 3)).toBeNull();
  });
});

describe("every reference resolves at load, or is rejected by name", () => {
  const cases: readonly [string, TraitPack["effects"], RegExp][] = [
    [
      "a decision this build does not have",
      [{ decision: "some.later.decision", leans: [] }],
      /no decision "some\.later\.decision" is declared in this build/,
    ],
    [
      "a trait no pack declares",
      [
        {
          decision: "contact.answer",
          leans: [
            {
              option: "accept",
              trait: "other-pack:warmth",
              pole: "high",
              explanation: "x",
            },
          ],
        },
      ],
      /no pack declares the trait "other-pack:warmth"/,
    ],
    [
      "a bare trait key that is not qualified",
      [
        {
          decision: "contact.answer",
          leans: [
            {
              option: "accept",
              trait: "sociability",
              pole: "high",
              explanation: "x",
            },
          ],
        },
      ],
      /not a qualified trait key/,
    ],
    [
      "an option the decision does not publish",
      [
        {
          decision: "contact.answer",
          leans: [
            {
              option: "accpet",
              trait: "people-mind-v1:sociability",
              pole: "high",
              explanation: "x",
            },
          ],
        },
      ],
      /does not offer the option "accpet"/,
    ],
    [
      "a lean with no explanation",
      [
        {
          decision: "contact.answer",
          leans: [
            {
              option: "accept",
              trait: "people-mind-v1:sociability",
              pole: "high",
              explanation: "  ",
            },
          ],
        },
      ],
      /must say why/,
    ],
  ];

  for (const [name, effects, reason] of cases) {
    it(`rejects ${name}, naming the row`, () => {
      const registry = loadTraitPacks(
        [peopleTraitPack(), leaning(effects)],
        [ORDINARY],
      );
      expect(registry.report.rejections).toHaveLength(1);
      expect(registry.report.rejections[0]!.reason).toMatch(reason);
      expect(registry.report.rejections[0]!.pack).toBe("test-pack");
      // The rest of the load survives: a bad row is not a dead pack.
      expect(registry.traits.size).toBe(5);
      expect(leansForDecision(registry, "contact.answer")).toEqual([]);
    });
  }

  it("refuses an ordinary-life trait inside a room it was not declared for", () => {
    const registry = loadTraitPacks(
      [
        peopleTraitPack(),
        leaning([
          {
            decision: "bargaining.commitment",
            leans: [
              {
                option: "remind-of-commitment",
                trait: "people-mind-v1:reliability",
                pole: "high",
                explanation: "They keep what they said.",
              },
            ],
          },
        ]),
      ],
      [ORDINARY, BARGAINING],
    );
    // The refusal is the feature. Widening is an edit to the trait's own
    // declaration, not an invisible read from another room.
    expect(registry.report.rejections[0]!.reason).toMatch(
      /may be read in life:ordinary, and "bargaining\.commitment" is government:bargaining/,
    );
    expect(leansForDecision(registry, "bargaining.commitment")).toEqual([]);
  });

  it("keeps the good rows of a pack whose other rows are bad", () => {
    const registry = loadTraitPacks(
      [
        peopleTraitPack(),
        leaning([
          {
            decision: "contact.answer",
            leans: [
              {
                option: "nope",
                trait: "people-mind-v1:sociability",
                pole: "high",
                explanation: "x",
              },
              {
                option: "accept",
                trait: "people-mind-v1:sociability",
                pole: "high",
                explanation: "They like seeing people.",
              },
            ],
          },
        ]),
      ],
      [ORDINARY],
    );
    expect(registry.report.rejections).toHaveLength(1);
    expect(leansForDecision(registry, "contact.answer")).toHaveLength(1);
    expect(leansForDecision(registry, "contact.answer")[0]!.option).toBe(
      "accept",
    );
    const people = registry.report.packs[0]!;
    expect(people.consumedBy["people-mind-v1:sociability"]).toEqual([
      "contact.answer",
    ]);
    expect(people.registeredButUnused).not.toContain(
      "people-mind-v1:sociability",
    );
  });
});

describe("a trait declaration has to be coherent before anything reads it", () => {
  function onlyTrait(trait: Partial<TraitPack["traits"][number]>): TraitPack {
    const base = peopleTraitPack().traits[0]!;
    return { pack: "test-pack", traits: [{ ...base, ...trait }], effects: [] };
  }

  const bad: readonly [string, Partial<TraitPack["traits"][number]>, RegExp][] =
    [
      [
        "a seeded trait with no spread",
        { conferredBy: "seeded", seed: null },
        /declares no spread/,
      ],
      [
        "a conferred-only trait that seeds anyway",
        { conferredBy: "conferred-only" },
        /only a seeded trait is drawn/,
      ],
      ["a trait nothing may read", { scopes: [] }, /declares no scope/],
      [
        "a spread the scale does not declare",
        { seed: { spread: [3] } },
        /seeds the value 3, which its scale does not declare/,
      ],
      [
        "two magnitudes stored as one strength",
        {
          scale: {
            balancedKey: "balanced",
            balancedLabel: "Neither, much",
            balancedDescription: "No marked lean either way.",
            steps: [
              { magnitude: 1, strength: "strong" },
              { magnitude: 2, strength: "strong" },
            ],
          },
          seed: { spread: [1] },
        },
        /could not be decoded/,
      ],
      [
        "a key that pretends to be qualified",
        { key: "pack:key" },
        /contains a colon/,
      ],
    ];

  for (const [name, patch, reason] of bad) {
    it(`rejects ${name}`, () => {
      const registry = loadTraitPacks([onlyTrait(patch)], [ORDINARY]);
      expect(registry.report.rejections[0]!.reason).toMatch(reason);
      expect(registry.traits.size).toBe(0);
    });
  }

  it("refuses two packs claiming one name, which is this build's mistake", () => {
    expect(() =>
      loadTraitPacks([peopleTraitPack(), peopleTraitPack()], []),
    ).toThrow(/Two packs claim the name/);
    expect(() => loadTraitPacks([], [ORDINARY, ORDINARY])).toThrow(
      /Two decisions declare/,
    );
  });

  it("reads a pack out of a qualified key, and says when there is none", () => {
    expect(packOfQualifiedKey("people-mind-v1:risk")).toBe("people-mind-v1");
    expect(packOfQualifiedKey("risk")).toBeNull();
    expect(packOfQualifiedKey(":risk")).toBeNull();
    expect(packOfQualifiedKey("people-mind-v1:")).toBeNull();
  });
});
