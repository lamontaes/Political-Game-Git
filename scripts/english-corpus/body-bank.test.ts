import { describe, expect, it } from "vitest";
import type { GroundedEnglishPacket } from "../../src/english/grounded-english";
import { BODY_PARTS, composeBodyScene, type BodyScene } from "./body-bank";

/**
 * A town body's table composed from the authored floor and hearing parts:
 * every line is an authored sentence with the body's record facts in its
 * slots, and a project, a blame, a count or a speaker is said only from the
 * record.
 */
const packet = (facts: Record<string, string>): GroundedEnglishPacket => {
  const grounded = Object.fromEntries(
    Object.entries(facts).map(([key, text]) => [
      key,
      { text, sourceRecordIds: [`record:${key}`] },
    ]),
  );
  return {
    surface: "dialogue",
    momentKey: "words-body",
    worldSeed: "words-body",
    bankVersion: "words-body-v1",
    stage: "adult",
    sourceRecordIds: ["record:meeting"],
    facts: grounded,
    speaker: { personId: "chair", traits: {} },
    knowledge: Object.entries(grounded).map(([factKey, fact]) => ({
      personId: "chair",
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })),
  } as unknown as GroundedEnglishPacket;
};

const patterns = BODY_PARTS.map(
  (part) =>
    new RegExp(
      `^${part.text
        .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
        .replace(/\{\w+\}/g, ".+")}$`,
      "i",
    ),
);

const scenes: [BodyScene, Record<string, string>][] = [
  [
    "vote",
    {
      motion: "the Water Street Repair Act",
      project: "the new culvert on Mill Road",
      blamed: "the county engineer",
      ayes: "4",
      nays: "1",
      carried: "yes",
      chair: "Madam Chair",
    },
  ],
  ["vote", { motion: "the budget", ayes: "2", nays: "3", failed: "yes" }],
  [
    "hearing",
    { speaker: "Ruth Alvarez", bill: "the leash law", place: "Elwood" },
  ],
  [
    "hearing",
    { speaker: "Dale Becker", bill: "the leash law", cost: "$12,000" },
  ],
];

describe("a town body's table", () => {
  for (const [scene, facts] of scenes)
    it(`words a ${scene} (${Object.keys(facts).join(", ")}) from authored sentences`, () => {
      const lines = composeBodyScene(packet(facts), scene, {
        includeHeld: true,
      });
      expect(lines).not.toBeNull();
      for (const line of lines!) {
        expect(
          patterns.some((pattern) => pattern.test(line.text)),
          line.text,
        ).toBe(true);
        expect(line.text).not.toMatch(/\{/);
        expect(line.sourceRecordIds.length).toBeGreaterThan(0);
      }
      const text = lines!.map((line) => line.text).join(" ");
      if (!facts.project) expect(text).not.toMatch(/culvert|fund|list/);
      if (!facts.blamed) expect(text).not.toMatch(/doing|caused|because of/);
      if (facts.failed) expect(text).not.toMatch(/carries/);
      if (facts.carried) expect(text).not.toMatch(/fails/);
    });

  it("can't call a speaker without the sign-in record", () => {
    expect(
      composeBodyScene(packet({ bill: "the leash law" }), "hearing", {
        includeHeld: true,
      }),
    ).toBeNull();
  });

  it("can't announce a result without the count and the outcome", () => {
    expect(
      composeBodyScene(packet({ motion: "the budget" }), "vote", {
        includeHeld: true,
      }),
    ).toBeNull();
  });
});
