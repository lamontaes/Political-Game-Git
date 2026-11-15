/**
 * A debate asks what the seat can decide first, and a rival speaks of it
 * afterward only to someone who stood in it (owner, Nov 14: rule 99, a
 * question above the office is asked only when nothing local is live; the
 * item director-rally-opponent-names-a-debate-the-player-skipped). Pinned to
 * one drawn place with fixed seed and tags (never a draw to hope for): the
 * player files for a local race, never says yes to the debate's invitation,
 * and the race's debate is held on the eve of the vote without them.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { fileForOffice } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { contestPositions } from "./contest-positions";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { debatesIn } from "./modules/meetings";
import {
  checkEligibility,
  playerContests,
  type ContestRow,
} from "./modules/elections";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

// Burlington, Colorado (tag k of the filing-platform draw): a council race is
// open for the player, the debate is held, and the vote is 127 days after the
// player first may file, so the played days are the weeks to the debate on the
// eve of the vote (measured 99 s in all, with the world build about 13 s of it). The
// first place that draw gives, Lansdowne, Pennsylvania, is nine months from its
// vote and runs over three minutes; Plankinton, South Dakota, has a race but
// holds no debate.
const SEED = "c1-filing-platform-from-views";
const PINNED = ["filing-platform-k"];
const WEEKS = 52;

it.each(PINNED)(
  "the debate asks local questions first and names only who stood in it (%s)",
  (tag) => {
    setBookkeeping(false);
    const place = drawPlace(SEED, tag);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const playerId = core.playerId as PersonId;
    const open = () =>
      playerContests(api).find(
        (row) =>
          row.level !== "federal" &&
          row.level !== "state" &&
          checkEligibility(api, playerId, row.id).every((check) => check.met),
      );
    let contest: ContestRow | undefined = open();
    for (let week = 0; week < WEEKS && !contest; week += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      contest = open();
    }
    expect(
      contest,
      `${where}: no local race the player may file for`,
    ).toBeTruthy();
    // The player starts with no cash and the place charges a filing fee at
    // the counter, so stage the cash the fee takes.
    const me = core.people.get(playerId)!;
    me.liquidMinor = Math.max(me.liquidMinor, 1_000_000);
    const filed = fileForOffice(core, playerId, contest!.id);
    expect(filed.status, `${where}: the player's filing`).not.toBe("refused");
    advanceCore(core, addDays(makeIsoDate(contest!.electionDate), 1));
    const held = debatesIn(api, contest!.id);
    expect(held.length, `${where}: the race's debate was held`).toBe(1);
    const row = held[0]!;
    expect(row.status, where).toBe("held");
    // Every question is one the seat decides, since the race has local ones.
    const decides = new Set(contestPositions(api, contest!));
    for (const question of row.questions)
      expect(decides.has(question), `${where}: ${question}`).toBe(true);
    // The player never said yes, so the held debate does not name them.
    const record = core.durableLog.get(`debate:${row.id}` as never);
    const stood = JSON.parse(String(record?.facts?.stood)) as string[];
    expect(stood, where).not.toContain(playerId);
    expect(stood.length, where).toBeGreaterThan(0);
  },
  200_000,
);
