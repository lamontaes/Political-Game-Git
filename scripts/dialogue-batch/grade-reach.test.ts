import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CALIBRATION,
  calibratedVariants,
  gradeReach,
  pieceFactor,
} from "../../src/english/calibration";
import {
  PART_GRADES,
  type PartGradeLedger,
} from "../../src/english/english-grades";
import { renderLine } from "../../src/english/bank-line";
import { buildReach } from "../../src/english/grade-reach";
import { readPieces, REACH_FILE } from "./apply-grades";

const pieces = readPieces();
const classes = CALIBRATION.registerClasses!;
const bankOf = (key: string) => pieces.get(key)!.bank;

/** The groups of the shipped reach that hold a graded piece, with the members they reach. */
const reached = () => {
  const byGroup = new Map<string, string[]>();
  for (const [key, group] of Object.entries(CALIBRATION.reach!.profiles))
    byGroup.set(group, [...(byGroup.get(group) ?? []), key]);
  return byGroup;
};

describe("a grade reaches the pieces that share its pattern, voice and register", () => {
  it("the shipped reach file is what the banks and the ledger give", () => {
    const built = buildReach(pieces, PART_GRADES, classes);
    expect(JSON.parse(readFileSync(REACH_FILE, "utf8"))).toEqual(built);
  });

  // Across banks: a grade said in one bank moves the same pattern in another
  // (with the batch-only interview bank gone, conversation and scene talk).
  it("a graded piece moves at least ten other pieces in another bank too", () => {
    const withoutReach = { ...CALIBRATION, reach: undefined };
    let witnessed = 0;
    for (const [group, members] of reached()) {
      const grade = CALIBRATION.reach!.groups[group]!;
      for (const graded of Object.keys(grade.graded)) {
        const moved = members.filter(
          (key) =>
            key !== graded &&
            gradeReach([key], CALIBRATION) !== gradeReach([key], withoutReach),
        );
        if (moved.length >= 10 && new Set(moved.map(bankOf)).size >= 2)
          witnessed += 1;
      }
    }
    expect(witnessed).toBeGreaterThan(0);
  });

  it("slides: more good grades weigh more, more bad grades weigh less, never to zero or past the bounds", () => {
    const [group] = [...reached()].find(([, m]) => m.length > 12)!;
    const peer = reached()
      .get(group)!
      .find((key) => !(key in CALIBRATION.reach!.groups[group]!.graded))!;
    const withNet = (net: number): typeof CALIBRATION => ({
      ...CALIBRATION,
      reach: {
        ...CALIBRATION.reach!,
        groups: { [group]: { net, graded: {} } },
      },
    });
    const factors = [-40, -8, -2, 0, 2, 8, 40].map((net) =>
      gradeReach([peer], withNet(net)),
    );
    for (let at = 1; at < factors.length; at += 1)
      expect(factors[at]).toBeGreaterThanOrEqual(factors[at - 1]!);
    expect(factors[3]).toBe(1);
    expect(factors[0]).toBeGreaterThan(0);
    expect(factors[0]).toBeGreaterThanOrEqual(
      CALIBRATION.parameters.reachFloor!.value,
    );
    expect(factors[6]).toBeLessThanOrEqual(
      CALIBRATION.parameters.reachCeiling!.value,
    );
    // Strictly sliding between the ends: a step of one grade moves it a little.
    expect(factors[4]).toBeGreaterThan(1);
    expect(factors[4]).toBeLessThan(factors[5]!);
  });

  it("a scene line on a fixed seed is picked differently after the grade, and only through the reach", () => {
    // The scene-talk pieces of one reached group with no slots, as one move's variants.
    const [group, members] = [...reached()]
      .map(
        ([g, m]) => [g, m.filter((k) => k.startsWith("scene-talk."))] as const,
      )
      .sort((a, b) => b[1].length - a[1].length)[0]!;
    const sceneText = (key: string) => {
      const file = JSON.parse(
        readFileSync("data/english/parts/scene-talk.json", "utf8"),
      ) as { parts: { key: string; text: string }[] };
      return file.parts.find((part) => part.key === key)!.text;
    };
    const variants = members
      .filter((key) => !sceneText(key).includes("{"))
      .slice(0, 12)
      .map((key) => ({ key, text: sceneText(key), pieceKey: key }));
    expect(variants.length).toBeGreaterThanOrEqual(6);
    // The owner grades one piece of the group good, several times over a long sitting.
    const gradedKey = variants[0]!.key;
    const ledger: PartGradeLedger = {
      ...PART_GRADES,
      parts: {
        ...PART_GRADES.parts,
        [gradedKey]: {
          good: 12,
          bad: 0,
          fix: 0,
          sharedGood: 0,
          sharedBad: 0,
          sharedFix: 0,
        },
      },
    };
    const after = {
      ...CALIBRATION,
      reach: buildReach(pieces, ledger, classes),
    };
    const picks = (calibration: typeof CALIBRATION) =>
      Array.from(
        { length: 60 },
        (_, at) =>
          renderLine({
            seed: "grade-reach-test",
            surface: "dialogue",
            holderId: "speaker",
            bankKey: `scene-talk:${group}`,
            version: "scene-talk-v1",
            variants,
            facts: {},
            momentKey: `moment-${at}`,
            fallbackSourceId: "speaker",
            voice: { traits: {}, register: "scene-talk", calibration },
          })?.variantKey,
      );
    const before = picks({ ...CALIBRATION, reach: undefined });
    const graded = picks(after);
    expect(
      graded.filter((pick, at) => pick !== before[at]).length,
    ).toBeGreaterThan(0);
    // The graded piece's neighbors, not the piece, took the weight.
    expect(pieceFactor([variants[1]!.key], after)).toBeGreaterThan(
      pieceFactor([variants[1]!.key], { ...CALIBRATION, reach: undefined }),
    );
    // The same grades with the reach removed pick the same lines as before.
    expect(picks({ ...after, reach: undefined })).toEqual(before);
  });
});

// A line the owner liked is chosen more itself, not only its neighbors
// (owner, Oct 29: "I've given feedback on some good ones ... it's calibrate
// the entire engine"); one he rejected is chosen less where it still plays.
describe("the owner's grade weighs the graded line itself", () => {
  const without = { ...CALIBRATION, ledger: undefined };
  const counted = Object.entries(PART_GRADES.parts);
  const liked = counted
    .filter(([, row]) => row.good > 0 && row.bad + row.fix === 0)
    .map(([key]) => key);
  const rejected = counted
    .filter(([, row]) => row.good === 0 && row.bad + row.fix > 0)
    .map(([key]) => key);

  it("weighs every liked line more and every rejected line less than its numeric grade alone", () => {
    expect(liked.length).toBeGreaterThan(0);
    expect(rejected.length).toBeGreaterThan(0);
    for (const key of liked) {
      const own = pieceFactor([key], CALIBRATION);
      expect(own, key).toBeGreaterThanOrEqual(pieceFactor([key], without));
      if (!(key in CALIBRATION.pieces))
        expect(own, key).toBeGreaterThan(pieceFactor([key], without));
    }
    for (const key of rejected)
      expect(pieceFactor([key], CALIBRATION), key).toBeLessThanOrEqual(
        pieceFactor([key], without),
      );
  });

  it("gives the threats he liked a larger share of every threat a scene can make", () => {
    // Every scene-bank threat with no slots, as one move's variants: three
    // of them he liked ("The party has a long memory.", "You know how this
    // works.", "Then I'll find a candidate who listens."). The renderer draws
    // in proportion to these weights (`grounded-english.ts`).
    const bank = JSON.parse(
      readFileSync("data/english/parts/scene-talk.json", "utf8"),
    ) as {
      parts: {
        key: string;
        text: string;
        uses: { step: string; move: string }[];
      }[];
    };
    const variants = bank.parts
      .filter(
        (part) =>
          !part.text.includes("{") &&
          part.uses.some(
            (use) => use.step === "follow" && use.move === "threaten",
          ),
      )
      .map((part) => ({ key: part.key, text: part.text, pieceKey: part.key }));
    const favored = new Set(
      variants.filter((row) => liked.includes(row.key)).map((row) => row.key),
    );
    expect(favored.size, "threats he liked").toBeGreaterThanOrEqual(3);
    const share = (calibration: typeof CALIBRATION) => {
      const weighed = calibratedVariants(
        variants,
        {
          bankKey: "scene-talk:follow:threaten",
          register: "scene-talk",
          traits: {},
          textOf: (row) => row.text,
        },
        calibration,
      );
      const total = weighed.reduce((sum, row) => sum + (row.weight ?? 1), 0);
      const liked = weighed
        .filter((row) => favored.has(row.key))
        .reduce((sum, row) => sum + (row.weight ?? 1), 0);
      return liked / total;
    };
    const withGrades = share(CALIBRATION);
    const withoutGrades = share(without);
    process.stdout.write(
      `OWN GRADE the threats he liked: ${(withGrades * 100).toFixed(1)}% of the weight with his grades, ${(withoutGrades * 100).toFixed(1)}% without\n`,
    );
    expect(withGrades).toBeGreaterThan(withoutGrades);
  });
});
