/**
 * An ask to carry a bill that reaches the player (pool item
 * gov-carry-ask-player-decides), in a world from buildBenchWorld in a place
 * drawn from all 56 on a seed nobody chose (CARRY_ASK_SEED pins one): the
 * player is a seated council member, two residents who know people ask them,
 * the bills table is unchanged until they answer, agreeing files the bill
 * with the player as sponsor and the asker as requestedBy, and declining
 * files nothing. The held ask has no bench screen yet (SG-GOV-carry-ask-no-screen).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { PLATFORM_QUESTIONS } from "./campaign-views";
import { gameStartDate } from "./game-start";
import {
  answerCarryAsk,
  askToCarry,
  authorityFor,
  billOf,
  carryAsksAwaiting,
  LEGISLATURE_MODULE_ID,
  type Provision,
} from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.CARRY_ASK_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 8;

it("an ask to the seated player waits for their answer; agreeing files the bill under them, declining files nothing", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "carry-ask-played");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const council = townSeats(api).filter(
      (s) => s.office.kind === "council" && s.holder?.personId,
    );
    if (council.length < 3) {
      tried.push(`${where}: ${council.length} seated council members`);
      continue;
    }
    const provision = PLATFORM_QUESTIONS.map((question): Provision => ({
      kind: "policy-question",
      question,
      value: 1,
    })).find((p) => authorityFor(api, p).allowed);
    if (!provision) {
      tried.push(`${where}: no question the council has the power to decide`);
      continue;
    }
    // The player holds a seat: a council member is the controlled person.
    const player = council[0]!.holder!.personId!;
    (core as CoreState as unknown as { playerId: string }).playerId = player;
    const seated = new Set(council.map((s) => s.holder?.personId));
    const askers = [...core.people.values()]
      .filter((p) => p.alive && !seated.has(p.id) && p.tier !== "husk")
      .sort(
        (a, b) => b.knownIds.size - a.knownIds.size || a.id.localeCompare(b.id),
      )
      .slice(0, 2);
    if (askers.length < 2) {
      tried.push(`${where}: fewer than two askers`);
      continue;
    }
    const bills = () =>
      api.moduleState(LEGISLATURE_MODULE_ID).table("bills").size;
    const before = bills();
    const [yes, no] = askers.map((asker) =>
      askToCarry(api, {
        askerId: asker.id,
        memberId: player,
        bodyOfficeId: council[0]!.office.id,
        provisions: [provision],
      }),
    ) as [ReturnType<typeof askToCarry>, ReturnType<typeof askToCarry>];
    // The engine made no choice for the player: both wait, nothing is filed.
    expect(yes.awaitingPlayer, `${where}: ${yes.id}`).toBe(true);
    expect(no.awaitingPlayer, `${where}: ${no.id}`).toBe(true);
    expect(bills(), `${where}: bills filed before the player answers`).toBe(
      before,
    );
    expect(carryAsksAwaiting(api).map((r) => r.id)).toEqual(
      [yes.id, no.id].sort(),
    );
    // Agreeing: the player sponsors the bill, the asker is on it as requestedBy.
    const agreed = answerCarryAsk(api, yes.id, true);
    const bill = billOf(api, agreed.billId!) as ReturnType<typeof billOf> & {
      requestedBy?: string;
    };
    expect(bill.sponsorId, `${where}: ${agreed.id}`).toBe(player);
    expect(bill.requestedBy, `${where}: ${agreed.id}`).toBe(yes.askerId);
    expect(bills(), where).toBe(before + 1);
    // Declining: nothing filed, the ask closed.
    const declined = answerCarryAsk(api, no.id, false);
    expect(declined.billId, `${where}: ${declined.id}`).toBeNull();
    expect(bills(), where).toBe(before + 1);
    expect(carryAsksAwaiting(api), where).toEqual([]);
    expect(() => answerCarryAsk(api, yes.id, true)).toThrow();
    process.stdout.write(
      `CARRY ASK ${where}: player ${player} (council seat ${council[0]!.office.id}); ${yes.id} agreed -> ${bill.id} (sponsorId ${bill.sponsorId}, requestedBy ${bill.requestedBy}); ${no.id} declined, bills ${before} -> ${before + 1}\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place in ${DRAWS} had a seated council and an allowed question (seed ${seed}): ${tried.join("; ")}`,
  );
}, 900_000);
