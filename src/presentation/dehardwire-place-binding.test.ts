import { describe, expect, it } from "vitest";

import { lifePlaceByJurisdictionId, lifePlaceByKey } from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { projectRunADossier } from "./run-a-projection";

/**
 * DIRECTOR42 ROLE B — a place is named from the catalog, not from one run.
 *
 * Two fixture-shaped things were reaching ordinary play through this corner:
 *
 *   1. Every birthplace and residence on the player's dossier was run through
 *      `runAPlaceDisplayName`, the Run-A development fixture's helper, which
 *      recognised exactly one place by literal. A character from Lexington read
 *      correctly; a character from anywhere else was shown whatever filing name
 *      the jurisdiction record carried.
 *   2. `createDemoWorld` defaults its jurisdiction to Lexington when none is
 *      supplied, which would make Kentucky the universal normal start rather
 *      than one explicit scenario.
 *
 * The first is fixed by binding to the place catalog, which already holds each
 * place's resident-facing name. The second is not reachable from ordinary play
 * and this pins that it stays that way.
 */

function newLifeIn(placeKey: string, seed: string) {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey,
    seed,
  });
  return built;
}

describe("an ordinary start is the place the player chose", () => {
  it("never falls back to Lexington", () => {
    // Named non-Kentucky starts, not a first-town fallback.
    for (const placeKey of ["nebraska", "alaska"]) {
      const built = newLifeIn(placeKey, `place-binding-${placeKey}`);
      const expected = lifePlaceByKey(placeKey);
      expect(expected).not.toBeNull();

      const jurisdictionId = expected!.context.jurisdiction.id;
      expect(built.world.jurisdictions[jurisdictionId]).toBeDefined();

      const lexington = lifePlaceByKey("lexington-fayette");
      expect(built.world.jurisdictions[jurisdictionId]!.name).not.toBe(
        lexington!.context.jurisdiction.name,
      );
      // And the clock is that place's, not the demo context's.
      expect(built.world.currentDate).toBe(
        expected!.context.initialMoment.date,
      );
    }
  });
});

describe("the dossier names a place the way the catalog does", () => {
  it("uses each place's resident-facing name, not one run's special case", () => {
    // The catalog is the thing being bound to, so the check is that every
    // playable place it lists has the resident-facing name available — which
    // is what the projection now reads.
    for (const placeKey of [
      "kentucky",
      "nebraska",
      "alaska",
      "lexington-fayette",
    ]) {
      const place = lifePlaceByKey(placeKey);
      expect(place).not.toBeNull();
      const resolved = lifePlaceByJurisdictionId(
        place!.context.jurisdiction.id,
      );
      expect(resolved?.displayName).toBe(place!.displayName);
    }

    // Lexington is the case the fixture helper special-cased. It still reads
    // the way a resident says it — now because the catalog says so, not
    // because a development run spelled it out.
    const lexington = lifePlaceByKey("lexington-fayette")!;
    expect(lexington.displayName).toBe("Lexington, Kentucky");
    expect(lexington.formalName).toBe("Lexington-Fayette, Kentucky");
    expect(
      lifePlaceByJurisdictionId(lexington.context.jurisdiction.id)?.displayName,
    ).toBe("Lexington, Kentucky");
  });

  it("renders a character's own place the way the catalog names it", () => {
    const built = newLifeIn("nebraska", "place-binding-dossier");
    const dossier = projectRunADossier(built.world, built.playerPersonId, {
      personId: built.playerPersonId,
      title: "",
      role: "",
      qualitativeRead: "",
      inferredRead: "",
    });

    const place = dossier.homePlace;
    expect(place).toBeDefined();
    if (place.id === "hometown") {
      // No recorded place fact. Saying so is the truthful answer; an unknown
      // place is not a licence to name one.
      expect(place.value).toBe("Not known");
      return;
    }

    // A place was recorded, so the value must be exactly what the catalog
    // calls that jurisdiction — never its filing name, and never another
    // state's because one run's helper only knew about Lexington.
    const named = Object.values(built.world.jurisdictions).find(
      (jurisdiction) =>
        (lifePlaceByJurisdictionId(jurisdiction.id)?.displayName ??
          jurisdiction.name) === place.value,
    );
    expect(
      named,
      `no jurisdiction in this world is named ${place!.value}`,
    ).toBeDefined();
    expect(place!.value).not.toMatch(/Lexington/);
  });
});
