import { describe, expect, it } from "vitest";
import {
  actionDeclarations,
  auditConversationSnapshot,
  recordChanges,
} from "./audit";
import { createNewGameWorld } from "../../src/presentation/new-game";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";

describe("Conversation audit preserves evidence", () => {
  it("finds additions, removals and changed records despite equal collection lengths", () => {
    expect(
      recordChanges(
        {
          events: [
            { id: "kept", value: 1 },
            { id: "gone", value: 2 },
          ],
        },
        {
          events: [
            { id: "new", value: 3 },
            { id: "kept", value: 4 },
          ],
        },
      ).map(({ id, kind }) => ({ id, kind })),
    ).toEqual([
      { id: "kept", kind: "changed" },
      { id: "gone", kind: "removed" },
      { id: "new", kind: "added" },
    ]);
    expect(
      recordChanges(
        { events: [{ id: "a" }, { id: "b" }] },
        { events: [{ id: "b" }, { id: "a" }] },
      ),
    ).toEqual([]);
    expect(
      recordChanges(
        { people: { a: { id: "a", name: "Before" } } },
        { people: { a: { id: "a", name: "After" } } },
      )[0]?.kind,
    ).toBe("changed");
  });

  it("rejects duplicate identities instead of hiding a record", () => {
    expect(() =>
      recordChanges({}, { events: [{ id: "a" }, { id: "a" }] }),
    ).toThrow(/Duplicate record ID/);
  });

  it("keeps dynamic source declarations distinct from executed actions", () => {
    const declarations = actionDeclarations(process.cwd());
    expect(
      declarations.some((row) => row.key === "greet" && !row.dynamic),
    ).toBe(true);
    expect(
      declarations.some((row) => row.key === "running:open" && !row.dynamic),
    ).toBe(true);
    expect(declarations.some((row) => row.dynamic)).toBe(true);
    expect(declarations.every((row) => row.line > 0)).toBe(true);
  });

  it("reports absent rooms without manufacturing a person or changing the save", () => {
    const game = createNewGameWorld({
      seed: "team8-conversation-audit-alone",
      startKind: "custom",
      placeKey: "1874780",
      startAge: 35,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      givenName: null,
      familyName: null,
    });
    const world = openOrdinaryLife(game.world, game.playerPersonId);
    const before = JSON.stringify(world);
    const report = auditConversationSnapshot(world, game.playerPersonId);
    expect(JSON.stringify(world)).toBe(before);
    expect(
      report.subjects.find((row) => row.subject === "shared-intake-checklist")
        ?.status,
    ).toBe("no-production-room-in-this-snapshot");
    expect(report.counts.offeredAttempts).toBe(
      report.counts.recordsWritten +
        report.counts.noRecordChange +
        report.counts.refused,
    );
    expect(report.counts.recordsWritten).toBeGreaterThan(0);
    expect(
      report.rows.some((row) =>
        row.changes.some((change) => change.collection === "events"),
      ),
    ).toBe(true);
  });
});
