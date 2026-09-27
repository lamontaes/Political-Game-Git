import { describe, expect, it } from "vitest";

import {
  createLegislativeScenario,
  currentMeasureProvisions,
  deserializeWorld,
  organizationProfileAt,
  serializeWorld,
  workRoleAt,
} from "../simulation";
import { fileDraft } from "./legislation-docket";
import { createNewGameWorld } from "./new-game";
import {
  renderGroundedEnglish,
  type AuthoredEnglishBank,
  type GroundedEnglishPacket,
} from "./grounded-english";

/** A real generated and saved life, not a manually invented story packet. */
function savedWorkStart() {
  const game = createNewGameWorld({
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "grounded-english-proof-2026-09-24",
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
  const relationship = world.history.workRelationships.find(
    (row) => row.id === status!.workRelationshipId,
  );
  expect(relationship?.organizationId).toBeTruthy();
  const asOf = {
    asOfDate: status!.effectiveAt,
    historySequenceExclusive: world.history.nextSequence,
  };
  const employer = organizationProfileAt(
    world,
    relationship!.organizationId!,
    asOf,
  );
  const role = workRoleAt(world, relationship!.id, asOf);
  expect(employer?.name).toBeTruthy();
  expect(role?.title).toBeTruthy();
  const tendency = world.history.personalityTendencies.find(
    (row) => row.personId === game.playerPersonId,
  );
  expect(tendency).toBeDefined();

  const packet: GroundedEnglishPacket = {
    surface: "journal",
    momentKey: status!.id,
    worldSeed: world.seed,
    bankVersion: "1",
    stage: status!.status,
    sourceRecordIds: [status!.id, relationship!.id],
    facts: {
      employer: { text: employer!.name, sourceRecordIds: [employer!.id] },
      // The packet builder supplies a grammatical role phrase. The renderer
      // never changes the source title's spelling or guesses an article.
      role: {
        text: role!.title.toLocaleLowerCase("en-US"),
        sourceRecordIds: [role!.id],
      },
    },
    viewer: {
      personId: game.playerPersonId,
      traits: {
        "recorded-voice": {
          text: tendency!.expressionKey,
          sourceRecordIds: [tendency!.id],
        },
      },
    },
    knowledge: [
      {
        personId: game.playerPersonId,
        factKey: "employer",
        sourceRecordIds: [status!.id],
      },
      {
        personId: game.playerPersonId,
        factKey: "role",
        sourceRecordIds: [status!.id],
      },
    ],
  };
  return { packet, status, relationship, employer, role, tendency };
}

const JOURNAL_BANK: AuthoredEnglishBank = {
  key: "work-start-journal",
  version: "1",
  surface: "journal",
  variants: [
    {
      key: "plain-first-person",
      kind: "template",
      stages: ["active"],
      text: "I started work at {{employer}} as a {{role}}.",
    },
  ],
};

describe("grounded English realization", () => {
  it("assembles the owner-reviewed work line from a saved life and returns its sources", () => {
    const { packet, status, relationship, employer, role } = savedWorkStart();
    const first = renderGroundedEnglish(packet, JOURNAL_BANK);
    const replay = renderGroundedEnglish(structuredClone(packet), JOURNAL_BANK);
    expect(first).toEqual(replay);
    expect(first.kind).toBe("rendered");
    if (first.kind !== "rendered") return;
    expect(first.text).toBe(
      "I started work at Neighborhood Market as a store assistant.",
    );
    expect(first.variantKey).toBe("plain-first-person");
    expect(first.usedFactKeys).toEqual(["employer", "role"]);
    expect(first.sourceRecordIds).toEqual(
      expect.arrayContaining([
        status!.id,
        relationship!.id,
        employer!.id,
        role!.id,
      ]),
    );
  });

  it("refuses missing facts, knowledge, and personality instead of filling them in", () => {
    const { packet } = savedWorkStart();
    const noRole = renderGroundedEnglish(
      { ...packet, facts: { ...packet.facts, role: undefined } },
      JOURNAL_BANK,
    );
    expect(noRole).toMatchObject({ kind: "missing-context" });
    if (noRole.kind === "missing-context")
      expect(noRole.reasons.join(" ")).toContain(
        "fact role lacks saved support",
      );

    const noKnowledge = renderGroundedEnglish(
      { ...packet, knowledge: [] },
      JOURNAL_BANK,
    );
    expect(noKnowledge).toMatchObject({ kind: "missing-context" });
    if (noKnowledge.kind === "missing-context")
      expect(noKnowledge.reasons.join(" ")).toContain(
        "viewer lacks recorded knowledge of employer",
      );

    const voiceBank: AuthoredEnglishBank = {
      ...JOURNAL_BANK,
      variants: [
        {
          ...JOURNAL_BANK.variants[0]!,
          requiresTraits: [{ holder: "viewer", traitKey: "recorded-voice" }],
        },
      ],
    };
    const withTrait = renderGroundedEnglish(packet, voiceBank);
    expect(withTrait).toMatchObject({ kind: "rendered" });
    if (withTrait.kind === "rendered")
      expect(withTrait.sourceRecordIds).toContain(
        packet.viewer!.traits["recorded-voice"]!.sourceRecordIds[0],
      );
    const noTrait = renderGroundedEnglish(
      { ...packet, viewer: { ...packet.viewer!, traits: {} } },
      voiceBank,
    );
    expect(noTrait).toMatchObject({ kind: "missing-context" });
    if (noTrait.kind === "missing-context")
      expect(noTrait.reasons.join(" ")).toContain(
        "viewer lacks recorded trait recorded-voice",
      );
  });

  it("keeps surface registers separate and requires saved copy for documents", () => {
    const { packet } = savedWorkStart();
    expect(
      renderGroundedEnglish(packet, { ...JOURNAL_BANK, surface: "news" }),
    ).toMatchObject({
      kind: "missing-context",
    });
    const scenario = createLegislativeScenario("kentucky");
    const jurisdictionId =
      scenario.world.history.legislativeMeasures![0]!.jurisdictionId;
    const filed = fileDraft(scenario.world, {
      scenarioKey: "kentucky",
      playerPersonId: scenario.playerPersonId,
      jurisdictionId,
      familyKey: "transit-access",
      variantKey: "enrollment-fare-relief",
    });
    const savedWorld = deserializeWorld(serializeWorld(filed.world));
    const provision = currentMeasureProvisions(
      savedWorld,
      filed.bill.measureId,
    )[0]!;
    const billPacket: GroundedEnglishPacket = {
      surface: "bill-document",
      momentKey: provision.id,
      worldSeed: savedWorld.seed,
      bankVersion: "1",
      stage: filed.bill.stage,
      sourceRecordIds: [filed.bill.measureId, provision.eventId],
      facts: {
        body: {
          text: provision.text,
          sourceRecordIds: [provision.id],
        },
      },
      knowledge: [],
    };
    expect(
      renderGroundedEnglish(billPacket, {
        key: "bill-copy",
        version: "1",
        surface: "bill-document",
        variants: [{ key: "unsafe", kind: "template", text: "{{body}}" }],
      }),
    ).toMatchObject({ kind: "missing-context" });
    expect(
      renderGroundedEnglish(billPacket, {
        key: "bill-copy",
        version: "1",
        surface: "bill-document",
        variants: [{ key: "saved", kind: "verbatim", factKey: "body" }],
      }),
    ).toMatchObject({ kind: "rendered", text: provision.text });
  });

  it("chooses variants deterministically and ignores bank array order", () => {
    const { packet } = savedWorkStart();
    const variants = [
      { key: "a", kind: "template", text: "I started work at {{employer}}." },
      { key: "b", kind: "template", text: "I began work at {{employer}}." },
    ] as const;
    const bank = { ...JOURNAL_BANK, variants };
    const first = renderGroundedEnglish(packet, bank);
    expect(first).toEqual(
      renderGroundedEnglish(packet, {
        ...bank,
        variants: [...variants].reverse(),
      }),
    );
    expect(first.kind).toBe("rendered");
    expect(
      renderGroundedEnglish({ ...packet, bankVersion: "old" }, bank),
    ).toMatchObject({ kind: "missing-context" });
  });

  it("uses reviewed relative frequency without changing a saved moment's words", () => {
    const { packet } = savedWorkStart();
    const bank: AuthoredEnglishBank = {
      ...JOURNAL_BANK,
      variants: [
        { key: "usual", kind: "template", text: "First.", weight: 3 },
        { key: "rare", kind: "template", text: "Second.", weight: 1 },
      ],
    };
    const results = Array.from({ length: 64 }, (_, index) =>
      renderGroundedEnglish({ ...packet, momentKey: `voice-${index}` }, bank),
    );
    expect(
      results.filter(
        (result) => result.kind === "rendered" && result.variantKey === "usual",
      ).length,
    ).toBeGreaterThan(
      results.filter(
        (result) => result.kind === "rendered" && result.variantKey === "rare",
      ).length,
    );
    expect(results[0]).toEqual(
      renderGroundedEnglish({ ...packet, momentKey: "voice-0" }, bank),
    );
    expect(
      renderGroundedEnglish(packet, {
        ...bank,
        variants: [{ ...bank.variants[0]!, weight: 0 }],
      }),
    ).toMatchObject({ kind: "missing-context" });
  });
});
