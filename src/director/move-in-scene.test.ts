import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { moduleState } from "../core2/module-state";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { FAMILY_MOVE_IN_ASKED } from "../core2/modules/partnerships";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";

// Living together changes the player's home, so a partner asks and the
// player's answer in the scene decides (family life question 2, ruled Nov 14
// 2026: the partner asks to move in, in a scene). The ask is written by the
// partnerships engine's own monthly climb and stops the player's day; a yes
// moves one of them in with the other, a no keeps them dating and starts
// over. Place and seed pinned: Pulaski, Ohio, family-a.
setBookkeeping(false);

function adultOn(core: CoreState, born: string) {
  return ageOnDate(makeIsoDate(born), makeIsoDate(core.date)) >= 18;
}

/** The player, dating a single in town, a month from the engine's next climb. */
function asked() {
  const place = drawPlace("family-a", "family-life");
  const where = `${place.name} (${place.key}), seed family-a`;
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const me = playerId! as PersonId;
  director.watch(core, me);
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
    .sort((a, b) => a.id.localeCompare(b.id))[0]!;
  const api = coreAPI(core);
  api.setPartnersV1({
    personIds: [me, other.id],
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
  // The couple has dated long enough that the next monthly review climbs.
  const couples = moduleState(core, "partnerships").table("couples");
  couples.put({
    id: link.id,
    stage: "dating",
    since: core.date,
    progress: 0.999,
  } as never);
  advanceCore(core, addDays(makeIsoDate(core.date), 32));
  return { core, director, me, other, link, couples, where, api };
}

it("a partner asks the player to live together, and the player's yes moves them in (Pulaski, Ohio)", () => {
  const { core, director, me, other, link, couples, where, api } = asked();
  const held = couples.get(link.id) as { stage: string } | undefined;
  expect(held?.stage, `${where}: the engine asked`).toBe("move-in-asked");
  expect(core.people.get(me)!.householdId, where).not.toBe(
    core.people.get(other.id)!.householdId,
  );
  const book = director.ledger.people.get(me)!;
  const entry = book.schedule.find(
    (row) =>
      book.momentsById
        .get(row.momentId)
        ?.causeId.startsWith(`${FAMILY_MOVE_IN_ASKED}:`) &&
      row.bindings.some((bound) => bound.typeKey === "move-in"),
  );
  expect(entry, `${where}: the ask binds the move-in scene`).toBeTruthy();
  expect(entry!.outcome, `${where}: it stops the day`).toBe("scene-now");
  const causeId = book.momentsById.get(entry!.momentId)!.causeId;

  // The scene's reply, as the bench sends it when the talk ends on a yes.
  api.emit({
    id: `scene-reply:${causeId}:said-yes`,
    date: core.date,
    kind: "scene.reply",
    personIds: [me, other.id],
    placeId: core.people.get(me)!.placeId,
    source: { tag: "SOURCED", citation: "A reply.", asOf: core.date },
    facts: { typeKey: "move-in", causeId, move: "agree", ending: "said-yes" },
  });
  expect((couples.get(link.id) as { stage: string }).stage, where).toBe(
    "living-together",
  );
  expect(core.people.get(me)!.householdId, `${where}: one home`).toBe(
    core.people.get(other.id)!.householdId,
  );
}, 120_000);

it("a no keeps them dating, two homes, and the climb starts over (Pulaski, Ohio)", () => {
  const { core, me, other, link, couples, where, api } = asked();
  const asked_ = [...core.durableLog.values()].find(
    (row) => row.kind === FAMILY_MOVE_IN_ASKED,
  );
  expect(asked_, where).toBeTruthy();
  api.emit({
    id: `scene-reply:${asked_!.id}:turned-down`,
    date: core.date,
    kind: "scene.reply",
    personIds: [me, other.id],
    placeId: core.people.get(me)!.placeId,
    source: { tag: "SOURCED", citation: "A reply.", asOf: core.date },
    facts: {
      typeKey: "move-in",
      causeId: asked_!.id,
      move: "decline",
      ending: "turned-down",
    },
  });
  const row = couples.get(link.id) as { stage: string; progress: number };
  expect(row.stage, where).toBe("dating");
  expect(row.progress, where).toBe(0);
  expect(core.people.get(me)!.householdId, where).not.toBe(
    core.people.get(other.id)!.householdId,
  );
}, 120_000);
