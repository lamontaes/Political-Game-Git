import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { settleEstate, heirsOf } from "../core2/estates";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";

// A person who learns that a law took money from them has a moment the
// director schedules from the learned-effect record (owner, Oct 15: scenes
// fire from recorded causes). An heir told by the accounting of an estate was
// told by a notice, which names no one, and no teller is invented (owner,
// Oct 16: a person learns a law changed their money mostly from the news or
// a feed, so the source is the record that reached them, and a person tells
// only where a conversation record shows it): the scene is the reached
// person's alone, citing the learned-effect record.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`an heir told by an estate notice has the scene alone, with no teller invented (seed ${seed})`, () => {
  const place = drawPlace(seed, "law-reached-scenes");
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const where = `${place.name}, seed ${seed}`;
  const decedent = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        heirsOf(api, p).heirs.length &&
        !core.finance.incomeContractsByPerson.get(p.id)?.size,
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  expect(decedent, `${where}: no one with living kin`).toBeDefined();
  for (const heir of heirsOf(api, decedent!).heirs) director.watch(core, heir);
  // An estate of $20 million, so the estate tax in force applies (an edge
  // case a played town rarely holds).
  api.updatePerson(decedent!.id, { liquidMinor: 20_000_000_00 });
  api.updatePerson(decedent!.id, { alive: false });
  settleEstate(api, decedent!.id, "event:death");
  advanceCore(
    core,
    addDays(makeIsoDate(core.date), api.parameter("probateDays") + 1),
  );
  let moments = 0;
  for (const [personId, book] of director.ledger.people)
    for (const row of book.schedule) {
      const moment = book.momentsById.get(row.momentId);
      if (moment?.label !== "cause:event:law.effect-learned") continue;
      const here = `${where}, ${personId}, ${moment.causeId}`;
      // Only the reached person is in it: nobody is made the teller.
      expect(row.bindings.length, here).toBe(1);
      const binding = row.bindings[0]!;
      expect(binding.typeKey, here).toBe("law-takes-effect");
      expect(
        binding.presentIds.filter((id) => id !== personId),
        here,
      ).toEqual([]);
      expect(
        binding.roles.map((role) => role.role),
        here,
      ).toEqual(["reached"]);
      expect(binding.roles[0]!.personIds, here).toEqual([personId]);
      moments += 1;
    }
  expect(
    moments,
    `${where}: an heir's learned effect is a moment`,
  ).toBeGreaterThan(0);
}, 3_600_000);
