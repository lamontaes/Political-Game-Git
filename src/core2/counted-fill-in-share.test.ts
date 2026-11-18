// @vitest-environment node
/**
 * A household filled in from a counted record takes its share of the group's
 * money, and never more than the record's own people hold: a record that
 * stands for less than one household once asked for more than the whole fund
 * (Central Falls, Rhode Island, seed 214f3cabe3d2caa9, and the lender replay
 * seed 8d9c26a8783ad0e0770f9c78d07fca6801e0ac64, Nov 14). Pinned to three
 * named places.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { fundBalance, fundGroups, peopleInGroup } from "./counted-money";
import { householdCashReader, residentsRuntime } from "./modules/residents";

const PLACES = [
  {
    name: "Central Falls, Rhode Island",
    key: "4414140",
    seed: "214f3cabe3d2caa9",
  },
  {
    name: "Larned, Kansas",
    key: "2038700",
    seed: "0f76ad5a90c444afa08206f08bc3e13754bc031f5951ed0b119a37caf3140b96",
  },
  {
    name: "Merizo, Guam",
    key: "territory:GU:merizo",
    seed: "694d6b048bc18cc1e71032826d983397940f05a47ef0ac91d09ebadf323544d4",
  },
];

for (const place of PLACES)
  it(`no record's fill-in share passes its group's fund when every record stands for less than a household: ${place.name}`, () => {
    setBookkeeping(false);
    try {
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const rt = residentsRuntime(core)!;
      // The groups' funds open with the first day.
      rt.api = api;
      fundGroups(api, rt);
      const store = rt.store;
      const groups = new Map<number, typeof store.households>();
      for (const h of store.liveHouseholds()) {
        if (h.group < 0) continue;
        groups.set(h.group, [...(groups.get(h.group) ?? []), h]);
      }
      // A group of two or more records with some money in its fund.
      const crowded = [...groups.entries()].filter(
        ([group, records]) =>
          records.length >= 2 && fundBalance(api, rt, group) > 0,
      );
      expect(crowded.length, `${place.name}: no group to test`).toBeGreaterThan(
        0,
      );
      for (const [group, records] of crowded.slice(0, 20)) {
        for (const h of records) h.weight = 0.3;
        store.version++;
        for (const h of records) store.touch(h);
        const fund = fundBalance(api, rt, group);
        const people = peopleInGroup(rt, group);
        const read = householdCashReader(rt);
        let total = 0;
        for (const h of records) {
          const share = read(h);
          expect(
            share,
            `${place.name}: group ${group} record ${h.id} asks more than its people hold`,
          ).toBeLessThanOrEqual(
            Math.floor((fund * store.weightedCount(h)) / people),
          );
          total += share;
        }
        expect(
          total,
          `${place.name}: group ${group} records ask more than the fund`,
        ).toBeLessThanOrEqual(fund);
      }
    } finally {
      setBookkeeping(true);
    }
  }, 600_000);
