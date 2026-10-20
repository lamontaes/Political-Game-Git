/** A death moves the kin who are still counted, on the day they are filled in, by what is left of its impulse. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { createRenewalCore } from "./births-setup";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { createHealthModule, keepForCountedKin } from "./modules/health";
import { residentsRuntime } from "./modules/residents";
import { coreAPI, fillInPerson } from "./state";
import { generatedOpening } from "./tooling/generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it(`a counted kin filled in after a death carries what is left of its mood impulse (seed ${seed})`, () => {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "health-bereaved");
    const core = createRenewalCore(
      generatedOpening(place, { twoLevel: true }),
      { modules: [createHealthModule()] },
    );
    advanceCore(core, addDays(makeIsoDate(core.date), 2));
    const api = coreAPI(core);
    const counted = residentsRuntime(core)!.store;
    // A full person with kin in the counts: the death will name them.
    const dead = [...core.people.values()]
      .sort((a, b) => a.id.localeCompare(b.id))
      .find(
        (p) =>
          p.alive &&
          [...p.familyIds].some(
            (id) =>
              !core.people.has(id) && counted.countedMember(id) !== undefined,
          ),
      );
    if (!dead) continue;
    const kinId = [...dead.familyIds]
      .sort()
      .find(
        (id) => !core.people.has(id) && counted.countedMember(id) !== undefined,
      )!;
    const where = `${place.name} (draw ${attempt}), dead ${dead.id}, kin ${kinId}`;
    const deathDate = core.date;
    keepForCountedKin(api, dead, {
      id: `life.death:${dead.id}:${deathDate}`,
      date: deathDate,
      kind: "life.death",
      personIds: [dead.id],
      moodImpulse: -4,
      stressImpulse: 3,
      source: {
        tag: "ESTIMATED",
        asOf: deathDate,
        citation: "Controlled death",
        estimatedFrom: "test",
      },
    });
    // 60 days on, the kin is filled in; the late event names the dead and
    // carries the part left after 60 days.
    advanceCore(core, addDays(makeIsoDate(core.date), 60));
    const filled = fillInPerson(core, kinId);
    const late = [...core.durableLog.values()].find(
      (row) => row.id === `life.death:${dead.id}:${deathDate}:late:${kinId}`,
    );
    expect(late, `${where}: late event`).toBeDefined();
    expect(late!.personIds, where).toEqual([dead.id]);
    expect(late!.witnessIds, where).toEqual([filled.id]);
    const halfLife = api.parameter("moodHalfLifeDays");
    const expected = -4 * Math.exp((-Math.log(2) * 60) / halfLife);
    expect(late!.moodImpulse, where).toBeCloseTo(expected, 9);
    expect(Math.abs(late!.moodImpulse!), where).toBeLessThan(4);
    // Another engine reads it: the filled-in kin's own mood now sits below
    // their baseline, by the impulse the appraisal gave them.
    const after = core.people.get(filled.id)!;
    expect(after.affect.mood, `${where}: mood`).toBeLessThan(
      after.affect.moodBaseline,
    );
    return;
  }
  throw new Error(
    `No drawn place had a full person with counted kin (seed ${seed})`,
  );
}, 600_000);
