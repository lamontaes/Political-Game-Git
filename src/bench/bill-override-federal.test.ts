import { buildBenchWorld } from "./world";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { heldFederal, releaseFederal } from "../core2/office-day-federal";
import { lawInForce } from "../core2/modules/laws";
import {
  FEDERAL_HOUSE,
  memberKey,
  members,
  overridePending,
  votesOn,
} from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import { billStage, callOverrideVote, chooseOverrideVote } from "./bill-stage";
import { DevMode } from "./dev-mode";
import { BenchPlayer } from "./player";

// The override of a presidential veto at the federal level: the player is a member of the House, the
// president (not the player) vetoes a bill Congress passed, the override waits for the player's own
// vote, and counts it when the body takes it up.
// Pinned (Nov 16). Before, the seed came at run time from OVERRIDE_FEDERAL_SEED, GOLDEN_PATH_SEED or
// randomBytes, and the case drew up to six places.
// Old premise: every member but the player voted yes by castMemberVote, and the bill went from the
// House to the president's desk. castMemberVote sets floor votes only; the Senate's committee reports
// from its own members' positions, did not report, and the bill failed on day one in every draw, so
// the case passed over every place without ever reaching a veto. Now dev mode's own route,
// DevMode.decideAt (as bill-override-federal-dev.test does), carries it: each chamber and its committee
// vote through the members' own votes at a margin of 100, each committee's chair hears it, and the
// president vetoes through executiveDecision. No override margin is given, so no override vote is cast
// and the override waits for the player's press, which is counted as before.
// The fixed seed draws Circleville, Utah (4912970) first for "override-federal".
// Seen red with the margin at -100: the House voted it down, 167 to 267, and the case stopped at the veto check.
// Limit: the case took 19 s (Nov 16, Train ff41d81e); its limit is about twice that, 40 s.
const seed = "pin-bill-override-federal";
const PLACE = {
  key: "4912970",
  name: "Circleville, Utah",
  seed: "3b7af9f0a9c5c801a60d3df8e3e02edfb8975a7e485c6bdcbe2affe81a4e9f7b",
};

it("draws its pinned place from the fixed seed", () => {
  expect(drawPlace(`${seed}:0`, "override-federal")).toMatchObject(PLACE);
});

describe(`a presidential veto the player may override (seed ${seed})`, () => {
  it("waits for the player's own vote and counts it", () => {
    const world = buildBenchWorld(PLACE.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const where = `${PLACE.name} (${PLACE.key}), seed ${PLACE.seed}`;
    const house = members(api, FEDERAL_HOUSE);
    expect(house.length, `${where}: a House`).toBeGreaterThan(1);
    const sponsor = memberKey(house[0]!);
    const member = memberKey(house[1]!);
    const player = new BenchPlayer(core, world.director);
    player.select(member);
    const start = core.date;
    for (let guard = 0; guard < 50 && core.date <= start; guard += 1) {
      const packet = player.packet;
      if (packet?.kind === "stop") {
        for (const key of heldFederal(api)) releaseFederal(api, key);
        player.resume({ kind: "stop", pauseId: packet.pauseId });
      } else if (packet?.kind === "choice")
        player.resume({ kind: "own-choice", pauseId: packet.pauseId });
      else player.advance("day");
    }
    const dev = new DevMode(core, world.director, player, world.placeId);
    const floor = lawInForce(api, "minimum-wage").value ?? 0;
    const filed = dev.introduce({
      bodyOfficeId: FEDERAL_HOUSE,
      sponsorId: sponsor,
      series: "minimum-wage",
      value: floor + 100,
    }).bill;
    expect(filed.status, `${where}: the bill is filed`).not.toBe("blocked");
    const result = dev.decideAt(filed.id, 100, {
      sign: false,
      chairHears: true,
    });
    // The bill reached the veto: both chambers passed it, the president vetoed it, and the override
    // waits on the player. A bill that failed in a chamber or its committee stops here.
    expect(
      result.bill.status,
      `${where}: ${JSON.stringify(result.ending ?? result.bill.status)}`,
    ).toBe("vetoed");
    const stage = billStage(core, filed.id, member);
    expect(stage.desk.decided[0]?.vote, `${where}: the president's veto`).toBe(
      "veto",
    );
    expect(stage.yours.overridePending, `${where}: the override waits`).toBe(
      true,
    );
    expect(overridePending(api, filed.id), where).toBe(true);
    chooseOverrideVote(core, filed.id, "yes", member);
    callOverrideVote(core, filed.id, member);
    expect(overridePending(api, filed.id), where).toBe(false);
    const mine = votesOn(api, filed.id).find(
      (v) => v.memberId === member && (v as { override?: boolean }).override,
    );
    expect(mine?.vote, where).toBe("yes");
    console.log(
      `override-federal: ${where}, ${filed.id}, the player voted yes on the override; bill now ${billStage(core, filed.id, member).status}`,
    );
  }, 40_000);
});
