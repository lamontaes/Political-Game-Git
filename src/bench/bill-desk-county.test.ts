import { buildBenchWorld } from "./world";
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import readings from "../../data/research/local-government/county-governing-bodies.json" with { type: "json" };
import { POLICY_QUESTIONS } from "../core2/policy-answers";
import { gameStartDate } from "../core2/game-start";
import { searchCorePlaces } from "../core2/place-lookup";
import { memberKey, members } from "../core2/modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { billStage } from "./bill-stage";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";

// The county executive's desk (done-when item 5). The records say which states elect a
// county executive in every county (`electedExecutive: "all"` in the county governing-body
// data), so the place is drawn from those states, not hunted for by chance. A county board's bill
// is vetoed by the county executive, the board overrides one veto and sustains another, and
// the stage view names the executive, the veto or signature and the override tallies.
const seed =
  process.env.COUNTY_DESK_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");
const pick = <T>(list: readonly T[], salt: string): T =>
  list[
    parseInt(
      createHash("sha256").update(`${seed}:${salt}`).digest("hex").slice(0, 8),
      16,
    ) % list.length
  ]!;
const states = Object.entries(
  (
    readings as unknown as {
      structure: { states: Record<string, { electedExecutive?: string }> };
    }
  ).structure.states,
)
  .filter(([, row]) => row.electedExecutive === "all")
  .map(([usps]) => `US-${usps}`);

describe(`the county executive's desk (seed ${seed})`, () => {
  it("vetoes a county board's bill; the board overrides one veto and sustains another", () => {
    expect(
      states.length,
      "states whose counties all elect an executive",
    ).toBeGreaterThan(0);
    const tried: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const state = pick(states, `state:${i}`);
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      const place = pick(places, `place:${i}`);
      const world = buildBenchWorld(`${seed}:${i}`, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(world.core);
      const where = `${place.displayName} (${state}, ${place.key}), seed ${seed}:${i}`;
      const offices = api
        .moduleState(OFFICES_MODULE_ID)
        .table("offices")
        .rows() as unknown as { id: string; kind: string }[];
      const board = offices.find((o) => o.kind === "county-board");
      const executiveOffice = offices.find(
        (o) => o.kind === "county-executive",
      );
      expect(
        executiveOffice,
        `${where}: the data says every county here elects an executive`,
      ).toBeDefined();
      if (!board || members(api, board.id).length < 2) {
        tried.push(`${where}: no county board with members`);
        continue;
      }
      const executive = (
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .rows() as unknown as TermRow[]
      ).find(
        (t) => t.officeId === executiveOffice!.id && t.status === "serving",
      );
      expect(executive, `${where}: the executive is seated`).toBeDefined();
      const dev = new DevMode(
        world.core,
        world.director,
        new BenchPlayer(world.core, world.director),
        world.placeId,
      );
      const sponsor = memberKey(members(api, board.id)[0]!);
      // A question the county may act on (the state's law bars some from a county).
      const series = ["minimum-wage", ...Object.keys(POLICY_QUESTIONS)].find(
        (candidate) =>
          dev.introduce({
            bodyOfficeId: board.id,
            sponsorId: sponsor,
            series: candidate,
            value: candidate === "minimum-wage" ? 1500 : 1,
          }).bill.status !== "blocked",
      );
      if (!series) {
        tried.push(`${where}: the county may not act on any question`);
        continue;
      }
      const file = (n: number) =>
        dev.introduce({
          bodyOfficeId: board.id,
          sponsorId: sponsor,
          series,
          value: series === "minimum-wage" ? 1500 + n : 1,
        }).bill;
      const first = file(0);
      const vetoed = dev.decideAt(first.id, 6, {
        sign: false,
        overrideMargin: -6,
      });
      expect(vetoed.veto, `${where}: the county executive holds a veto`).toBe(
        true,
      );
      expect(vetoed.bill.status, where).toBe("vetoed");
      const overridden = file(10);
      const over = dev.decideAt(overridden.id, 6, {
        sign: false,
        overrideMargin: 6,
      });
      expect(over.bill.status, where).toBe("overridden");
      const signed = file(30);
      const done = dev.decideAt(signed.id, 6, { sign: true });
      expect(done.bill.status, where).toBe("enacted");
      // The stage view names the executive's veto and the override vote.
      const stage = billStage(world.core, overridden.id, executive!.personId!);
      expect(stage.desk.decided.length, where).toBe(1);
      expect(stage.desk.decided[0]!.vote, where).toBe("veto");
      expect(
        stage.override.length,
        `${where}: the board voted to override`,
      ).toBeGreaterThan(0);
      process.stderr.write(
        `county desk: ${where}: veto sustained on ${first.id}; veto overridden on ${overridden.id}; signed ${signed.id}\n`,
      );
      return;
    }
    throw new Error(
      `no drawn county board took a bill (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);
});
