/**
 * A player who takes the governor's seat keeps the sitting cabinet until they
 * name someone themselves (executive-player-governor-cabinet-named-without-press).
 * Before, the executive's review named a whole new cabinet in the player's
 * name about 30 days in (2025-02-19 at Edgar), each confirmed by the state
 * senate, with no press from the player. The player's choices are the
 * player's (OWNER-DECISIONS.md, Oct 14: "No engine accepts a job, a home, a
 * filing or any choice for the controlled person").
 *
 * HAND-STAGED: the player seated as governor (`seatPlayerInStateOffice`, the
 * dev start as a sitting officeholder). The 60 days after are the game's own.
 *
 * Pinned: Edgar, Wisconsin (5522550), seed edgar-petition-1.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { appointmentsIn, statePostsToFill } from "./modules/executive";
import { lawChain } from "./modules/laws";
import { seatPlayerInStateOffice } from "./office-day-state";
import { coreAPI } from "./state";

const PLACE = "5522550";
const SEED = "edgar-petition-1";
const where = `Edgar, Wisconsin (${PLACE}), seed ${SEED}`;

it(`${where}: a player who becomes governor keeps the sitting cabinet; nobody is named in their name`, () => {
  const previous = setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(SEED, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE,
    });
    const api = coreAPI(core);
    const player = core.playerId!;
    const state = lawChain(api).stateKey;
    seatPlayerInStateOffice(api, { personId: player, role: "governor" });
    const sitting = new Map(
      appointmentsIn(api, state).map((row) => [row.post, row.holderId]),
    );
    expect(sitting.size, `${where}: the cabinet`).toBeGreaterThan(5);
    advanceCore(core, addDays(makeIsoDate(core.date), 60));
    for (const row of appointmentsIn(api, state)) {
      expect(row.appointedBy, `${where}: ${row.post}`).not.toBe(player);
      // Each sitting member still serves, or their post stands open for the
      // player (one who died or left in the 60 days).
      if (row.holderId !== sitting.get(row.post))
        throw new Error(`${where}: ${row.post} went to ${row.holderId}`);
    }
    const open = statePostsToFill(api, player).map((p) => p.key);
    for (const post of open)
      expect(
        core.people.get(sitting.get(post) as never)?.alive,
        where,
      ).not.toBe(true);
  } finally {
    setBookkeeping(previous);
  }
}, 120_000);
