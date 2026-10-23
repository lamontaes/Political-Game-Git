import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SITUATION_LIBRARY } from "../../src/director/scheduling";
import { stageWorld, standInReason, typeStatuses } from "./stage-world";

describe("the grading bench's staging", () => {
  it("skips a type with no cause record, with why, and never invents one", () => {
    const types = [
      { key: "alive", causes: [{ match: { label: "x" } }] },
      { key: "waiting", causes: [{ awaitingProducer: "left-home" }] },
      { key: "quiet", causes: [{ match: { label: "y" } }] },
      { key: "bare", causes: [], awaiting: ["record:birthday-gathering"] },
    ] as unknown as Parameters<typeof typeStatuses>[0];
    const rows = typeStatuses(types, [{ typeKey: "alive" }]);
    expect(rows).toEqual([
      { key: "alive", staged: 1 },
      {
        key: "waiting",
        staged: 0,
        skipped: "awaiting producer: left-home",
      },
      {
        key: "quiet",
        staged: 0,
        skipped: "no cause record fired in this year",
      },
      {
        key: "bare",
        staged: 0,
        skipped: "awaiting record:birthday-gathering",
      },
    ]);
  });

  it("lists a scene with a raw id or a cast member with no record as stood in", () => {
    const has = (id: string) => id !== "person_ffffffffffffffff";
    expect(
      standInReason(["You are home."], ["person_a1b2c3d4e5f60718"], () => true),
    ).toBeNull();
    expect(standInReason(["Seat:office:house:12 passed."], [], has)).toMatch(
      /raw record id/,
    );
    expect(
      standInReason(["Organization_0123456789abcdef"], [], has),
    ).toBeNull();
    expect(
      standInReason(["organization_0123456789abcdef closed."], [], has),
    ).toMatch(/raw record id/);
    expect(standInReason(["Fine."], ["person_ffffffffffffffff"], has)).toMatch(
      /no person record/,
    );
  });

  it("stages a drawn place's year from the director, each scene with its cause record and cast", () => {
    const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
    const report = stageWorld({ id: "test", seed, days: 365 });
    const where = `${report.place.name}, seed ${seed}`;
    expect(
      report.types.map((row) => row.key),
      where,
    ).toEqual(SITUATION_LIBRARY.types.map((row) => row.key));
    // Every type is staged or skipped with a reason: nothing silent.
    for (const row of report.types)
      expect(row.staged > 0 || !!row.skipped, `${where}: ${row.key}`).toBe(
        true,
      );
    expect(report.staged.length, where).toBeGreaterThan(0);
    for (const scene of report.staged) {
      expect(scene.causeId, where).toBeTruthy();
      expect(
        scene.castIds.length,
        `${where}: ${scene.momentId}`,
      ).toBeGreaterThan(0);
    }
  }, 600_000);
});
