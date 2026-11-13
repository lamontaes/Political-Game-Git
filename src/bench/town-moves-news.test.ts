// @vitest-environment node
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { coreAPI } from "../core2/state";
import { lawChain } from "../core2/modules/laws";
import { MOVED_AWAY_EVENT } from "../core2/modules/people";
import { PRESS_MODULE_ID } from "../core2/modules/press";

// A household that moves away from the town is the town's news
// (play-town-moves-news-line): in a drawn place played week by week, the
// first move away from the town (the moves engine's person.moved-away record)
// goes on the press's wire as moved-away:<record id>, and a local outlet
// prints it. Fails when a known household's move prints no story.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("prints a move away from the town as a story citing its record", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < 4; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "town-moves-news");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const town = lawChain(api).townPlaceId;
    const moved = () =>
      [...(core.logByKind.get(MOVED_AWAY_EVENT) ?? [])]
        .map((id) => core.durableLog.get(id))
        .filter(
          (row) =>
            row &&
            row.placeId === town &&
            !row.facts?.["moves:elsewhere"] &&
            row.personIds.some((id) => core.people.has(id)),
        );
    let found = moved()[0];
    for (let week = 0; week < 52 && !found; week += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      found = moved()[0];
    }
    if (!found) {
      tried.push(`${where}: no household moved away in a year`);
      continue;
    }
    // Two weeks for the press's weekly step and its desk.
    advanceCore(core, addDays(makeIsoDate(core.date), 14));
    const press = api.moduleState(PRESS_MODULE_ID);
    // The wire item is cleared once printed; the printed stories keep its id
    // and the facts it carried.
    const wireId = `moved-away:${found.id}`;
    const printed = (
      press.table("stories").rows() as unknown as {
        id: string;
        wireId: string;
        outletId: string;
        facts?: Record<string, string>;
      }[]
    ).filter((row) => row.wireId === wireId);
    console.log(
      `${where}: ${found.id} (${found.date}), printed by ${printed.map((row) => row.outletId).join(", ") || "none"}; facts ${JSON.stringify(printed[0]?.facts ?? {}).slice(0, 200)}; passed over: ${tried.join(" | ")}`,
    );
    expect(
      printed.length,
      `${where}: no outlet printed ${found.id}`,
    ).toBeGreaterThan(0);
    return;
  }
  throw new Error(`no move away in four drawn places: ${tried.join(" | ")}`);
}, 1_800_000);
