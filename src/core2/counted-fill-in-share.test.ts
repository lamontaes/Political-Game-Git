// @vitest-environment node
/**
 * A household filled in from a counted record takes its share of the group's
 * money, and never more than the record's own people hold: a record that
 * stands for less than one household once asked for more than the whole fund
 * (Central Falls, Rhode Island, seed 214f3cabe3d2caa9, and the lender replay
 * seed 8d9c26a8783ad0e0770f9c78d07fca6801e0ac64, Nov 14). Pinned to three
 * named places.
 *
 * Old premise (before group-held savings, #9597, and the savings draw): a
 * group's money was shared by people, so each record's share was bounded by
 * its people's per-head share of the fund. Since then the fund is shared by
 * savings claims (a record's people times its savings draw, over the claims
 * of every record in the group), so a record with a high draw rightly holds
 * more than its per-head share. Re-pinned with the Account lead's yes (Nov
 * 16): the bound is each record's own claim, worked out here from the
 * records (`weightedCount` and the kept `saving` draw), never from the
 * engine's share function. Seen red with the reader's cap on the record's own
 * people removed.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { fundBalance, fundGroups } from "./counted-money";
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
        const read = householdCashReader(rt);
        const shares = records.map((h) => read(h));
        // Every record of the group, as the group's account counts them, each
        // at its people times its kept savings draw.
        const members = [...(store.groups[group]?.households ?? [])].map(
          (i) => store.households[i]!,
        );
        const claim = (h: (typeof members)[number]) => {
          expect(
            h.saving,
            `${place.name}: record ${h.id} has no kept savings draw`,
          ).toBeGreaterThan(0);
          return store.weightedCount(h) * h.saving!;
        };
        const claims = members.reduce((sum, h) => sum + claim(h), 0);
        let total = 0;
        records.forEach((h, i) => {
          expect(
            shares[i],
            `${place.name}: group ${group} record ${h.id} asks more than its own claim on the fund`,
          ).toBeLessThanOrEqual(Math.floor((fund * claim(h)) / claims));
          total += shares[i]!;
        });
        expect(
          total,
          `${place.name}: group ${group} records ask more than the fund`,
        ).toBeLessThanOrEqual(fund);
      }
    } finally {
      setBookkeeping(true);
    }
  }, 70_000);
