import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SITUATION_LIBRARY } from "../../src/director/scheduling";
import {
  composeProfiles,
  GRADING_PROFILES,
  UNSUPPORTED_PARTS,
  stageWorldHeld,
  stageWorld,
  standInReason,
  typeStatuses,
} from "./grading-bench";

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

  it("composes each staged scene once per profile; profiles change the pieces, and the world is left as it was", () => {
    const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
    const held = stageWorldHeld({ id: "test", seed, days: 365 });
    const where = `${held.report.place.name}, seed ${seed}`;
    const profiles = GRADING_PROFILES.slice(0, 4);
    expect(profiles.length, where).toBe(4);
    const before = new Map(held.core.people);
    const composed = composeProfiles(
      held.core,
      held.director,
      held.report.staged,
      profiles,
    );
    // Every staged scene is composed once per profile.
    expect(composed.length, where).toBe(held.report.staged.length * 4);
    // The people are the very records they were: a profile is laid over for the compose only.
    for (const [id, person] of before)
      expect(held.core.people.get(id), `${where}: ${id}`).toBe(person);
    // Every composed line carries the pieces it is made of and the records that filled it.
    for (const scene of composed) {
      // Narration and journal lines carry records only; the missing piece ids are declared, not silent.
      expect(scene.unsupported, where).toEqual([...UNSUPPORTED_PARTS]);
      for (const line of [...scene.narration, ...scene.journal]) {
        expect(line.parts, where).toBeNull();
        expect(
          line.sourceRecordIds.length,
          `${where}: ${scene.momentId} ${scene.profile} "${line.text}"`,
        ).toBeGreaterThan(0);
      }
      for (const line of [...scene.opening, ...scene.replies, ...scene.lies]) {
        expect(
          line.parts?.length,
          `${where}: ${scene.momentId} ${scene.profile} "${line.text}"`,
        ).toBeGreaterThan(0);
        expect(
          line.sourceRecordIds.length,
          `${where}: ${scene.momentId} ${scene.profile} "${line.text}"`,
        ).toBeGreaterThan(0);
      }
    }
    // Two profiles on one scene choose different pieces, in at least one scene.
    const bySceneProfile = new Map<string, Map<string, string>>();
    for (const scene of composed) {
      const key = JSON.stringify([
        scene.opening.map((line) => line.parts),
        scene.replies.map((line) => [line.key, line.parts]),
      ]);
      const row = bySceneProfile.get(scene.momentId) ?? new Map();
      row.set(scene.profile, key);
      bySceneProfile.set(scene.momentId, row);
    }
    const differing = [...bySceneProfile.values()].filter(
      (row) => new Set(row.values()).size > 1,
    );
    expect(differing.length, where).toBeGreaterThan(0);
  }, 900_000);
});
