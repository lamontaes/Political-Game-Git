import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { ageOnDate } from "./dates";
import { parentsOf } from "./people-family";
import { createFormationContext, recordPrinciple } from "./politics";
import {
  formPrinciplesFromLife,
  LIFE_PRINCIPLES_VERSION,
  principlePullsOf,
  principlesFromPulls,
  type PrinciplePull,
} from "./principles-from-life";
import type { EntityId, World } from "./types";

/**
 * A person's principles come from their own recorded life, with no draw:
 * the owner's rule of September 29, 2026. Each place here is a different
 * state, none of them Kentucky.
 */

function opening(placeKey: string, seed: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey,
      startAge: 34,
    }),
  ).game!;
  return { world: game.world, player: game.playerPersonId };
}

// Tucson, Arizona.
const { world, player } = opening("0477000", "principles-from-life-tucson");
const adults = world.personOrder.filter(
  (id) =>
    id !== player &&
    ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 18,
);

function principleId(w: World, key: string): EntityId {
  return w.policyCatalog.principleOrder.find((id) =>
    w.policyCatalog.principles[id]!.stableKey.endsWith(`:${key}`),
  )!;
}

function pull(
  principle: string,
  toward: "endorses" | "rejects",
  weight: 1 | 2 | 3,
): PrinciplePull {
  return { principle, toward, weight, because: "a test pull" };
}

describe("principles that form from a life", () => {
  it("makes nothing from a party label alone", () => {
    const someone = adults[0]!;
    expect(
      principlesFromPulls(world, someone, [
        {
          principle: "limited-government",
          toward: "endorses",
          weight: 1,
          because: "their party, the Republicans, stands for it",
        },
      ]),
    ).toEqual([]);
  });

  it("holds a principle as firmly as the pulls add up, and is torn when pulled both ways", () => {
    const someone = adults[0]!;
    const held = (pulls: readonly PrinciplePull[]) =>
      principlesFromPulls(world, someone, pulls).map((row) => [
        row.stance,
        row.conviction,
      ]);
    expect(held([pull("tradition", "endorses", 2)])).toEqual([
      ["endorses", "tentative"],
    ]);
    expect(
      held([
        pull("tradition", "endorses", 2),
        pull("tradition", "endorses", 1),
      ]),
    ).toEqual([["endorses", "moderate"]]);
    expect(
      held([pull("tradition", "rejects", 2), pull("tradition", "rejects", 2)]),
    ).toEqual([["rejects", "strong"]]);
    expect(
      held([pull("tradition", "endorses", 2), pull("tradition", "rejects", 1)]),
    ).toEqual([["conflicted", "tentative"]]);
    expect(
      held([pull("tradition", "endorses", 3), pull("tradition", "rejects", 1)]),
    ).toEqual([["endorses", "tentative"]]);
  });

  it("lets a child grow up with what a parent held", () => {
    const child = adults.find((id) =>
      parentsOf(world, id).some((parentId) => parentId !== player),
    );
    expect(child, "a townsperson with a recorded parent").toBeDefined();
    const parent = parentsOf(world, child!).find((id) => id !== player)!;
    const tradition = principleId(world, "tradition");
    const taught = recordPrinciple(world, {
      stableKey: "principles-from-life-test:parent",
      personId: parent,
      principleId: tradition,
      formedAt: world.currentDate,
      stance: "rejects",
      conviction: "strong",
      flexibility: "firm",
      qualification: null,
      formation: createFormationContext("reflection:test", {
        note: "Test fixture: what the parent holds.",
      }),
      supersedesPrincipleRecordId: null,
    });
    const pulls = principlePullsOf(taught, child!);
    expect(pulls).toContainEqual(
      expect.objectContaining({
        principle: "tradition",
        toward: "rejects",
        weight: 2,
        because: expect.stringMatching(/^grew up with .+, who rejected it$/),
      }),
    );
    const formed = formPrinciplesFromLife(taught, [child!]);
    const row = formed.history.principles
      .slice(taught.history.principles.length)
      .find(
        (record) =>
          record.personId === child && record.principleId === tradition,
      );
    // The child forms a view of tradition unless the rest of their life
    // pulls against it as hard; either way the parent is named as a reason.
    if (row) {
      expect(row.stableKey.startsWith(`${LIFE_PRINCIPLES_VERSION}:`)).toBe(
        true,
      );
      expect(row.formation.reason).toBe("experience:life");
      expect(row.formation.note).toMatch(/against: grew up with /);
    }
  });

  it("writes nothing when a life has not changed, and never forms the player", () => {
    const people = [player, ...adults.slice(0, 400)];
    const once = formPrinciplesFromLife(world, people);
    expect(
      once.history.principles.some((record) => record.personId === player),
    ).toBe(false);
    let settled = once;
    for (let pass = 0; pass < 6; pass += 1) {
      const next = formPrinciplesFromLife(settled, people);
      if (next.history.principles.length === settled.history.principles.length)
        break;
      settled = next;
    }
    expect(formPrinciplesFromLife(settled, people)).toBe(settled);
  });

  it("forms the same principles from the same life, with no draw", () => {
    const people = adults.slice(0, 200);
    const shape = (w: World) =>
      w.history.principles.map((r) => [
        r.personId,
        r.principleId,
        r.stance,
        r.conviction,
        r.flexibility,
      ]);
    const again = opening("0477000", "principles-from-life-tucson").world;
    expect(shape(formPrinciplesFromLife(again, people))).toEqual(
      shape(formPrinciplesFromLife(world, people)),
    );
  });

  it("leaves a sitting officeholder's drawn principles as the draw left them", () => {
    // Seated officeholders have no recorded life yet, so their principles
    // still come from the officeholder draw; life does not add to them.
    const someone = adults.find(
      (id) =>
        formPrinciplesFromLife(world, [id]).history.principles.length >
        world.history.principles.length,
    )!;
    const principleId = world.policyCatalog.principleOrder[0]!;
    const drawn = recordPrinciple(world, {
      stableKey: `officeholder-principles/v1:${someone}:test`,
      personId: someone,
      principleId,
      formedAt: world.currentDate,
      stance: "endorses",
      conviction: "settled",
      flexibility: "firm",
      qualification: null,
      formation: createFormationContext("other:drawn-before-play", {
        note: "Test fixture: a row the officeholder draw wrote.",
      }),
      supersedesPrincipleRecordId: null,
    });
    const own = (w: World) =>
      w.history.principles.filter((row) => row.personId === someone).length;
    expect(own(formPrinciplesFromLife(drawn, [someone]))).toBe(own(drawn));
  });
});
