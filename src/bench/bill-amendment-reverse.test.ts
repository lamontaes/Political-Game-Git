import { buildBenchWorld } from "./world";
import { randomBytes } from "node:crypto";
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
import { billStage } from "./bill-stage";
import { seatAct, seatView } from "./legislature";

// A yes-or-no section is amended like an amount: its answer struck, the opposite inserted,
// with its own estimate and roll call. The stage view lists it as reversible.
const seed =
  process.env.BILL_AMEND_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`reversing a yes-or-no section (seed ${seed})`, () => {
  it("strikes the answer, inserts its opposite and votes it by member", () => {
    let proved = false;
    for (let i = 0; i < 12 && !proved; i += 1) {
      const draw = drawPlace(`${seed}:${i}`, "bill-amend-reverse");
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
      const question = seatView(world.core, sponsor).questions[0];
      if (!question) continue;
      let bill: { id: string; status: string };
      try {
        bill = seatAct(world.core, sponsor, {
          kind: "draft",
          officeId: council.id,
          question,
          value: 1,
        }) as { id: string; status: string };
      } catch {
        continue;
      }
      if (bill.status !== "drafted") continue;
      const section = billOf(api, bill.id).provisions[0]!;
      if (section.kind !== "policy-question") continue;
      expect(
        billStage(world.core, bill.id, sponsor).sectionsReversible,
      ).toContain(0);
      const moved = moveAmendment(api, {
        billId: bill.id,
        movedBy: memberKey(seated[1]!),
        index: 0,
        with: { ...section, value: -section.value },
      });
      expect(moved.struck.value).toBe(1);
      expect(moved.inserted.value).toBe(-1);
      expect(amendmentsOn(api, bill.id).map((a) => a.id)).toEqual([moved.id]);
      const done = voteAmendment(api, moved.id);
      expect(done.votes!.length).toBe(seated.length);
      expect(done.status).toMatch(/adopted|rejected/);
      expect(billOf(api, bill.id).provisions[0]!.value).toBe(
        done.status === "adopted" ? -1 : 1,
      );
      console.log(
        `reverse: ${draw.name} (${draw.key}, seed ${draw.seed}) ${question} ${done.status}`,
      );
      proved = true;
    }
    expect(proved, "a place where a yes-or-no section is reversed").toBe(true);
  }, 300_000);
});
