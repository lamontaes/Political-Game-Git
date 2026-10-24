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
import { composeScene } from "./scene";

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
  let joins = 0;
  for (const [personId, book] of director.ledger.people)
    for (const row of book.schedule) {
      const moment = book.momentsById.get(row.momentId);
      if (moment?.label !== "cause:event:law.effect-learned") continue;
      const here = `${where}, ${personId}, ${moment.causeId}`;
      // One sitting covers a day (scheduling.ts): a second effect learned the
      // same day joins the scene already staged for it. That scene is the
      // same reached person's alone, and it cites both learned-effect records.
      if (!row.bindings.length && row.outcome === "journal-line") {
        const sitting = book.schedule.find(
          (other) =>
            other.date === row.date &&
            other.bindings.some((b) =>
              (b.joined ?? []).some((j) => j.momentId === row.momentId),
            ),
        );
        expect(sitting, `${here}: joined no scene that day`).toBeDefined();
        const joined = sitting!.bindings.find((b) =>
          (b.joined ?? []).some((j) => j.momentId === row.momentId),
        )!;
        expect(joined.typeKey, here).toBe("law-takes-effect");
        expect(
          joined.roles.map((role) => role.role),
          here,
        ).toEqual(["reached"]);
        expect(joined.roles[0]!.personIds, here).toEqual([personId]);
        expect(
          joined.presentIds.filter((id) => id !== personId),
          here,
        ).toEqual([]);
        const first = book.momentsById.get(sitting!.momentId)!;
        expect(first.label, here).toBe("cause:event:law.effect-learned");
        const causes = [
          first.causeId,
          ...joined.joined!.map((entry) => entry.causeId),
        ];
        expect(causes, here).toContain(moment.causeId);
        expect(new Set(causes).size, here).toBe(causes.length);
        // The scene the screen shows cites both records.
        const scene = composeScene(core, director, personId, sitting!);
        const cited = (scene?.narration ?? []).flatMap(
          (line) => line.sourceRecordIds,
        );
        if (cited.length)
          expect(cited, here).toEqual(
            expect.arrayContaining([first.causeId, moment.causeId]),
          );
        joins += 1;
        continue;
      }
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
    `${where}: an heir's learned effect is a moment (${joins} more joined a scene the same day)`,
  ).toBeGreaterThan(0);
}, 3_600_000);
