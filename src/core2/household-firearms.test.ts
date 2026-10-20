/**
 * The storage duty of a child access prevention law falls on households that
 * keep a gun, in the world the owner plays: the bench world, a place and seed
 * nobody chose, every module installed. Each household keeps a firearm or not
 * by its own draw against the state's survey rate; the duty is recorded on
 * the adults of owning households with a child and on no one else.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { worldWith } from "./tooling/world-with";
import { addDays, makeIsoDate } from "./kernel/dates";
import {
  firearmOwnershipRate,
  householdOwnsFirearm,
} from "./firearm-ownership";
import { advanceCore } from "./life";
import {
  openReach,
  reachParameter,
  townPeople,
} from "./law-reach/group-a-records";
import { enactLaw, lawChain } from "./modules/laws";
import { coreAPI } from "./state";

const KEY = "us-policy-positions:justice-public-safety.child-access-prevention";
const seed =
  process.env.HOUSEHOLD_FIREARMS_SEED || randomBytes(8).toString("hex");
// The law is a city ordinance: a place with no city government (a territory's
// town) cannot enact it.
const { world, place } = worldWith(seed, "household-firearms", (w) =>
  lawChain(coreAPI(w.core)).levels.some((l) => l.level === "city"),
);
console.log(`household-firearms: ${place.name} (${place.key}), seed ${seed}`);
const core = world.core;
const api = coreAPI(core);

describe(`child access prevention (${place.name}, seed ${seed})`, () => {
  it("records the storage duty on the adults of gun-owning households with a child", () => {
    const chain = lawChain(api);
    const stateKey = chain.stateKey;
    const rate = firearmOwnershipRate(stateKey);
    const level = chain.levels.find((l) => l.level === "city")!;
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: "city",
      series: KEY,
      value: 1,
      effectiveDate: addDays(makeIsoDate(core.date), 1),
      measureId: `test:${KEY}`,
      citation: "Test measure for child access prevention",
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 2));
    const adult = reachParameter("adultAge");
    const below = reachParameter("childAgeBelow");
    // The duty opens on the law's effective date, the day before the test
    // looks: someone who turns 18 in between is not yet an adult to it.
    const effective = addDays(makeIsoDate(core.date), -1);
    const ageOf = (birth: string) =>
      Number(effective.slice(0, 4)) -
      Number(birth.slice(0, 4)) -
      (effective.slice(5) < birth.slice(5) ? 1 : 0);
    const people = townPeople(api);
    const expected = new Set(
      people
        .filter((p) => {
          if (ageOf(p.birthDate) < adult) return false;
          const home = core.households.get(p.householdId);
          const child = (home?.memberIds ?? []).some((id) => {
            const m = core.people.get(id);
            return m?.alive === true && ageOf(m.birthDate) < below;
          });
          return child && householdOwnsFirearm(api, p.householdId, stateKey);
        })
        .map((p) => p.id),
    );
    const rows = openReach(api, KEY).filter((r) => core.people.has(r.targetId));
    expect(new Set(rows.map((r) => r.targetId))).toEqual(expected);
    // The share of owning households is the state's rate, within what a town this size allows.
    const households = new Set(people.map((p) => p.householdId));
    const owning = [...households].filter((h) =>
      householdOwnsFirearm(api, h, stateKey),
    ).length;
    const n = households.size;
    const share = owning / Math.max(1, n);
    console.log(
      `household-firearms: ${owning} of ${n} households own a gun (${(share * 100).toFixed(1)}%, state rate ${(rate * 100).toFixed(1)}%); the duty reaches ${rows.length} adults`,
    );
    if (n >= 30)
      expect(Math.abs(share - rate)).toBeLessThanOrEqual(
        4 * Math.sqrt((rate * (1 - rate)) / n) + 1 / n,
      );
  });
});
