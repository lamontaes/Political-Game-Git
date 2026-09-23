import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { openOrdinaryLife } from "../../presentation/ordinary-life";
import { serializeWorld } from "../serialization";
import type { World } from "../types";
import { currentStateExecutiveHolders } from "../nationwide-world/state-executives";
import { projectCongress } from "../living-world/congress";
import { NATIONAL_REACH_SCALE, recordedScale } from "../press/desk";
import {
  officeConsequences,
  recordOfficeConsequence,
} from "./office-consequence";

function openingWorld(seed: string): World {
  const game = generateOpeningLife(
    prepareOpeningLife({ ...DEFAULT_NEW_GAME_SETUP, seed, startAge: 40 }),
  ).game!;
  return openOrdinaryLife(game.world, game.playerPersonId);
}

describe("GOVERNING D2: what an office does about an allegation", () => {
  it("records answers without changing the office, and a resignation that does", () => {
    const world = openingWorld("office-consequence");
    const governor = currentStateExecutiveHolders(world)[0]!;
    const base = {
      officeKey: governor.officeKey,
      subjectPersonId: governor.personId,
      effectiveAt: world.currentDate,
      evidenceEventIds: [],
    };

    // Being asked, answering, agreeing and refusing all leave the term alone.
    let next = world;
    for (const kind of [
      "explanation-requested",
      "defense-recorded",
      "cooperation-agreed",
      "cooperation-declined",
    ] as const) {
      const result = recordOfficeConsequence(next, {
        ...base,
        stableKey: `press:${kind}`,
        kind,
        statedReason: "I have nothing to add beyond what I said publicly.",
      });
      expect(result.outcome.changed).toBe(false);
      expect(result.outcome.note).not.toMatch(/guilt|finding|proven/i);
      // The words are recorded as said, not interpreted.
      expect(
        next.history.events.length < result.world.history.events.length,
      ).toBe(true);
      next = result.world;
      expect(
        currentStateExecutiveHolders(next).some(
          (row) => row.officeKey === governor.officeKey,
        ),
      ).toBe(true);
    }
    expect(officeConsequences(next, governor.officeKey)).toHaveLength(4);
    expect(
      officeConsequences(next, governor.officeKey).every((row) => !row.changed),
    ).toBe(true);

    // A retry of the same scene writes nothing and answers the same way.
    const retried = recordOfficeConsequence(next, {
      ...base,
      stableKey: "press:defense-recorded",
      kind: "defense-recorded",
      statedReason: "I have nothing to add beyond what I said publicly.",
    });
    expect(retried.world).toBe(next);
    expect(retried.outcome.changed).toBe(false);

    // A resignation ends the term, and says who fills the office is uncompiled.
    const resigned = recordOfficeConsequence(next, {
      ...base,
      stableKey: "press:resignation",
      kind: "resignation",
      statedReason: "I am standing down today.",
    });
    expect(resigned.outcome.changed).toBe(true);
    if (resigned.outcome.changed) {
      expect(resigned.outcome.kind).toBe("term-closed");
      expect(resigned.outcome.effectiveAt).toBe(world.currentDate);
      expect(resigned.outcome.note).toMatch(/own rules/);
      expect(resigned.outcome.note).not.toMatch(/\d{4}-\d{2}-\d{2}|the game/);
    }
    // A governor resigning is national news: the record carries the weight
    // a national paper reads (a placeholder until the research answers).
    const resignation = resigned.world.history.events.find(
      (event) => event.id === resigned.eventId,
    )!;
    expect(governor.officeKey).toMatch(/-governor$/);
    expect(resignation.tags).toContain("importance:major");
    expect(recordedScale(resignation)).toBeGreaterThanOrEqual(
      NATIONAL_REACH_SCALE,
    );
    // Answering a question is not news of that size.
    expect(
      next.history.events.some((event) =>
        event.tags.includes("importance:major"),
      ),
    ).toBe(false);
    expect(
      currentStateExecutiveHolders(resigned.world).some(
        (row) => row.officeKey === governor.officeKey,
      ),
    ).toBe(false);

    // And that one is idempotent too.
    const again = recordOfficeConsequence(resigned.world, {
      ...base,
      stableKey: "press:resignation",
      kind: "resignation",
      statedReason: "I am standing down today.",
    });
    expect(serializeWorld(again.world)).toBe(serializeWorld(resigned.world));
    expect(again.outcome.changed).toBe(true);
    expect(again.eventId).toBe(resigned.eventId);
  }, 600_000);

  it("a seat in Congress and an ordinary recorded office can be resigned too", () => {
    const world = openingWorld("office-consequence-seat");
    const seat = projectCongress(world)!.house.seats.find(
      (row) => row.occupant.kind === "member",
    )!;
    if (seat.occupant.kind !== "member") throw new Error("fixture");
    const member = seat.occupant.member.personId;
    const result = recordOfficeConsequence(world, {
      stableKey: "press:seat-resignation",
      officeKey: seat.seatKey,
      subjectPersonId: member,
      kind: "resignation",
      effectiveAt: world.currentDate,
      statedReason: "I am leaving the House.",
      evidenceEventIds: [],
    });
    expect(result.outcome.changed).toBe(true);
    if (result.outcome.changed)
      expect(result.outcome.effectiveAt).toBe(world.currentDate);
    // Every reader of the chamber sees the same vacancy.
    const view = projectCongress(result.world)!.house.seats.find(
      (row) => row.seatKey === seat.seatKey,
    )!;
    expect(view.occupant.kind).toBe("vacancy");
    expect(
      result.world.history.events.find((event) => event.id === result.eventId)!
        .tags,
    ).toContain("importance:notable");
    // Somebody else's seat is still not theirs to resign.
    const stranger = world.personOrder.find((id) => id !== member)!;
    const refused = recordOfficeConsequence(world, {
      stableKey: "press:not-their-seat",
      officeKey: seat.seatKey,
      subjectPersonId: stranger,
      kind: "resignation",
      effectiveAt: world.currentDate,
      statedReason: "I resign.",
      evidenceEventIds: [],
    });
    expect(refused.outcome.changed).toBe(false);
    expect(
      projectCongress(refused.world)!.house.seats.find(
        (row) => row.seatKey === seat.seatKey,
      )!.occupant.kind,
    ).toBe("member");
  }, 600_000);

  it("refuses to end a term for someone who does not hold the office", () => {
    const world = openingWorld("office-consequence-stranger");
    const governor = currentStateExecutiveHolders(world)[0]!;
    const stranger = world.personOrder.find((id) => id !== governor.personId)!;
    const result = recordOfficeConsequence(world, {
      stableKey: "press:stranger-resignation",
      officeKey: governor.officeKey,
      subjectPersonId: stranger,
      kind: "resignation",
      effectiveAt: world.currentDate,
      statedReason: "I resign.",
      evidenceEventIds: [],
    });
    expect(result.outcome.changed).toBe(false);
    expect(result.outcome.note).toMatch(/do not hold this office/);
    expect(
      currentStateExecutiveHolders(result.world).some(
        (row) => row.officeKey === governor.officeKey,
      ),
    ).toBe(true);
  }, 600_000);
});
