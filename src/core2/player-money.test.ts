/**
 * The player's money in a played year (pool item core-player-money-spending):
 * once the player takes a job (their own act), their pay arrives and rent or
 * mortgage, living costs, taxes and utilities leave their account, by journal
 * record; and nothing else moves it. A world campaign's asks never draw on the
 * controlled person (owner, Oct 14: the engine offers, the player decides).
 * One pinned seed that showed 106 unasked gifts, and one random place.
 */
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { acceptJobOffer, jobOffersFor } from "./modules/jobs";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const PINNED_CANNABIS =
  "882f087cbdc1f53b3b6ac0f190d8de0549a6107f418a5dd30c6ef81c61c30e7f"; // Nevada: a dependent player was charged the household's cannabis spending
const PINNED = "d97611412a84"; // Lake Ridge, Virginia: before the fix, 106 gifts to a Lt. Governor campaign

function playYear(worldSeed: string, placeKey?: string) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    ...(placeKey ? { placeKey } : {}),
  });
  const api = coreAPI(core);
  const playerId = core.playerId!;
  const kinds = new Map<
    string,
    { n: number; inMinor: number; outMinor: number; sample: string }
  >();
  const post = api.postJournal.bind(api);
  api.postJournal = (entry) => {
    for (const row of entry.postings) {
      if (core.cashJournal.accounts.get(row.accountId)?.ownerId !== playerId)
        continue;
      const head = String(entry.sourceRef.id).split(/[:@]/)[0]!;
      const kind = kinds.get(head) ?? {
        n: 0,
        inMinor: 0,
        outMinor: 0,
        sample: String(entry.sourceRef.id),
      };
      kind.n += 1;
      if (row.deltaMinor > 0) kind.inMinor += row.deltaMinor;
      else kind.outMinor -= row.deltaMinor;
      kinds.set(head, kind);
    }
    return post(entry);
  };
  const campaignGifts: string[] = [];
  const postAgain = api.postJournal;
  api.postJournal = (entry) => {
    const id = String(entry.sourceRef.id);
    if (
      id.startsWith("donation:filing:") &&
      entry.postings.some(
        (row) =>
          row.deltaMinor < 0 &&
          core.cashJournal.accounts.get(row.accountId)?.ownerId === playerId,
      )
    )
      campaignGifts.push(id);
    return postAgain(entry);
  };
  let tookJob: string | null = null;
  for (let day = 0; day < 365; day += 15) {
    advanceCore(core, addDays(makeIsoDate(core.date), 15));
    const offer = tookJob ? undefined : jobOffersFor(api, playerId)[0];
    // Taking the offered job is the player's own act.
    if (offer && acceptJobOffer(api, offer.id)) tookJob = offer.id;
  }
  return { core, playerId, kinds, tookJob, campaignGifts };
}

describe("the player's money", () => {
  for (const [label, worldSeed, placeKey] of [
    ["pinned seed", PINNED, undefined],
    // A dependent player in a state where cannabis sales are legal: the
    // household's price change fell on the player's account.
    ["pinned seed, cannabis state", PINNED_CANNABIS, "3269200"],
    [
      "random place",
      ...(() => {
        const place = drawPlace(
          createHash("sha256").update(seed).digest("hex"),
          "player-money",
        );
        return [place.seed, place.key] as const;
      })(),
    ],
  ] as const)
    it(`${label}: pay in, living costs out, and no unasked gift (seed ${worldSeed})`, () => {
      const { core, playerId, kinds, tookJob, campaignGifts } = playYear(
        worldSeed,
        placeKey,
      );
      const where = `${label}, seed ${worldSeed}, place ${placeKey ?? "from seed"}`;
      // No world campaign drew a gift from the player's account: only the
      // player's own act gives to a candidate.
      expect(campaignGifts, where).toEqual([]);
      if (!tookJob) {
        // No offer came in the year: a dependent player has no flows at all.
        expect(kinds.size, where).toBe(0);
        return;
      }
      const pay = kinds.get("work-payroll");
      expect(pay?.inMinor ?? 0, `${where}: pay`).toBeGreaterThan(0);
      let spent = 0;
      for (const [head, kind] of kinds)
        if (
          [
            "finance",
            "living",
            "property-tax",
            "withholding",
            "price",
          ].includes(head)
        )
          spent += kind.outMinor;
      expect(spent, `${where}: costs out`).toBeGreaterThan(0);
      const cash = core.people.get(playerId)!.liquidMinor;
      const inTotal = [...kinds.values()].reduce((n, k) => n + k.inMinor, 0);
      const outTotal = [...kinds.values()].reduce((n, k) => n + k.outMinor, 0);
      expect(
        cash,
        `${where}: cash equals what came in less what went out`,
      ).toBe(inTotal - outTotal);
    }, 900_000);
});
