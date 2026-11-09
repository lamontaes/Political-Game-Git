import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";

// Lines that read wrong once the game filled them (pool item
// words-batch-4-reads-wrong). Each test plays a scene in a generated world
// drawn from all 56 places and reads the line the way play says it.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`office hours is a one-on-one: no town-hall beat plays in it (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "reads-wrong-office-hours");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    for (const row of townSeats(coreAPI(core))) {
      const id = row.holder?.personId;
      if (id && core.people.get(id)?.alive) director.watch(core, id);
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 45));
    const visits = [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "office.approached" &&
        director.ledger.people.has(String(row.facts?.officialId) as PersonId),
    );
    if (!visits.length) {
      tried.push(place.name);
      continue;
    }
    for (const visit of visits) {
      const officialId = String(visit.facts!.officialId) as PersonId;
      const entry = director.ledger.people
        .get(officialId)!
        .schedule.find((row) => row.momentId.includes(visit.id));
      const result = purposeScene(core, director, officialId, entry!);
      expect(result?.kind, where).toBe("composed");
      if (result?.kind !== "composed") continue;
      const said = JSON.stringify(result.scene.talk);
      expect(said, where).not.toMatch(
        /microphone|moderator|Somebody in the back|Next question|town hall|starts clapping|near the back lean/i,
      );
    }
    return;
  }
  throw new Error(`no office visit in ${tried.join("; ")} (seed ${seed})`);
}, 600_000);
