import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import {
  billOf,
  holdVote,
  learnStake,
  memberKey,
  members,
} from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import {
  billStage,
  chooseOwnVote,
  keepStaffRedraft,
  staffRedraft,
} from "./bill-stage";
import { seatAct, seatView } from "./legislature";
import { buildBenchWorld } from "./world";

// A bill's stage view: what a member told the sponsor, then the floor result by name,
// read from the legislature's own rows. A place drawn from all 56 on a seed nobody chose.
const seed =
  process.env.BILL_STAGE_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`a bill's stage (seed ${seed})`, () => {
  it("names what members told the sponsor and each chamber's floor result", () => {
    let proved = false;
    for (let i = 0; i < 12 && !proved; i += 1) {
      const draw = drawPlace(`${seed}:${i}`, "bill-stage");
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

      const before = billStage(world.core, bill.id);
      expect(before.stage, `${draw.name} ${draw.seed}`).toBe("drafted");
      expect(before.floor).toEqual([]);

      // The sponsor talks to a colleague; the stake they learn is what that member told them.
      const colleague = memberKey(seated[1]!);
      const stake = learnStake(api, bill.id, colleague, "conversation");
      const withTold = billStage(world.core, bill.id, sponsor);
      const told = withTold.told.find((t) => t.memberId === colleague);
      // Kept only for people the game keeps reasons for (the player and who they deal with).
      if (told) {
        expect(told.side).toBe(
          stake.total > 0 ? "for" : stake.total < 0 ? "against" : "open",
        );
        expect(told.name.length).toBeGreaterThan(0);
      }

      // Staff redraft the section to split the difference with the law in force; kept, the
      // paper is rewritten and the bill is still on paper.
      const redraft = staffRedraft(world.core, bill.id, 0, sponsor);
      expect(redraft.struck).not.toBe(redraft.inserted);
      // The estimate recalculates with the staff's version: a lower floor reaches no more workers.
      expect(redraft.estimateAfter.workersRaised).toBeLessThanOrEqual(
        redraft.estimateBefore.workersRaised,
      );
      expect(redraft.value).toBe(
        Math.round(
          (((wage?.current ?? 0) + (wage?.current ?? 0) + 200) / 2) * 100,
        ) / 100,
      );
      const kept = keepStaffRedraft(world.core, bill.id, 0, sponsor);
      expect(kept.status).toBe("drafted");
      expect(billOf(api, bill.id).provisions[0]!.value).toBe(redraft.value);
      // The sponsor sits on the body, so they may choose their own vote before the floor.
      const chosen = chooseOwnVote(world.core, bill.id, "no", sponsor);
      expect(chosen.yours.chosen).toBe("no");
      holdVote(api, bill.id);
      const after = billStage(world.core, bill.id);
      expect(after.floor.length, "the floor voted").toBeGreaterThan(0);
      for (const chamber of after.floor) {
        expect(chamber.yes.length + chamber.no.length).toBeGreaterThan(0);
        expect(chamber.result, "the result in words").toMatch(
          new RegExp(
            `^(Adopted|Passed), ${chamber.yes.length} to ${chamber.no.length}\\.$|^Defeated, ${chamber.no.length} to ${chamber.yes.length}\\.$`,
          ),
        );
        for (const v of [...chamber.yes, ...chamber.no])
          expect(v.name.length, v.memberId).toBeGreaterThan(0);
      }
      // Each member the record weighed carries the reasons that pulled, strongest first, each
      // with its side and its signed magnitude (the position's own number).
      const weighed = after.floor
        .flatMap((c) => [...c.yes, ...c.no])
        .filter((v) => (v.reasons?.length ?? 0) > 0);
      expect(
        weighed.length,
        "members with reasons on the floor",
      ).toBeGreaterThan(0);
      for (const v of weighed) {
        const magnitudes = v.reasons!.map((r) => Math.abs(r.magnitude));
        expect(magnitudes, v.memberId).toEqual(
          [...magnitudes].sort((x, y) => y - x),
        );
        for (const r of v.reasons!)
          expect(r.side, `${v.memberId} ${r.reason}`).toBe(
            r.magnitude > 0 ? "for" : "against",
          );
      }
      expect(after.stage).not.toBe("drafted");
      // A bill the executive signed or vetoed names them and the reasons the record kept.
      if (after.status === "signed" || after.status === "vetoed") {
        expect(after.desk.decided.length).toBe(1);
        expect(after.desk.decided[0]!.name.length).toBeGreaterThan(0);
        expect(after.desk.decided[0]!.vote).toBe(
          after.status === "signed" ? "sign" : "veto",
        );
      }
      expect(
        after.floor.flatMap((c) => c.no).some((v) => v.memberId === sponsor),
        "the sponsor's own chosen No is on the floor result",
      ).toBe(true);
      console.log(
        `bill stage: ${draw.name} (${draw.key}, seed ${draw.seed}) ${bill.id} -> ${after.stage}, floor ${after.floor
          .map((c) => `${c.yes.length}-${c.no.length}`)
          .join("/")}`,
      );
      proved = true;
    }
    expect(proved, "a place where a bill reaches the floor").toBe(true);
  }, 300_000);
});
