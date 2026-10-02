import { describe, expect, it } from "vitest";
import {
  coupleStageConsent,
  coupleStageOptions,
  coupleYearsTogether,
} from "./couple-stage-contract";
import { addDays, makeIsoDate } from "./dates";
import { evaluateDecision } from "./decisions";
import { createDemoWorld } from "./demo";
import { createStableId } from "./ids";
import type { DecisionEvaluation } from "./types";

function actorPacket(
  result: Pick<DecisionEvaluation, "outcomeKind" | "selectedOptionKey">,
  actor: "first" | "second",
) {
  return {
    ...result,
    context: {
      actorPersonId: createStableId("person", `a136-contract:${actor}`),
    },
  };
}

describe("couple stage duration contract", () => {
  it("admits dating move-in at 183 days, using the inherited 365.25-day year", () => {
    const startedAt = makeIsoDate("2025-01-01");
    const before = addDays(startedAt, 182);
    const after = addDays(startedAt, 183);
    expect(coupleYearsTogether(startedAt, before)).toBe(182 / 365.25);
    expect(coupleYearsTogether(startedAt, after)).toBe(183 / 365.25);
    expect(
      coupleStageOptions("dating", startedAt, before).map((o) => o.key),
    ).toEqual(["stay", "break-up", "marry"]);
    expect(
      coupleStageOptions("dating", startedAt, after).map((o) => o.key),
    ).toEqual(["stay", "break-up", "move-in", "marry"]);
  });

  it("admits cohabiting marriage at 366 days rather than 365", () => {
    const startedAt = makeIsoDate("2025-01-01");
    expect(
      coupleStageOptions("cohabiting", startedAt, addDays(startedAt, 365)).map(
        (o) => o.key,
      ),
    ).toEqual(["stay", "separate"]);
    expect(
      coupleStageOptions("cohabiting", startedAt, addDays(startedAt, 366)).map(
        (o) => o.key,
      ),
    ).toEqual(["stay", "separate", "marry"]);
  });

  it("omits duration-dependent options for missing or future starts", () => {
    const asOfDate = makeIsoDate("2026-01-01");
    for (const startedAt of [null, addDays(asOfDate, 1)]) {
      expect(coupleYearsTogether(startedAt, asOfDate)).toBeNull();
      expect(
        coupleStageOptions("dating", startedAt, asOfDate).map((o) => o.key),
      ).toEqual(["stay", "break-up", "marry"]);
      expect(
        coupleStageOptions("cohabiting", startedAt, asOfDate).map((o) => o.key),
      ).toEqual(["stay", "separate"]);
    }
  });
});

describe("couple stage consequence admission contract", () => {
  it("does not authorize break-up from independently evaluated true ties (Audit A124)", () => {
    const world = createDemoWorld("a136-couple-stage-true-tie");
    const actors = Object.values(world.people).slice(0, 2);
    expect(actors).toHaveLength(2);
    const options = coupleStageOptions("dating", null, world.currentDate);
    const results = actors.map((actor) =>
      evaluateDecision(world, {
        stableKey: `a136-couple-tie:${actor.id}`,
        decisionType: "couple-stage",
        actorPersonId: actor.id,
        cutoff: {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        },
        subject: {
          kind: "context:situation",
          key: "a136-couple-tie",
          entityId: null,
        },
        options,
        constraints: [],
        considerations: [],
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      }),
    );
    const first = results[0]!;
    const second = results[1]!;
    expect(first.context.actorPersonId).not.toBe(second.context.actorPersonId);
    for (const result of results) {
      expect(
        result.optionEvaluations.every(
          (option) =>
            option.available &&
            option.preference === "mixed" &&
            option.randomContribution === "none",
        ),
      ).toBe(true);
    }
    // Keep this assertion while the shared evaluator still breaks ties by key.
    // Contract admission must not turn a true tie into either actor's consent.
    expect(
      coupleStageConsent({
        stage: "dating",
        startedAt: null,
        asOfDate: world.currentDate,
        optionKey: "break-up",
        first,
        second,
      }),
    ).toBe(false);
  });

  it("requires two independently supplied matching selections for move-in and marriage", () => {
    const startedAt = makeIsoDate("2025-01-01");
    const asOfDate = addDays(startedAt, 366);
    for (const [stage, optionKey] of [
      ["dating", "move-in"],
      ["dating", "marry"],
      ["cohabiting", "marry"],
    ] as const) {
      const first = {
        outcomeKind: "selected",
        selectedOptionKey: optionKey,
      } as const;
      const second = {
        outcomeKind: "selected",
        selectedOptionKey: optionKey,
      } as const;
      const stay = {
        outcomeKind: "selected",
        selectedOptionKey: "stay",
      } as const;
      expect(
        coupleStageConsent({
          stage,
          startedAt,
          asOfDate,
          optionKey,
          first: actorPacket(first, "first"),
          second: actorPacket(second, "second"),
        }),
      ).toBe(true);
      expect(
        coupleStageConsent({
          stage,
          startedAt,
          asOfDate,
          optionKey,
          first: actorPacket(first, "first"),
          second: actorPacket(stay, "second"),
        }),
      ).toBe(false);
      expect(
        coupleStageConsent({
          stage,
          startedAt,
          asOfDate,
          optionKey,
          first: actorPacket(stay, "first"),
          second: actorPacket(second, "second"),
        }),
      ).toBe(false);
    }
  });

  it("rejects one actor's selected packet supplied twice for bilateral choices", () => {
    const startedAt = makeIsoDate("2025-01-01");
    const asOfDate = addDays(startedAt, 366);
    for (const [stage, optionKey] of [
      ["dating", "move-in"],
      ["dating", "marry"],
      ["cohabiting", "marry"],
    ] as const) {
      const selected = actorPacket(
        { outcomeKind: "selected", selectedOptionKey: optionKey },
        "first",
      );
      expect(
        coupleStageConsent({
          stage,
          startedAt,
          asOfDate,
          optionKey,
          first: selected,
          second: selected,
        }),
      ).toBe(false);
    }
  });

  it("allows either person's selected break-up or separation", () => {
    const asOfDate = makeIsoDate("2026-01-01");
    for (const [stage, optionKey] of [
      ["dating", "break-up"],
      ["cohabiting", "separate"],
      ["married", "separate"],
    ] as const) {
      const leave = {
        outcomeKind: "selected",
        selectedOptionKey: optionKey,
      } as const;
      const stay = {
        outcomeKind: "selected",
        selectedOptionKey: "stay",
      } as const;
      expect(
        coupleStageConsent({
          stage,
          startedAt: null,
          asOfDate,
          optionKey,
          first: actorPacket(leave, "first"),
          second: actorPacket(stay, "second"),
        }),
      ).toBe(true);
      expect(
        coupleStageConsent({
          stage,
          startedAt: null,
          asOfDate,
          optionKey,
          first: actorPacket(stay, "first"),
          second: actorPacket(leave, "second"),
        }),
      ).toBe(true);
      expect(
        coupleStageConsent({
          stage,
          startedAt: null,
          asOfDate,
          optionKey,
          first: actorPacket(stay, "first"),
          second: actorPacket(stay, "second"),
        }),
      ).toBe(false);
    }
  });

  it("does not admit stay, undecided ties, unavailable results, or selected-null packets", () => {
    const startedAt = makeIsoDate("2025-01-01");
    const asOfDate = addDays(startedAt, 366);
    const pending: Pick<
      DecisionEvaluation,
      "outcomeKind" | "selectedOptionKey"
    >[] = [
      { outcomeKind: "undecided", selectedOptionKey: null },
      { outcomeKind: "no-available-option", selectedOptionKey: null },
      { outcomeKind: "selected", selectedOptionKey: null },
    ];
    for (const result of pending) {
      const selected = {
        outcomeKind: "selected",
        selectedOptionKey: "marry",
      } as const;
      expect(
        coupleStageConsent({
          stage: "cohabiting",
          startedAt,
          asOfDate,
          optionKey: "marry",
          first: actorPacket(result, "first"),
          second: actorPacket(selected, "second"),
        }),
      ).toBe(false);
      expect(
        coupleStageConsent({
          stage: "cohabiting",
          startedAt,
          asOfDate,
          optionKey: "marry",
          first: actorPacket(selected, "first"),
          second: actorPacket(result, "second"),
        }),
      ).toBe(false);
      expect(
        coupleStageConsent({
          stage: "dating",
          startedAt,
          asOfDate,
          optionKey: "break-up",
          first: actorPacket(result, "first"),
          second: actorPacket(result, "second"),
        }),
      ).toBe(false);
    }
    for (const stage of ["dating", "cohabiting", "married"] as const) {
      const stay = {
        outcomeKind: "selected",
        selectedOptionKey: "stay",
      } as const;
      expect(
        coupleStageConsent({
          stage,
          startedAt,
          asOfDate,
          optionKey: "stay",
          first: actorPacket(stay, "first"),
          second: actorPacket(stay, "second"),
        }),
      ).toBe(false);
    }
  });

  it("rejects premature consequences even when both packets select them", () => {
    const startedAt = makeIsoDate("2025-01-01");
    for (const [stage, optionKey, days] of [
      ["dating", "move-in", 182],
      ["cohabiting", "marry", 365],
    ] as const) {
      const selected = {
        outcomeKind: "selected",
        selectedOptionKey: optionKey,
      } as const;
      for (const start of [startedAt, null, addDays(startedAt, days + 1)]) {
        expect(
          coupleStageConsent({
            stage,
            startedAt: start,
            asOfDate: addDays(startedAt, days),
            optionKey,
            first: actorPacket(selected, "first"),
            second: actorPacket(selected, "second"),
          }),
        ).toBe(false);
      }
    }
  });

  it("offers only stay and separation to married couples and rejects unknown keys", () => {
    const asOfDate = makeIsoDate("2026-01-01");
    expect(
      coupleStageOptions("married", null, asOfDate).map((o) => o.key),
    ).toEqual(["stay", "separate"]);
    for (const stage of ["dating", "cohabiting", "married"] as const) {
      for (const optionKey of ["divorce", "unknown-option"]) {
        const selected = {
          outcomeKind: "selected",
          selectedOptionKey: optionKey,
        } as const;
        expect(
          coupleStageConsent({
            stage,
            startedAt: null,
            asOfDate,
            optionKey,
            first: actorPacket(selected, "first"),
            second: actorPacket(selected, "second"),
          }),
        ).toBe(false);
      }
    }
  });
});
