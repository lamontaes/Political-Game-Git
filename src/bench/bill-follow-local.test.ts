import { buildBenchWorld } from "./world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import {
  castMemberVote,
  holdVote,
  memberKey,
  members,
} from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import { followedBills } from "./bill-stage";
import { seatAct, seatView } from "./legislature";

// A bill before the place's own council or county board is followed from home like a state's or
// Congress's: it is on the list with where it stands, and it says it reaches the player's place.
// A place drawn from all 56 on a seed nobody chose.
const seed =
  process.env.FOLLOW_LOCAL_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`following a council or county bill (seed ${seed})`, () => {
  it("lists a bill of the place's own body as reaching the place", () => {
    for (let i = 0; i < 12; i += 1) {
      const draw = drawPlace(`${seed}:${i}`, "follow-local");
      const world = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(world.core);
      const council = (
        api
          .moduleState("core2-offices-v1")
          .table("offices")
          .rows() as unknown as { id: string; kind: string }[]
      ).find((o) =>
        ["council", "township-board", "county-board"].includes(o.kind),
      );
      if (!council) continue;
      const seated = members(api, council.id);
      if (seated.length < 3) continue;
      const sponsor = memberKey(seated[0]!);
      const wage = seatView(world.core, sponsor).amounts.find(
        (a) => a.series === "minimum-wage",
      );
      let bill: { id: string; status: string };
      try {
        bill = seatAct(world.core, sponsor, {
          kind: "draft",
          officeId: council.id,
          series: "minimum-wage",
          value: (wage?.current ?? 0) + 200,
        }) as { id: string; status: string };
      } catch {
        continue;
      }
      if (bill.status !== "drafted") continue;
      const followed = followedBills(world.core).find(
        (row) => row.id === bill.id,
      );
      expect(
        followed,
        `${draw.name}: the council bill is followed`,
      ).toBeTruthy();
      expect(followed!.reachesYou).toBe(true);
      // Held to a vote, it is followed to its result and to how the place's own members voted.
      for (const member of seated)
        castMemberVote(api, bill.id, memberKey(member), "yes");
      holdVote(api, bill.id);
      const voted = followedBills(world.core).find((row) => row.id === bill.id);
      expect(
        voted!.floor.length,
        `${draw.name}: a floor result`,
      ).toBeGreaterThan(0);
      expect(voted!.floor[0]!.result).toMatch(
        /^(Adopted|Passed|Defeated), \d+ to \d+\.$/,
      );
      expect(
        voted!.mine.length,
        `${draw.name}: the place's members' votes`,
      ).toBeGreaterThan(0);
      console.log(
        `follow-local: ${draw.name} (${draw.key}, seed ${draw.seed}) ${council.kind} ${followed!.number} ${followed!.stage} -> ${voted!.stage}: ${voted!.floor[0]!.result} your members: ${voted!.mine.map((m) => m.name + " " + m.vote).join(", ")}`,
      );
      return;
    }
    throw new Error(`no drawn place had a council to draft in (seed ${seed})`);
  }, 600_000);
});
