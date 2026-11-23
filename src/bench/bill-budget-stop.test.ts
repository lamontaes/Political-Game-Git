import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { addDays } from "../core2/kernel/dates";
import { budgetPriorities, governments } from "../core2/modules/budgets";
import { lawChain } from "../core2/modules/laws";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import {
  budgetLinePick,
  leaveHoldsToCharacter,
  ordersDecide,
  ordersView,
} from "./office";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

// The governor the player plays is held the day the state budget is due: the lines are theirs to change
// and send, and what they send is the legislature's priorities for the year. A place drawn from all 56
// on a seed nobody chose.
// Pinned (Nov 16, trial batch). Before, the seed came at run time from
// process.env BUDGET_STOP_SEED, GOLDEN_PATH_SEED or randomBytes, so the places
// it drew changed every run. The fixed seed below draws West Plains, Missouri
// (2978928) first for "budget-stop".
// Limit: the slowest case took 242 s, run two files at a time (Nov 16,
// Train 6d12556a); each case's limit is about twice that, 490 s.
const seed = "pin-bill-budget-stop";
// How long a draw is played for its budget day before it is passed over: a
// governor whose state's budget day this year fell before the game starts
// (Missouri's, ten days after its January session opens) sends the next one a
// year later. Test parameter.
const BUDGET_WINDOW_DAYS = 60;

it("draws its pinned place from the fixed seed", () => {
  expect(drawPlace(`${seed}:0`, "budget-stop")).toMatchObject({
    key: "2978928",
    name: "West Plains, Missouri",
  });
});

describe(`the governor sends the state budget (seed ${seed})`, () => {
  it("stops the governor the day the budget is due and sends the lines they set", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "budget-stop");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const governor = townSeats(api).find((s) => s.office.kind === "governor")
        ?.holder?.personId;
      if (!governor || !core.people.has(governor)) {
        tried.push(`${where}: no governor to play`);
        continue;
      }
      const player = new BenchPlayer(core, world.director);
      player.select(governor);
      const until = addDays(gameStartDate(), BUDGET_WINDOW_DAYS);
      for (let guard = 0; guard < 400 && core.date <= until; guard++) {
        const offer = ordersView(core).find((row) => row.kind === "budget");
        if (offer && offer.kind === "budget") {
          expect(offer.lines.length, where).toBeGreaterThan(0);
          const line = offer.lines[0]!;
          const change = Math.round(line.amountMinor / 10);
          budgetLinePick(core, governor, line.line, change);
          ordersDecide(core, offer.entryId, "issue");
          const gov = governments(api).find(
            (g) => g.id === lawChain(api).stateKey,
          )!;
          const sent = budgetPriorities(api, gov.id);
          expect(sent?.setBy, where).toBe(governor);
          expect(sent?.changes[line.line], where).toBe(change);
          console.log(
            `budget stop: ${where}, ${line.name} raised by ${change}, sent on ${core.date}`,
          );
          return;
        }
        if (player.pollingPlace) player.leavePolls();
        const packet = player.packet;
        // A held desk order before the budget day (a cabinet post, the State
        // of the State, a bill on the desk) waits for the governor's own
        // decision: left to the character, as a player who presses on does.
        // Pressing Continue alone never moves the day past it (Nov 19: the
        // history seats a new governor with posts open, and Missouri,
        // Alabama and Pennsylvania were passed over on main and the train).
        if (packet?.kind === "stop") {
          leaveHoldsToCharacter(core, governor);
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        } else if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else player.advance("day");
      }
      tried.push(
        `${where}: no budget day by ${core.date} (${BUDGET_WINDOW_DAYS} days)`,
      );
    }
    throw new Error(
      `no drawn place held a governor for the state budget (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 490_000);
});
