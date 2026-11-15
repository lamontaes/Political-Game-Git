import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { beginSeriousIllness } from "../core2/modules/health";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

// When someone the player lives with falls seriously ill, the visit is the
// player's own scene: the one who is ill asks the player to tell a relative
// of theirs (family life report 1, Nov 14 2026: the care scene bound only on
// the ill person's own day, which the player never sees, and its packet had
// no relative, so it could never be worded). A relative who lives in another
// town is told as news, not visited. The illness is begun through the health
// engine's own onset path. Place and seed pinned: Pulaski, Ohio, family-a.
it("a seriously ill mother asks the player to tell a relative (Pulaski, Ohio)", () => {
  setBookkeeping(false);
  const place = drawPlace("family-a", "family-life");
  const where = `${place.name} (${place.key}), seed family-a`;
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const me = playerId! as PersonId;
  const home = core.households.get(core.people.get(me)!.householdId)!;
  director.watch(core, me);
  for (const id of home.memberIds) if (id !== me) director.watch(core, id);
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const api = coreAPI(core);
  // The oldest other adult at home falls ill.
  const ill = home.memberIds
    .filter((id) => id !== me && core.people.get(id)?.alive)
    .map((id) => core.people.get(id)!)
    .sort((a, b) => a.birthDate.localeCompare(b.birthDate))[0]!;
  expect(beginSeriousIllness(api, ill.id), where).toBe(true);
  // A relative who lives in another town falls ill too.
  const away = [...core.people.get(me)!.familyIds]
    .map((id) => core.people.get(id)!)
    .filter((row) => row.alive && row.placeId !== ill.placeId)
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (away) beginSeriousIllness(api, away.id);
  advanceCore(core, addDays(makeIsoDate(core.date), 3));

  const book = director.ledger.people.get(me)!;
  const entryOf = (personId: PersonId) =>
    book.schedule.find((row) => {
      const moment = book.momentsById.get(row.momentId);
      return (
        moment?.label === "feeling:event:health.serious-illness" &&
        moment.counterpartIds.includes(personId)
      );
    });
  const entry = entryOf(ill.id);
  expect(
    entry,
    `${where}: ${ill.givenName}'s illness on the player's day`,
  ).toBeTruthy();
  expect(
    entry!.bindings.map((row) => row.typeKey),
    where,
  ).toContain("care");
  expect(entry!.outcome, where).toBe("scene-now");
  const visit = purposeScene(core, director, me, entry!, { typeKey: "care" });
  expect(visit?.kind, `${where}: ${JSON.stringify(visit)}`).toBe("composed");
  if (visit?.kind === "composed") {
    expect(visit.scene.askerId, where).toBe(ill.id);
    expect(visit.scene.askedId, where).toBe(me);
    const relative = visit.scene.facts.find((row) => row.key === "relative");
    expect(relative, where).toBeTruthy();
    expect(relative!.recordIds, where).toContain(ill.id);
  }

  // Far away: told as news, never a bedside visit.
  if (away) {
    const far = entryOf(away.id);
    if (far) {
      const scene = purposeScene(core, director, me, far, { typeKey: "care" });
      expect(
        scene?.kind,
        `${where}: ${away.givenName} lives elsewhere`,
      ).not.toBe("composed");
    }
  }
}, 90_000);
