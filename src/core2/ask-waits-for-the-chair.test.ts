/**
 * The sponsor's evening-before asks wait for the chair (pool item
 * legislature-ask-waits-for-the-players-committee). A committee the player
 * sits on meets on the floor day, inside the vote, so the evening before it
 * has no record yet; the asks read the chair's decision (`chairHears`), the
 * same one the committee stage decides by, and nobody is asked about a bill
 * its chair will hold. Played in the bench world at Brandon, Montana, drawn as
 * drawPlace("play-n3", "bargaining-play"): the player sits in the state House
 * and drafts bills until one goes to a committee they sit on whose chair will
 * not hear it (found by bargaining's play, Nov 14 2026: HB 30 was asked about,
 * then held on the floor day).
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { seatAct, seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  LEGISLATURE_MODULE_ID,
  billOf,
  castMemberVote,
  chairHears,
  memberKey,
  members,
} from "./modules/legislature";
import { OFFICE_DAY_MODULE_ID } from "./modules/office-day";
import { coreAPI } from "./state";
import type { CoreEventInput, PersonId } from "./types";

const SEED = "play-n3";
const BODY = "office:US-MT:legislature-lower";
const DRAFTS = 30;

it(`no one is asked the evening before about a bill the player's committee chair will hold, at Brandon, MT (drawPlace("${SEED}"))`, () => {
  setBookkeeping(false);
  const place = drawPlace(SEED, "bargaining-play");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  expect(place.key, where).toBe("3009400");
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const seated = members(api, BODY)
    .map(memberKey)
    .filter((id) => core.people.get(id as PersonId)?.alive)
    .sort();
  core.playerId = seated[0]! as PersonId;
  const player = core.playerId;
  // The player has met the chamber: every member is watched, as in play.
  for (const id of seated) {
    core.focusPersonIds.add(id as PersonId);
    director.watch(core, id as PersonId);
  }
  // The player drafts the platform's first bills in order and presses Yes on each.
  const drafted: string[] = [];
  for (const question of seatView(core, player).questions) {
    const bill = seatAct(core, player, {
      kind: "draft",
      officeId: BODY,
      question,
      value: 1,
    });
    castMemberVote(api, bill.id, player, "yes");
    drafted.push(bill.id);
    // The thirty bills of bargaining's play there (HB 3 to HB 32).
    if (drafted.length === DRAFTS) break;
  }
  // At each ask, a bill whose committee has not met yet is one its chair
  // hears, read at that moment.
  const waited: { ask: string; heard: boolean }[] = [];
  let asked = 0;
  api.subscribeEvents("ask-waits-test", ["vote-ahead"], (_, e) => {
    const id = String(e.facts?.billId ?? "");
    if (!drafted.includes(id)) return;
    asked += 1;
    const bill = billOf(api, id);
    if (
      api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("committees")
        .get(`committee:${id}:${BODY}`)
    )
      return;
    waited.push({ ask: e.id, heard: chairHears(api, bill, BODY).heard });
  });
  const start = makeIsoDate(gameStartDate());
  for (
    let day = 1;
    day <= 60 && drafted.some((id) => billOf(api, id).status === "drafted");
    day += 1
  )
    advanceCore(core, addDays(start, day));
  expect(
    waited.filter((row) => !row.heard).map((row) => row.ask),
    `${where}: asked about a bill its chair would hold`,
  ).toEqual([]);
  process.stdout.write(
    `ASK WAITS ${where}: ${drafted.length} bills, ${asked} asks, ${waited.length} on a bill whose committee had not met, every one heard by its chair\n`,
  );
}, 300_000);
