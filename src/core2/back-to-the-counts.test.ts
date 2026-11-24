import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { recordProof } from "../bench/dev-proof";
import { isDemoted } from "./counted-groups";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import {
  canReturnToCounts,
  demoteHousehold,
  protectedPeople,
} from "./modules/counted-demotion";
import { setBookkeeping } from "./bookkeeping";
import { residentsRuntime } from "./modules/residents";
import { coreAPI, fillInPerson } from "./state";
import type { CoreState } from "./types";

const after = (days: number) => {
  const at = new Date(`${gameStartDate()}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
};

// A place drawn afresh each run and named in every message; GOLDEN_PATH_SEED
// replays one.
const seeds = [
  process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex"),
].map((seed) => ({ seed, place: drawPlace(seed, "core2-back-to-the-counts") }));

/**
 * The played world (every module installed) with the player's circle left
 * alone and `filled` counted households filled in, as meeting them does.
 */
function world(place: ReturnType<typeof drawPlace>, filled = 150): CoreState {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const rt = residentsRuntime(core)!;
  const player = core.playerId ? core.people.get(core.playerId) : undefined;
  const circle = new Set([
    ...(player?.familyIds ?? []),
    ...(player?.knownIds ?? []),
  ]);
  let done = 0;
  for (const record of [...rt.households.values()]) {
    if (done >= filled) break;
    if (record.people.some((p) => circle.has(p.id))) continue;
    fillInPerson(core, record.people[0]!.id);
    done++;
  }
  return core;
}

/** Every full household that is not the player's and not protected, by id. */
function candidates(core: CoreState): string[] {
  const api = coreAPI(core);
  const keep = protectedPeople(api);
  return [...core.households.values()]
    .filter(
      (home) =>
        !isDemoted({ placeId: home.placeId }) &&
        home.memberIds.some((id) => core.people.get(id)?.alive) &&
        !home.memberIds.some((id) => keep.has(id)),
    )
    .map((home) => home.id)
    .sort();
}

const fractional = (traits: Readonly<Record<string, number>>) =>
  Object.values(traits).some((v) => !Number.isInteger(v) || Math.abs(v) > 127);

/** Sends each household back; counts the ones that went and the reasons for the rest. */
function sendAllBack(
  core: CoreState,
  ids: string[],
  label: string,
): { went: string[]; refused: Map<string, string[]> } {
  const api = coreAPI(core);
  const went: string[] = [];
  const refused = new Map<string, string[]>();
  for (const id of ids) {
    const can = canReturnToCounts(api, id);
    let row;
    expect(
      () => (row = demoteHousehold(api, id, core.date)),
      `${label}: ${id}`,
    ).not.toThrow();
    if (row) {
      expect(can.ok, `${label}: ${id} went back but was refused`).toBe(true);
      went.push(id);
    } else {
      expect(can.ok, `${label}: ${id} gave nothing but could go`).toBe(false);
      const reason = can.ok ? "" : can.reason;
      refused.set(reason, [...(refused.get(reason) ?? []), id]);
    }
  }
  process.stdout.write(
    `BACK-TO-THE-COUNTS ${label}: ${went.length} went back; refused ${[
      ...refused,
    ]
      .map(([reason, list]) => `${list.length} (${reason})`)
      .join(", ")}\n`,
  );
  return { went, refused };
}

for (const { seed, place } of seeds) {
  const label = `${place.name} (${place.key}), seed ${seed}`;
  describe(`back to the counts in ${label}`, () => {
    it("sends every household back on day two without a throw, then the world runs 30 more days", () => {
      const core = world(place);
      advanceCore(core, after(1));
      const ids = candidates(core);
      expect(ids.length, label).toBeGreaterThan(0);
      // Natural fractions are officials' (see the next test); give the first
      // member of every second household some, so the exact store is read here.
      const api = coreAPI(core);
      ids.forEach((id, i) => {
        if (i % 2) return;
        const first = core.households.get(id)!.memberIds[0]!;
        const person = core.people.get(first);
        if (!person) return;
        api.updatePerson(first, {
          traits: Object.fromEntries(
            Object.entries(person.traits).map(([k, v]) => [k, v + 0.211]),
          ),
        });
      });
      sendAllBack(core, ids, label);
      expect(() => advanceCore(core, after(31)), label).not.toThrow();
    }, 900_000);

    it("changes nothing when a household is refused", () => {
      const core = world(place);
      advanceCore(core, after(1));
      const api = coreAPI(core);
      const refused = candidates(core).filter(
        (id) => !canReturnToCounts(api, id).ok,
      );
      expect(refused.length, `${label}: a refused household`).toBeGreaterThan(
        0,
      );
      const before = recordProof(core);
      for (const id of refused.slice(0, 40))
        expect(
          demoteHousehold(api, id, core.date),
          `${label}: ${id}`,
        ).toBeUndefined();
      const afterProof = recordProof(core);
      expect(afterProof.tables, label).toEqual(before.tables);
      expect(afterProof.digest, label).toBe(before.digest);
    }, 900_000);

    it("brings the same person back with every trait equal to the last decimal", () => {
      const core = world(place);
      advanceCore(core, after(1));
      const api = coreAPI(core);
      // Natural fractional traits belong to officials on the continuous scale
      // (state and federal seats, outside the counted places); none sit in a
      // household that can go back, so five people get fractions the way
      // that scale writes them (a level plus a part of a level).
      const picked = candidates(core)
        .filter((id) => canReturnToCounts(api, id).ok)
        .slice(0, 5)
        .map((id) => core.households.get(id)!.memberIds[0]!);
      expect(picked.length, `${label}: households that can go back`).toBe(5);
      const before = new Map<string, Record<string, number>>();
      picked.forEach((id, i) => {
        const traits = Object.fromEntries(
          Object.entries(core.people.get(id)!.traits).map(([k, v]) => [
            k,
            v + 0.137 * (i + 1),
          ]),
        );
        api.updatePerson(id, { traits });
        before.set(id, { ...core.people.get(id)!.traits });
        expect(fractional(before.get(id)!), `${label}: ${id}`).toBe(true);
      });
      for (const id of picked) {
        const home = core.people.get(id)!.householdId;
        expect(
          demoteHousehold(api, home, core.date),
          `${label}: ${home}`,
        ).toBeDefined();
        expect(isDemoted(core.people.get(id)!), `${label}: ${id}`).toBe(true);
      }
      for (const id of picked) {
        const back = fillInPerson(core, id);
        expect(isDemoted(back), `${label}: ${id}`).toBe(false);
        expect(back.traits, `${label}: ${id}`).toEqual(before.get(id));
      }
    }, 900_000);
  });
}

describe(`back to the counts after a played year in ${seeds[0]!.place.name} (seed ${seeds[0]!.seed})`, () => {
  it("sends 50 households back without a throw", () => {
    const { seed, place } = seeds[0]!;
    const core = world(place);
    advanceCore(core, after(365));
    const api = coreAPI(core);
    // Households in the played town first: those out of it are only refused.
    const ids = candidates(core)
      .sort((a, b) => {
        const rank = (id: string) => {
          const can = canReturnToCounts(api, id);
          return can.ok || can.reason !== "no counts kept at its place" ? 0 : 1;
        };
        return rank(a) - rank(b) || (a < b ? -1 : 1);
      })
      .slice(0, 50);
    expect(ids.length, `${place.name}, seed ${seed}`).toBeGreaterThan(0);
    sendAllBack(core, ids, `${place.name}, seed ${seed}, day 365`);
  }, 1_800_000);
});
