import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { moduleState } from "../core2/module-state";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { RENEWAL_MODULE_ID } from "../core2/modules/renewal";
import type { PersonId } from "../core2/types";
import type { Director } from "./ledger";
import { purposeScene } from "./purpose-scene";

// A person's own date, the proposal they are asked and the birth of their own
// child always stage as scenes, never only as a Journal line (family life
// report 1, Nov 14 2026: in Pulaski, Ohio the player's first date lost the
// director's pace to bigger moments and was never shown). The types carry
// `stopsDay`, as the swearing-in does. Places and seeds are pinned here; the
// records are written by the engines' own paths (the partnerships writer and
// its monthly review; the renewal engine's births).
setBookkeeping(false);

/** The bench's world in a place pinned by name and seed. */
function world(seed: string) {
  const place = drawPlace(seed, "family-life");
  const built = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  return { ...built, where: `${place.name} (${place.key}), seed ${seed}` };
}

/** The watched person's schedule entry for a cause, with the type it binds. */
function entryFor(
  director: Director,
  personId: PersonId,
  causePrefix: string,
  typeKey: string,
) {
  const book = director.ledger.people.get(personId);
  return book?.schedule.find(
    (row) =>
      book.momentsById.get(row.momentId)?.causeId.startsWith(causePrefix) &&
      row.bindings.some((bound) => bound.typeKey === typeKey),
  );
}

describe("a person's own courtship and child always stage", () => {
  it("plays a parent's new baby as a scene (Leipsic, Delaware)", () => {
    const { core, director, where } = world("family-c");
    // The parents of every pregnancy the renewal engine holds are watched,
    // so whoever it delivers first is someone the director reads. The engine
    // opens its tables on the first day.
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    for (const row of moduleState(core, RENEWAL_MODULE_ID)
      .table("pregnancies")
      .rows())
      if (row.status === "pregnant")
        for (const id of [row.motherId, row.otherParentId])
          if (core.people.get(String(id) as PersonId)?.alive)
            director.watch(core, String(id) as PersonId);
    advanceCore(core, addDays(makeIsoDate(core.date), 100));
    const mothers = [...director.ledger.people.keys()].filter((id) =>
      entryFor(director, id as PersonId, "", "new-baby"),
    );
    expect(
      mothers.length,
      `${where}: a birth in the first 100 days`,
    ).toBeGreaterThan(0);
    for (const id of mothers) {
      const entry = entryFor(director, id as PersonId, "", "new-baby")!;
      expect(entry.outcome, `${where}: ${id}'s baby is a scene now`).toBe(
        "scene-now",
      );
    }
    const first = mothers[0] as PersonId;
    const scene = purposeScene(
      core,
      director,
      first,
      entryFor(director, first, "", "new-baby")!,
      { typeKey: "new-baby" },
    );
    expect(scene?.kind, `${where}: the visit is worded`).toBe("composed");
  }, 120_000);
});
