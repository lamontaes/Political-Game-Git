import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { budgetPriorities, governments } from "../core2/modules/budgets";
import { lawChain } from "../core2/modules/laws";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { budgetLinePick, ordersDecide, ordersView } from "./office";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

// The governor the player plays is held the day the state budget is due: the lines are theirs to change
// and send, and what they send is the legislature's priorities for the year. A place drawn from all 56
// on a seed nobody chose.
const seed =
  process.env.BUDGET_STOP_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

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
      for (let guard = 0; guard < 400; guard++) {
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
        if (packet?.kind === "stop")
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        else if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else player.advance("day");
      }
      tried.push(`${where}: no budget day within 400 days`);
    }
    throw new Error(
      `no drawn place held a governor for the state budget (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);
});
