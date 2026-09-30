import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { LIBRARY_QUESTION } from "./education-civil-law-terms";
import { libraryMaterialsAuthority } from "./library-materials-authority";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "./life-places";
import { createProductionPolicyCatalog } from "./production-catalog";
import { SeededRng } from "./rng";
import type { EntityId, World } from "./types";

const catalog = createProductionPolicyCatalog();
const proposition = Object.values(catalog.propositions).find(
  (row) => row.stableKey === LIBRARY_QUESTION,
)!;

function fixture(stateKey: string, answer: "yes" | "no") {
  const state = stateJurisdictionForKey(stateKey)!;
  const town = searchLifePlaces("", 5000, {
    stateJurisdictionKey: stateKey,
  }).find((row) => row.scope !== "state")!;
  const world = {
    currentDate: makeIsoDate("2026-01-01"),
    policyCatalog: catalog,
    jurisdictions: {
      [state.id]: state,
      [town.context.jurisdiction.id]: town.context.jurisdiction,
    },
    history: {
      nextSequence: 100,
      events: [],
      legislativeMeasures: [
        {
          id: "measure_library",
          jurisdictionId: state.id,
          propositionIds: [proposition.id],
          propositionAnswers: [{ propositionId: proposition.id, answer }],
        },
      ],
      legislativeEnactments: [
        {
          id: "enactment_library",
          measureId: "measure_library",
          resolvedAt: "2026-01-01",
          effectiveAt: "2026-01-01",
          outcome: "enacted",
          sequence: 50,
        },
      ],
    },
  } as unknown as World;
  return { world, townId: town.context.jurisdiction.id };
}

describe("library authority reads the operative law", () => {
  it("reads both allocation answers in five states sampled from all 56", () => {
    const rng = new SeededRng("library-main-authority-2026");
    const remaining = [...lifePlaceStateIdentities()];
    expect(remaining).toHaveLength(56);
    for (let i = 0; i < 5; i++) {
      const place = rng.pick(remaining);
      remaining.splice(remaining.indexOf(place), 1);
      for (const answer of ["yes", "no"] as const) {
        const { world, townId } = fixture(place.jurisdictionKey, answer);
        const result = libraryMaterialsAuthority(world, townId);
        expect(result.level, place.jurisdictionKey).toBe(
          answer === "yes" ? "local" : "state",
        );
        expect(result.law?.measureId).toBe("measure_library");
        expect(result.reason).toContain("operative 2026-01-01");
        expect("removed" in result).toBe(false);
      }
    }
  });
  it("does not derive permission from an unknown place", () => {
    const place = new SeededRng("library-unknown-place").pick(
      lifePlaceStateIdentities(),
    );
    const { world } = fixture(place.jurisdictionKey, "yes");
    const result = libraryMaterialsAuthority(
      world,
      "unknown_place" as EntityId,
    );
    expect(result.level).toBe("unknown");
    expect(result.law).toBeNull();
  });
  it("does not read a future enactment as the governing measure", () => {
    const place = new SeededRng("library-future-law").pick(
      lifePlaceStateIdentities(),
    );
    const { world, townId } = fixture(place.jurisdictionKey, "yes");
    const future = {
      ...world,
      history: {
        ...world.history,
        legislativeEnactments: (world.history.legislativeEnactments ?? []).map(
          (row) => ({
            ...row,
            effectiveAt: makeIsoDate("2026-02-01"),
          }),
        ),
      },
    };
    expect(libraryMaterialsAuthority(future, townId).law?.measureId).not.toBe(
      "measure_library",
    );
  });
});
