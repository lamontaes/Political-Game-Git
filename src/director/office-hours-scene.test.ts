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

// A resident who brings a problem to office hours is a scene for the official
// (owner, Oct 24: "fix the goddamn scenes"). The case module has residents
// with a real problem on their records (out of work with thin savings, or paid
// under the minimum wage) come to the official they know best, and records
// the visit (office.approached); the official's office-hours scene fires from
// it with the resident asking, and the talk is about that problem. Places are
// drawn in turn until one has a visit to an official who is a full person.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const DAYS = 45;
const ATTEMPTS = 4;
const SAYS: Readonly<Record<string, RegExp>> = {
  "looking-for-work": /work/,
  "paid-under-minimum-wage": /minimum wage/,
};

it(`a resident's visit to office hours is the official's scene, about the problem on record (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "office-hours-scene");
    const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // Every official on the town's ballot who is a full person.
    for (const row of townSeats(api)) {
      const id = row.holder?.personId;
      if (id && core.people.get(id)?.alive) director.watch(core, id);
    }
    advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
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
      const residentId = String(visit.facts!.constituentId);
      const here = `${where}: ${visit.id}`;
      const book = director.ledger.people.get(officialId)!;
      const entry = book.schedule.find((row) =>
        row.momentId.includes(visit.id),
      );
      const binding = entry?.bindings.find(
        (row) => row.typeKey === "office-hours",
      );
      expect(binding, `${here}: no office-hours scene`).toBeTruthy();
      expect(
        binding!.roles.find((row) => row.role === "constituent")!.personIds,
        here,
      ).toEqual([residentId]);
      expect(binding!.setting, here).toEqual({
        kind: "office",
        recordId: visit.facts!.officeId,
      });
      // The resident says their own problem, and the talk stands on the visit.
      const result = purposeScene(core, director, officialId, entry!, {
        includeHeld: true,
      });
      expect(result?.kind, here).toBe("composed");
      if (result?.kind !== "composed") continue;
      expect(result.scene.cause.id, here).toBe(visit.id);
      const problem = String(visit.facts!.problem);
      expect(
        result.scene.facts.find((row) => row.key === `case-${problem}`)
          ?.recordIds,
        here,
      ).toContain(visit.id);
      expect(result.scene.talk.state.text, here).toMatch(SAYS[problem]!);
    }
    return;
  }
  throw new Error(
    `no resident brought a problem to an official in ${DAYS} days in ${tried.join("; ")} (seed ${seed})`,
  );
}, 3_600_000);
