import { buildBenchWorld } from "./world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { heldFederal } from "../core2/office-day-federal";
import { deskWaiting, leaveDeskToCharacter } from "../core2/modules/office-day";
import {
  cabinetOf,
  leavePostOpen,
  NOMINATIONS,
} from "../core2/office-day-federal-president";
import { memberKey } from "../core2/modules/legislature";
import {
  OFFICES_MODULE_ID,
  townSeats,
  type TermRow,
} from "../core2/modules/offices";
import { coreAPI, type CoreState } from "../core2/state";
import { nominationsView, ordersDecide, ordersView } from "./office";
import { BenchPlayer } from "./player";

// No stop may trap a player: every moment that holds the clock for a governor or a president has
// a screen whose action clears it, so the days go on. A stop that is still the same stop on the same
// day after three tries is a trap, and the test names its kind. A place drawn from all 56.
const seed =
  process.env.STOPS_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

const reasons = (packet: unknown): string[] =>
  (
    (packet as { stop?: { modules?: { reasonKey: string }[] } })?.stop
      ?.modules ?? []
  ).map((m) => m.reasonKey);

/** Play `days` days, clearing each stop with `clear` (or a plain resume); returns the trapped kinds and the kinds seen. */
function play(
  core: CoreState,
  player: BenchPlayer,
  days: number,
  clear: (kinds: string[]) => boolean,
) {
  const seen = new Set<string>();
  const trapped = new Set<string>();
  const end = new Date(Date.parse(`${core.date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
  let still = 0;
  let last = "";
  for (let guard = 0; guard < days * 12 && core.date < end; guard += 1) {
    const packet = player.packet;
    if (packet?.kind === "stop") {
      const kinds = reasons(packet);
      kinds.forEach((k) => seen.add(k));
      const at = `${core.date}|${packet.pauseId}`;
      // The screen's action first, then the player's Continue, as play.mjs sends it. Several bills on
      // the desk are several actions on one stop, so an action that cleared something is progress.
      const acted = clear(kinds);
      if (player.packet?.kind === "stop")
        player.resume({ kind: "stop", pauseId: player.packet.pauseId });
      still = !acted && at === last ? still + 1 : 0;
      last = at;
      if (still >= 3) {
        kinds.forEach((k) => trapped.add(k));
        break;
      }
    } else if (packet?.kind === "choice")
      player.resume({ kind: "own-choice", pauseId: packet.pauseId });
    else player.advance("day");
  }
  return { seen: [...seen].sort(), trapped: [...trapped].sort() };
}

describe(`no stop traps the player (seed ${seed})`, () => {
  it("lets a governor clear every stop the days bring", () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "stops-governor");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const governor = townSeats(coreAPI(core)).find(
        (s) => s.office.kind === "governor",
      )?.holder;
      if (!governor) continue;
      const player = new BenchPlayer(core, world.director);
      player.select(memberKey(governor));
      const api = coreAPI(core);
      const result = play(core, player, 90, () => {
        const item = ordersView(core)[0];
        if (item) {
          ordersDecide(core, item.entryId, "issue");
          return true;
        }
        // A bill on the desk: the desk screen's own choice (here, leaving it to the character).
        const bill = deskWaiting(api)[0];
        if (!bill) {
          return false;
        }
        leaveDeskToCharacter(api, bill.id);
        return true;
      });
      console.log(`governor stops: ${where}: ${result.seen.join(", ")}`);
      expect(result.trapped, `${where}: trapped kinds`).toEqual([]);
      return;
    }
    throw new Error(`no drawn place had a governor to play (seed ${seed})`);
  }, 1_800_000);

  it("lets a president clear every stop the days bring", () => {
    const place = drawPlace(seed, "stops-president");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const president = (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", [
          "seat:US:president",
          "serving",
        ]) as unknown as TermRow[]
    )[0]?.personId;
    expect(president, where).toBeTruthy();
    const player = new BenchPlayer(core, world.director);
    player.select(president!);
    const result = play(core, player, 120, () => {
      const item = ordersView(core)[0];
      if (item) {
        ordersDecide(core, item.entryId, "issue");
        return true;
      }
      if (!heldFederal(api).includes(NOMINATIONS)) return false;
      for (const post of nominationsView(core))
        leavePostOpen(api, president!, post.post);
      return true;
    });
    console.log(`president stops: ${where}: ${result.seen.join(", ")}`);
    void cabinetOf;
    expect(result.trapped, `${where}: trapped kinds`).toEqual([]);
  }, 1_800_000);
});
