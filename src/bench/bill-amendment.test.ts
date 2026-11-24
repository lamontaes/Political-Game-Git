import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import {
  amendmentsOn,
  billOf,
  memberKey,
  members,
  moveAmendment,
  voteAmendment,
} from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import { seatAct, seatView } from "./legislature";
import { buildBenchWorld } from "./world";

// An amendment is its own record: the section struck and the one inserted, the bill's
// estimate with it, the body's roll call by member, and the bill rewritten only when the
// body adopts it. Played at the pinned place below.
// Pinned (Nov 16). Before, the seed came at run time from BILL_AMEND_SEED,
// GOLDEN_PATH_SEED or randomBytes, and the case drew up to twelve places until
// one let a member draft the local minimum-wage ordinance. Most draws land in
// states whose law gives towns no minimum-wage authority, where the draft is
// rightly blocked (12 of 12 at seed pin-bill-amendment on the Train at
// 6d12556a; Brookfield Center CT, Grenloch NJ and Beatty NV read
// "state-gives-no-local-minimum-wage"). The place below is the old loop's
// 25th draw at seed pin-bill-amendment, Fulton, Illinois, in a state whose
// row grants the authority (law:US-IL local-minimum-wage-authority, value 1);
// its council of five drafts the ordinance.
// Limit: the case took 38 s, run beside two other test files (Nov 16, Train 544056f5); its limit is about twice that, 80 s.
const seed = "pin-bill-amendment";
const PLACE = {
  key: "1728144",
  name: "Fulton, Illinois",
  seed: "8ef1f310c74ca4c558ddc233d0deafd9f197641b84fe62caf59434102cb9f176",
};

it("draws its pinned place from the fixed seed", () => {
  expect(drawPlace(`${seed}:24`, "bill-amend")).toMatchObject(PLACE);
});

describe(`an amendment (seed ${seed})`, () => {
  it("is voted by the body's own positions and rewrites the bill only when adopted", () => {
    let proved = false;
    for (const draw of [PLACE]) {
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
      const bill = seatAct(world.core, sponsor, {
        kind: "draft",
        officeId: council.id,
        series: "minimum-wage",
        value: (wage?.current ?? 0) + 200,
      }) as { id: string; status: string };
      if (bill.status !== "drafted") continue;
      const drafted = billOf(api, bill.id);
      const section = drafted.provisions[0]!;
      const moved = moveAmendment(api, {
        billId: bill.id,
        movedBy: memberKey(seated[1]!),
        index: 0,
        with: { ...section, value: section.value + 100 },
      });
      expect(moved.status).toBe("moved");
      expect(billOf(api, bill.id).provisions[0]!.value, "not yet changed").toBe(
        section.value,
      );
      expect(amendmentsOn(api, bill.id).map((a) => a.id)).toEqual([moved.id]);
      expect(moved.estimateAfter.annualPayMinor).toBeGreaterThanOrEqual(
        moved.estimateBefore.annualPayMinor,
      );
      const done = voteAmendment(api, moved.id);
      const yes = done.votes!.filter((v) => v.vote === "yes").length;
      const no = done.votes!.filter((v) => v.vote === "no").length;
      expect(done.votes!.length).toBe(seated.length);
      expect(
        done.votes!.some((v) => v.vote !== "abstain"),
        "members weigh the amendment, not all abstain",
      ).toBe(true);
      expect(done.status).toBe(yes > no ? "adopted" : "rejected");
      expect(billOf(api, bill.id).provisions[0]!.value).toBe(
        yes > no ? section.value + 100 : section.value,
      );
      console.log(
        `amendment: ${draw.name} (${draw.key}, seed ${draw.seed}) ${moved.id} ${done.status} ${yes}-${no}`,
      );
      proved = true;
    }
    expect(proved, "a place where an amendment is voted").toBe(true);
  }, 80_000);
});
