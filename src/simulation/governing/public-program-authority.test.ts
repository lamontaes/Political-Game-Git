import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { addDays } from "../dates";
import { currentPresidentOf } from "../crisis/offices";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { money } from "../resources";
import type { EntityId, PublicProgramAppropriationRecord } from "../types";
import { programAuthority } from "./public-program";

describe("federal public-program authority", () => {
  it("allows only the sitting President to commit a federal appropriation", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "public-program-federal-authority",
        startAge: 34,
        depth: "summarize-earlier-life",
      }),
    ).game;
    if (!game) throw new Error("Expected an ordinary opening life.");
    const world = game.world;
    const president = currentPresidentOf(world);
    if (!president) throw new Error("Expected a sitting President.");
    const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
    const appropriation: PublicProgramAppropriationRecord = {
      id: "public-program:test-appropriation" as EntityId,
      stableKey: "public-program-authority:test-appropriation",
      sequence: 1,
      kind: "appropriation",
      programKey: "passenger-rail:us",
      jurisdictionId,
      accountOrganizationId: "organization:test-federal-account" as EntityId,
      amount: money(1, "USD"),
      availableFrom: world.currentDate,
      availableThrough: addDays(world.currentDate, 365),
      recordedAt: world.currentDate,
      eventId: "event:test-appropriation" as EntityId,
      sourceMeasureId: null,
      basis: {
        kind: "authored-fixture",
        note: "Federal executive authority test; not a spending record.",
      },
    };
    const otherPersonId = world.personOrder.find(
      (personId) => personId !== president.personId,
    );
    if (!otherPersonId)
      throw new Error("Expected another person in the world.");

    expect(
      programAuthority(
        world,
        president.personId,
        { kind: "federal-executive" },
        appropriation,
      ).status,
    ).toBe("available");
    expect(
      programAuthority(
        world,
        otherPersonId,
        { kind: "federal-executive" },
        appropriation,
      ),
    ).toMatchObject({
      status: "unavailable",
      reason: "Only the sitting President commits this federal appropriation.",
    });
    expect(
      programAuthority(
        world,
        president.personId,
        { kind: "federal-executive" },
        { ...appropriation, jurisdictionId: "jurisdiction:wrong" as EntityId },
      ),
    ).toMatchObject({
      status: "unavailable",
      reason: "This appropriation does not belong to the federal government.",
    });
  }, 120_000);
});
