import { describe, expect, it } from "vitest";

import { deserializeWorld, serializeWorld } from "../simulation";
import { createNewGameWorld } from "./new-game";
import { renderGroundedEnglish } from "./grounded-english";
import {
  WORK_START_JOURNAL_BANK,
  buildSavedWorkStartJournalPacket,
  grammaticalWorkRolePhrase,
} from "./work-start-journal-english";

function savedWorkStart(seed: string) {
  const game = createNewGameWorld({
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
  });
  const world = deserializeWorld(serializeWorld(game.world));
  const ownRelationships = new Set(
    world.history.workRelationships
      .filter((row) => row.personId === game.playerPersonId)
      .map((row) => row.id),
  );
  const status = world.history.workStatuses.find(
    (row) =>
      ownRelationships.has(row.workRelationshipId) && row.status === "active",
  );
  expect(status).toBeDefined();
  return { world, personId: game.playerPersonId, status: status! };
}

const temporalOnly = {
  ...WORK_START_JOURNAL_BANK,
  variants: WORK_START_JOURNAL_BANK.variants.filter(
    (variant) => variant.key === "that-month",
  ),
};

describe("saved work-start Journal English", () => {
  it("renders Spencer's approved plain line from saved facts and preserves the World", () => {
    const { world, personId, status } = savedWorkStart(
      "grounded-english-proof-2026-09-24",
    );
    const before = JSON.stringify(world);
    const built = buildSavedWorkStartJournalPacket(world, personId, status.id, {
      establishedYear: null,
    });
    expect(built.kind).toBe("packet");
    if (built.kind !== "packet") return;
    expect(built.packet.stage).toBe("active");
    const result = renderGroundedEnglish(built.packet, WORK_START_JOURNAL_BANK);
    expect(result).toMatchObject({
      kind: "rendered",
      variantKey: "plain",
      text: "I started work at Neighborhood Market as a store assistant.",
    });
    if (result.kind === "rendered") {
      expect(result.sourceRecordIds).toEqual(
        expect.arrayContaining([
          status.id,
          built.packet.facts.employer!.sourceRecordIds[0],
          built.packet.facts["role-phrase"]!.sourceRecordIds[0],
        ]),
      );
      expect(result.usedFactKeys).toEqual(["employer", "role-phrase"]);
    }
    expect(JSON.stringify(world)).toBe(before);
  });

  it("only offers 'That [month]' after the caller has established the saved year", () => {
    const { world, personId, status } = savedWorkStart(
      "grounded-english-proof-2026-09-24",
    );
    const plain = buildSavedWorkStartJournalPacket(world, personId, status.id, {
      establishedYear: null,
    });
    const wrongYear = buildSavedWorkStartJournalPacket(
      world,
      personId,
      status.id,
      { establishedYear: "2006" },
    );
    const established = buildSavedWorkStartJournalPacket(
      world,
      personId,
      status.id,
      { establishedYear: status.effectiveAt.slice(0, 4) },
    );
    expect(plain.kind).toBe("packet");
    expect(wrongYear.kind).toBe("packet");
    expect(established.kind).toBe("packet");
    if (
      plain.kind !== "packet" ||
      wrongYear.kind !== "packet" ||
      established.kind !== "packet"
    )
      return;
    expect(wrongYear.packet.stage).toBe("active");
    expect(established.packet.stage).toBe("active-year-established");
    expect(renderGroundedEnglish(plain.packet, temporalOnly)).toMatchObject({
      kind: "missing-context",
    });
    const temporal = renderGroundedEnglish(established.packet, temporalOnly);
    expect(temporal).toMatchObject({
      kind: "rendered",
      variantKey: "that-month",
      text: "That March, I started work at Neighborhood Market as a store assistant.",
    });
    if (temporal.kind === "rendered") {
      expect(temporal.usedFactKeys).toEqual([
        "month",
        "employer",
        "role-phrase",
      ]);
      expect(temporal.sourceRecordIds).toContain(status.id);
    }
    expect(
      renderGroundedEnglish(established.packet, WORK_START_JOURNAL_BANK),
    ).toEqual(
      renderGroundedEnglish(established.packet, WORK_START_JOURNAL_BANK),
    );
  });

  it("derives a different month from another serialized life", () => {
    const { world, personId, status } = savedWorkStart(
      "work-start-journal-april",
    );
    expect(status.effectiveAt.slice(5, 7)).toBe("02");
    const built = buildSavedWorkStartJournalPacket(world, personId, status.id, {
      establishedYear: status.effectiveAt.slice(0, 4),
    });
    expect(built.kind).toBe("packet");
    if (built.kind !== "packet") return;
    const rendered = renderGroundedEnglish(built.packet, temporalOnly);
    expect(rendered.kind).toBe("rendered");
    if (rendered.kind === "rendered")
      expect(rendered.text).toMatch(/^That February, I started work at /);
  });

  it("uses grammatical occupation phrases and refuses an unreviewed formal title", () => {
    expect(grammaticalWorkRolePhrase("Store assistant")).toBe(
      "a store assistant",
    );
    expect(grammaticalWorkRolePhrase("Engineer")).toBe("an engineer");
    expect(grammaticalWorkRolePhrase("Chief of Staff")).toBeNull();
    const { world, personId, status } = savedWorkStart(
      "grounded-english-proof-2026-09-24",
    );
    const otherPersonId = world.personOrder.find((id) => id !== personId)!;
    expect(
      buildSavedWorkStartJournalPacket(world, otherPersonId, status.id, {
        establishedYear: null,
      }),
    ).toMatchObject({ kind: "missing-context" });
  });
});
