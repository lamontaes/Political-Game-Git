import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { moduleState } from "../core2/module-state";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { RENEWAL_MODULE_ID } from "../core2/modules/renewal";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
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

function adultOn(core: CoreState, born: string) {
  return ageOnDate(makeIsoDate(born), makeIsoDate(core.date)) >= 18;
}

describe("a person's own courtship and child always stage", () => {
  it("plays the player's first date and the proposal they are asked as scenes (Pulaski, Ohio)", () => {
    const { core, director, playerId, where } = world("family-a");
    const me = playerId! as PersonId;
    // Watched as the bench watches: the player and their household.
    director.watch(core, me);
    for (const id of core.households.get(core.people.get(me)!.householdId)
      ?.memberIds ?? [])
      if (id !== me) director.watch(core, id);
    // The player turns 18 in the spring; the partnerships writer refuses a
    // partner younger.
    while (!adultOn(core, core.people.get(me)!.birthDate))
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    const player = core.people.get(me)!;
    const partnered = new Set<string>();
    for (const link of core.familyLinks.values())
      if (link.kind === "partner")
        for (const id of link.personIds) partnered.add(id);
    const other = [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.tier !== "husk" &&
          row.id !== me &&
          row.householdId !== player.householdId &&
          row.placeId === player.placeId &&
          !partnered.has(row.id) &&
          !player.familyIds.has(row.id) &&
          adultOn(core, row.birthDate),
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    expect(other, `${where}: an adult single in town`).toBeTruthy();
    const api = coreAPI(core);
    api.setPartnersV1({
      personIds: [me, other!.id],
      together: true,
      source: {
        tag: "SOURCED",
        asOf: core.date,
        citation: "The partnerships writer, as its monthly review calls it.",
      },
      facts: { union: "dating" },
    });
    const link = [...core.familyLinks.values()].find(
      (row) => row.kind === "partner" && row.personIds.includes(me),
    )!;
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const date = entryFor(director, me, "family.partnered:", "date");
    expect(date, `${where}: the date binds`).toBeTruthy();
    expect(date!.outcome, `${where}: the date is a scene now`).toBe(
      "scene-now",
    );
    const dateScene = purposeScene(core, director, me, date!, {
      typeKey: "date",
    });
    expect(dateScene?.kind, `${where}: the date is worded`).toBe("composed");

    // The couple has lived together long enough that the next monthly review
    // reaches the proposal: the engine's own stage climb writes it and holds
    // the couple at "proposed" until the player answers.
    const couples = moduleState(core, "partnerships").table("couples");
    couples.put({
      id: link.id,
      stage: "living-together",
      since: core.date,
      progress: 0.999,
    } as never);
    advanceCore(core, addDays(makeIsoDate(core.date), 32));
    const held = couples.get(link.id) as { stage: string } | undefined;
    expect(held?.stage, `${where}: the engine asked the player`).toBe(
      "proposed",
    );
    const proposal = entryFor(director, me, "family.engaged:", "proposal");
    expect(proposal, `${where}: the proposal binds`).toBeTruthy();
    expect(proposal!.outcome, `${where}: the proposal is a scene now`).toBe(
      "scene-now",
    );
    const asked = purposeScene(core, director, me, proposal!, {
      typeKey: "proposal",
    });
    expect(asked?.kind, `${where}: the proposal is worded`).toBe("composed");
    if (asked?.kind === "composed") {
      expect(asked.scene.askerId, where).toBe(other!.id);
      expect(asked.scene.askedId, where).toBe(me);
    }
  }, 120_000);

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
