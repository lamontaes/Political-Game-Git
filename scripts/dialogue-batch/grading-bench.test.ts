import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  composeGroundedLine,
  type ComposedLineBank,
} from "../../src/english/english-composition";
import type { GroundedEnglishPacket } from "../../src/english/grounded-english";
import {
  CALIBRATION,
  lengthFactor,
  pieceFactor,
  type CalibrationTable,
} from "../../src/english/calibration";
import {
  foldCalibration,
  isBenchGrade,
  type GradedBatch,
} from "./apply-grades";
import {
  BARE_ACK,
  composeBench,
  DATE_IN_SPEECH,
  dedupe,
  GRADING_PROFILES,
  loadWorld,
  orderForPage,
  saveWorld,
  type DedupeItem,
} from "./grading-bench";
import { stageWorldHeld } from "./stage-world";

const item = (over: Partial<DedupeItem>): DedupeItem => ({
  sceneId: "s1",
  typeKey: "celebration",
  castIds: ["a", "b"],
  profileId: "warm",
  pieces: ["p1", "p2"],
  choiceSets: [],
  phrases: ["one", "two"],
  register: "conversation",
  ...over,
});

describe("the bench's dedupe rules (Order 2, section 2)", () => {
  it("drops a profile that reads identically on the same scene", () => {
    const out = dedupe(
      [
        item({}),
        item({ profileId: "cold" }),
        item({ profileId: "cold", pieces: ["p1", "p9"], phrases: ["three"] }),
      ],
      3,
    );
    expect(out.dropped["identical-profile"]).toBe(1);
    expect(out.kept.map((row) => row.profileId)).toEqual(["warm", "cold"]);
  });

  it("keeps no two items with the same type, cast and pieces", () => {
    const out = dedupe(
      [item({}), item({ sceneId: "s2", phrases: ["other"] })],
      3,
    );
    expect(out.dropped["duplicate-item"]).toBe(1);
  });

  it("keeps no two choice sets with the same four replies", () => {
    const out = dedupe(
      [
        item({ choiceSets: ["a / b / c / d"] }),
        item({
          sceneId: "s2",
          pieces: ["q"],
          choiceSets: ["a / b / c / d"],
          phrases: ["x"],
        }),
      ],
      3,
    );
    expect(out.dropped["same-choice-set"]).toBe(1);
  });

  it("caps a situation type per profile", () => {
    const rows = [1, 2, 3, 4].map((n) =>
      item({ sceneId: `s${n}`, pieces: [`p${n}`], phrases: [`say ${n}`] }),
    );
    const out = dedupe(rows, 3);
    expect(out.kept).toHaveLength(3);
    expect(out.dropped["type-cap"]).toBe(1);
    expect(dedupe(rows, 3).kept.length).toBe(3);
    // Another profile has its own count.
    const other = dedupe(
      [
        ...rows,
        item({
          sceneId: "s9",
          profileId: "cold",
          pieces: ["z"],
          phrases: ["z"],
        }),
      ],
      3,
    );
    expect(other.kept).toHaveLength(4);
  });

  it("grades a phrase once per page", () => {
    const rows = [
      item({ phrases: ["Good to see you."] }),
      item({ sceneId: "s2", pieces: ["q"], phrases: ["good to see you"] }),
      item({
        sceneId: "s3",
        pieces: ["r"],
        phrases: ["Good to see you.", "I lost my job."],
      }),
    ];
    const result = dedupe(rows, 3);
    // An item with nothing new to grade is dropped; one with a new line is
    // kept, its repeated line marked as graded above.
    expect(result.dropped["repeated-phrase"]).toBe(1);
    expect(result.kept).toHaveLength(2);
    expect([...result.repeats.get(result.kept[1]!)!]).toHaveLength(1);
    expect(dedupe(rows, 3, false).kept).toHaveLength(3);
  });

  it("orders the page so neighbors differ in type and register", () => {
    const rows = [
      { typeKey: "a", register: "x" },
      { typeKey: "a", register: "x" },
      { typeKey: "b", register: "y" },
      { typeKey: "b", register: "y" },
    ];
    const out = orderForPage(rows);
    for (let at = 1; at < out.length; at += 1)
      expect(out[at]!.typeKey).not.toBe(out[at - 1]!.typeKey);
  });

  it("names a date in speech and a bare acknowledgment", () => {
    expect(DATE_IN_SPEECH.test("I started on March 3.")).toBe(true);
    expect(DATE_IN_SPEECH.test("It was 2019.")).toBe(true);
    expect(DATE_IN_SPEECH.test("A few months ago.")).toBe(false);
    expect(BARE_ACK.test("Okay.")).toBe(true);
    expect(BARE_ACK.test("Okay, what happened?")).toBe(false);
  });
});

const batch = (rows: unknown[]): GradedBatch => ({
  batch: {
    id: "batch-test",
    items: [
      {
        i: 0,
        parts: ["a", "b"],
        lines: [
          {
            n: 1,
            parts: ["piece.one"],
            move: "condole",
            previousMove: "deliver-news",
            register: "conversation",
            bearing: "tender",
            speakerTraits: { "personality-v1:facet-friendly": 2 },
            words: 10,
            sentences: 1,
          },
        ],
      },
    ],
  } as never,
  grades: { grades: rows } as never,
});

describe("the grade fold (Order 2, section 5)", () => {
  it("recognizes the bench shape alongside the old ones", () => {
    expect(isBenchGrade({ i: 0, line: 1, axes: { naturalness: 4 } })).toBe(
      true,
    );
    expect(isBenchGrade({ i: 0, axes: { formality: "good" } })).toBe(false);
    expect(isBenchGrade({ i: 0, grade: "good" })).toBe(false);
  });

  it("moves piece, move-pair, trait and register weights a small step", () => {
    const folded = foldCalibration(
      [
        batch([
          {
            i: 0,
            line: 1,
            axes: { naturalness: 2, prose: 2, traitFit: 5, length: "too long" },
            prefer: "piece.better",
          },
        ]),
      ],
      // From an empty table, so the step is measured, not the seeded pulls.
      { ...CALIBRATION, traits: {}, registers: {} },
    );
    // The shipped table already holds the owner's folded batches.
    expect(folded.folded).toEqual([...CALIBRATION.folded, "batch-test"]);
    expect(folded.pieces["piece.one"]).toEqual({ mean: 2, count: 1 });
    expect(folded.pieces["piece.better"]).toEqual({ mean: 5, count: 1 });
    expect(folded.movePairs["deliver-news>condole"]).toEqual({
      mean: 2,
      count: 1,
    });
    const step = CALIBRATION.parameters.step!.value;
    expect(
      folded.traits["personality-v1:facet-friendly"]!.bearing!.tender,
    ).toBeCloseTo(step, 6);
    expect(folded.registers.conversation!.targetWords).toBeCloseTo(
      10 * (1 - step),
      6,
    );
    expect(folded.traits["personality-v1:facet-friendly"]!.length).toBeCloseTo(
      -step,
      6,
    );
    // Folding the same batch again changes nothing.
    expect(foldCalibration([batch([])], folded)).toEqual(folded);
    // The shipped table is untouched.
    expect(CALIBRATION.pieces["piece.one"]).toBeUndefined();
  });

  it("keeps a running mean over grades", () => {
    const once = foldCalibration(
      [batch([{ i: 0, line: 1, axes: { naturalness: 5 } }])],
      CALIBRATION,
    );
    const again: CalibrationTable = { ...once, folded: [] };
    const twice = foldCalibration(
      [batch([{ i: 0, line: 1, axes: { naturalness: 1 } }])],
      again,
    );
    expect(twice.pieces["piece.one"]).toEqual({ mean: 3, count: 2 });
  });

  it("rejects a grade outside 1 to 5 and a line the item lacks", () => {
    expect(() =>
      foldCalibration(
        [batch([{ i: 0, line: 1, axes: { naturalness: 6 } }])],
        CALIBRATION,
      ),
    ).toThrow(/not 1 to 5/);
    expect(() =>
      foldCalibration(
        [batch([{ i: 0, line: 7, axes: { naturalness: 3 } }])],
        CALIBRATION,
      ),
    ).toThrow(/no line 7/);
  });
});

describe("the engine reads the table (weights only)", () => {
  const packet = {
    surface: "dialogue",
    momentKey: "m1",
    worldSeed: "seed",
    bankVersion: "v1",
    stage: "default",
    sourceRecordIds: ["r1"],
    facts: {},
    knowledge: [],
  } as unknown as GroundedEnglishPacket;
  const bank = (keys: string[]): ComposedLineBank => ({
    key: "bank",
    version: "v1",
    surface: "dialogue",
    act: "agree",
    parts: {
      core: {
        variants: keys.map((key) => ({
          key,
          kind: "template" as const,
          text: `Line ${key}.`,
        })),
      },
    },
  });
  const keys = ["a", "b", "c", "d", "e", "f"];

  it("changes nothing when the table is neutral", () => {
    const base = composeGroundedLine(packet, bank(keys));
    const neutral = composeGroundedLine(packet, bank(keys), {
      calibration: CALIBRATION,
    });
    expect(neutral).toEqual(base);
    expect(pieceFactor(["bank:core:a"])).toBe(1);
    expect(lengthFactor("conversation", 5, undefined)).toBe(1);
  });

  it("chooses a low-graded piece less and a high-graded piece more", () => {
    const pieces: Record<string, { mean: number; count: number }> = {};
    for (const key of keys)
      pieces[`bank:core:${key}`] = { mean: key === "a" ? 1 : 5, count: 10 };
    const table = { ...CALIBRATION, pieces } as CalibrationTable;
    const tally = (calibration: CalibrationTable) => {
      const counts: Record<string, number> = {};
      for (let n = 0; n < 300; n += 1) {
        const out = composeGroundedLine(
          { ...packet, momentKey: `m${n}` },
          bank(keys),
          { calibration },
        );
        if (out.kind === "rendered") {
          const key = out.parts[0]!.variantKey;
          counts[key] = (counts[key] ?? 0) + 1;
        }
      }
      return counts;
    };
    const before = tally(CALIBRATION);
    const after = tally(table);
    expect(after.a!).toBeLessThan(before.a!);
    expect(after.a!).toBeLessThan(after.b!);
    // Deterministic: the same table gives the same picks.
    expect(tally(table)).toEqual(after);
  });
});

describe("the bench composes each staged scene once per profile", () => {
  it("words every line from pieces and records, profiles change the pieces, and the world is left as it was", () => {
    const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
    const held = stageWorldHeld({ id: "test", seed, days: 365 });
    const where = `${held.report.place.name}, seed ${seed}`;
    const dir = mkdtempSync(join(tmpdir(), "grading-bench-"));
    try {
      const path = join(dir, "world");
      saveWorld(path, held.core, held.director, {
        playerId: held.playerId,
        placeName: held.report.place.name,
        seed,
      });
      const profiles = GRADING_PROFILES.slice(0, 4);
      expect(profiles.length, where).toBe(4);
      const run = composeBench(path, profiles);
      expect(run.items.length, where).toBeGreaterThan(0);
      // Every scene composed is composed once under each profile.
      const byScene = new Map<string, Map<string, string>>();
      for (const item of run.items) {
        const row = byScene.get(item.sceneId) ?? new Map<string, string>();
        expect(row.has(item.profileId), `${where}: ${item.sceneId}`).toBe(
          false,
        );
        row.set(item.profileId, JSON.stringify(item.pieces));
        byScene.set(item.sceneId, row);
      }
      for (const [sceneId, row] of byScene)
        expect([...row.keys()].sort(), `${where}: ${sceneId}`).toEqual(
          profiles.map((profile) => profile.id).sort(),
        );
      // Every line cites the records that filled it; every spoken line names its pieces.
      for (const item of run.items)
        for (const line of item.lines) {
          const what = `${where}: ${item.sceneId} ${item.profileId} "${line.text}"`;
          expect(line.slotRecordIds.length, what).toBeGreaterThan(0);
          if (line.role !== "narrator" && line.role !== "journal")
            expect(line.parts.length, what).toBeGreaterThan(0);
        }
      // Two profiles on one scene choose different pieces, in at least one scene.
      const differing = [...byScene.values()].filter(
        (row) => new Set(row.values()).size > 1,
      );
      expect(differing.length, where).toBeGreaterThan(0);
      // A profile is laid over for the compose only: the people keep their own traits.
      const fresh = loadWorld(path);
      for (const [id, person] of run.first.core.people)
        expect(person.traits, `${where}: ${id}`).toEqual(
          fresh.core.people.get(id)?.traits,
        );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 900_000);
});
