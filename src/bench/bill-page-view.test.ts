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
import { billPageView } from "./bill-stage";
import { seatAct, seatView } from "./legislature";

// The bill page's one object: the name, the stage and its day, the sponsor, each section's label
// key, amount, law in force and level, the tally at each stage and where it reaches. A place drawn
// from all 56 on a seed nobody chose.
const seed =
  process.env.BILL_PAGE_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`the bill page's view (seed ${seed})`, () => {
  it("gives a voted bill everything the page shows, with nothing left to compute", () => {
    const tried: string[] = [];
    for (let i = 0; i < 16; i += 1) {
      const draw = drawPlace(`${seed}:${i}`, "bill-page");
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
      if (!council) {
        tried.push(`${draw.name}: no council`);
        continue;
      }
      const seated = members(api, council.id);
      if (seated.length < 3) {
        tried.push(`${draw.name}: ${seated.length} seated`);
        continue;
      }
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
      } catch (error) {
        tried.push(`${draw.name}: ${(error as Error).message}`);
        continue;
      }
      if (bill.status !== "drafted") {
        tried.push(`${draw.name}: ${bill.status}`);
        continue;
      }
      for (const member of seated)
        castMemberVote(api, bill.id, memberKey(member), "yes");
      holdVote(api, bill.id);
      const page = billPageView(world.core, bill.id, sponsor);
      expect(page.name.length, draw.name).toBeGreaterThan(0);
      expect(page.sponsor.name.length, draw.name).toBeGreaterThan(0);
      expect(page.stageDate, `${draw.name}: the stage's day`).toBeTruthy();
      expect(page.sections.length, draw.name).toBeGreaterThan(0);
      const first = page.sections[0]!;
      expect(first.labelKey, draw.name).toBe("minimum-wage");
      expect(first.amountMinor, `${draw.name}: the wage in minor units`).toBe(
        (wage?.current ?? 0) + 200,
      );
      expect(
        first.changeMinor,
        `${draw.name}: the raise over the law in force`,
      ).toBe(200);
      expect(
        first.changePct!,
        `${draw.name}: the raise as a share of the wage in force`,
      ).toBeCloseTo((200 / (wage?.current || 1)) * 100, 6);
      // A rate is not a sum: only budget lines make the bill's total change.
      expect(page.totalChangeMinor, draw.name).toBeNull();
      expect(
        page.tallies.some((t) => t.stage === "floor"),
        draw.name,
      ).toBe(true);
      const floor = page.tallies.find((t) => t.stage === "floor")!;
      expect(floor.yes, draw.name).toBe(seated.length);
      expect(page.reach.reachesYou, draw.name).toBe(true);
      console.log(
        `bill-page: ${draw.name} (${draw.key}, seed ${draw.seed}) ${page.number} "${page.name}" ${page.stage} ${page.stageDate}, ${page.sections.length} section(s), floor ${floor.yes} to ${floor.no}, level ${page.level}`,
      );
      return;
    }
    throw new Error(
      `no drawn place showed a bill page (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);

  it("gives a budget line the law-reach data's own scope, with no counts", () => {
    for (let i = 0; i < 16; i += 1) {
      const draw = drawPlace(`${seed}:scope:${i}`, "bill-page-scope");
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
      const first = memberKey(seated[0]!);
      const items = seatView(world.core, first)
        .bodies.flatMap((b) => b.menus)
        .flatMap((m) => m.items)
        .filter((item) => item.line && item.allowed !== false);
      const withScope = items.find((item) => item.line === "highways");
      if (!withScope) continue;
      let bill: { id: string };
      try {
        bill = seatAct(world.core, first, {
          kind: "draft",
          officeId: council.id,
          line: "highways",
          value: 10_000_000,
        }) as { id: string };
      } catch {
        continue;
      }
      const page = billPageView(world.core, bill.id, first);
      const section = page.sections[0]!;
      expect(section.labelKey, draw.name).toBe("highways");
      expect(section.scope, `${draw.name}: the section's scope`).toBeTruthy();
      expect(section.scope!.organizations, draw.name).toContain(
        "enterprise:transportation",
      );
      expect(section.scope!.people, draw.name).toEqual({
        ageFrom: "drivingAge",
      });
      console.log(
        `bill-page scope: ${draw.name} (${draw.key}, seed ${draw.seed}) highways: ${JSON.stringify(section.scope)}`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a council that may set highways (seed ${seed})`,
    );
  }, 900_000);
});
