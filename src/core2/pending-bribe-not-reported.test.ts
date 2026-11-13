import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { considerBribe } from "./modules/corruption";
import { JUSTICE_MODULE_ID } from "./modules/justice";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

// A bribe offered to the player's seat waits for the player's answer in the
// bribe-offer scene. On main the justice engine read the waiting offer as
// refused and filed the player's complaint the same day, before the player had
// seen it (Playtester P2, Nov 13, Fruitland, Idaho, seed
// 6c66ce96-86ed-47d7-ad37-063de2ddc0bf: two offers on Feb 1, two complaints
// "by" the player on Feb 1, and an accusation scene the next day).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const OFFERERS = 12;

it(`an offer waiting for the player's answer is never reported in the player's name, seed ${seed}`, () => {
  setBookkeeping(false);
  for (let draw = 0; draw < 2; draw++) {
    const place = drawPlace(`${seed}:${draw}`, "pending-bribe");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core, playerId } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const me = playerId as PersonId;
    // HAND-STAGED: several people offer the player money; each offer is put
    // to the player (pending) and the player has not answered.
    const offerers = [...core.people.values()]
      .filter((p) => p.alive && p.id !== me && p.tier !== "husk")
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, OFFERERS);
    const offered: string[] = [];
    for (const [index, offerer] of offerers.entries()) {
      offerer.liquidMinor = 5_000_000;
      const record = considerBribe(api, {
        offererId: offerer.id,
        officialId: me,
        stakeMinor: 20_000_000,
        subjectId: `contract:pending-${draw}-${index}`,
        pick: { offer: true },
      });
      if (record?.offered) offered.push(record.id);
    }
    expect(offered.length, `${where}: no offer was made`).toBeGreaterThan(0);
    advanceCore(core, addDays(makeIsoDate(core.date), 3));
    const complaints = api
      .moduleState(JUSTICE_MODULE_ID)
      .table("complaints")
      .rows() as unknown as {
      id: string;
      crimeId: string;
      reporterId: string;
    }[];
    const filed = complaints.filter(
      (row) => offered.includes(row.crimeId) && row.reporterId === me,
    );
    expect(
      filed.map((row) => row.id),
      `${where}: ${offered.length} offers waiting for the player`,
    ).toEqual([]);
  }
}, 600_000);
