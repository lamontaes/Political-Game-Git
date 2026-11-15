import { buildBenchWorld } from "./world";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import {
  castMemberVote,
  FEDERAL_HOUSE,
  holdEveryChamber,
  LEGISLATURE_MODULE_ID,
  bodyOf,
  memberKey,
  members,
  type BillRow,
  billForm,
} from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { billPageView, billStage } from "./bill-stage";
import { seatAct, seatView } from "./legislature";
import { DevMode } from "./dev-mode";
import { BenchPlayer } from "./player";

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
      holdEveryChamber(api, bill.id);
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
      // The party split adds up to the floor result, and those who cast no vote are counted.
      expect(
        floor.byParty.reduce((n, row) => n + row.yes + row.no, 0),
        `${draw.name}: the parties add up to the floor`,
      ).toBe(floor.yes + floor.no);
      expect(floor.notVoting, draw.name).toBeGreaterThanOrEqual(0);
      // The section's clause as the bill words it, and with the law in force in its place.
      expect(first.inserted, `${draw.name}: the bill's clause`).toBeTruthy();
      expect(
        first.struck,
        `${draw.name}: the clause with the law in force`,
      ).toBeTruthy();
      expect(first.struck, draw.name).not.toBe(first.inserted);
      expect(
        first.amends?.lawId ?? first.amends?.citation,
        `${draw.name}: the law the section changes`,
      ).toBeTruthy();
      // Where it is: the body, who filed it and the day.
      expect(page.where.bodyTitle, draw.name).toBeTruthy();
      expect(page.where.filedBy.name, draw.name).toBe(page.sponsor.name);
      expect(page.where.filedOn, draw.name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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

  it("gives a budget bill each line's change from last year and the bill's total change", () => {
    const tried: string[] = [];
    for (let i = 0; i < 16; i += 1) {
      const draw = drawPlace(`${seed}:budget:${i}`, "bill-page-budget");
      const world = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(world.core);
      const player = new BenchPlayer(world.core, world.director);
      const resident = [...world.core.people.keys()][0] as string;
      player.select(resident);
      // A few days in, the filings the bodies make at the start of play are on the books.
      for (let day = 0; day < 4; day += 1) {
        const packet = player.packet;
        if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else if (packet?.kind === "stop")
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        else player.advance("day");
      }
      const bill = (
        api
          .moduleState(LEGISLATURE_MODULE_ID)
          .table("bills")
          .rows() as unknown as BillRow[]
      ).find((b) =>
        b.provisions.some(
          (p) => p.kind === "budget-line" && p.of !== undefined,
        ),
      );
      if (!bill) {
        tried.push(`${draw.name}: no budget bill by ${world.core.date}`);
        continue;
      }
      const page = billPageView(world.core, bill.id, resident);
      const lines = page.sections.filter((x) => x.kind === "budget-line");
      for (const section of lines) {
        const provision = bill.provisions[section.index]!;
        if (provision.of === undefined) continue;
        expect(section.lastYearMinor, draw.name).toBe(provision.of);
        expect(section.changeMinor, `${draw.name}: ${section.labelKey}`).toBe(
          provision.value,
        );
        if (provision.of)
          expect(section.changePct!, draw.name).toBeCloseTo(
            (provision.value / provision.of) * 100,
            6,
          );
      }
      expect(page.totalChangeMinor, draw.name).toBe(
        lines.reduce((sum, x) => sum + (x.changeMinor ?? 0), 0),
      );
      console.log(
        `bill-page budget: ${draw.name} (${draw.key}, seed ${draw.seed}) ${bill.number} on ${world.core.date}: ${lines.length} line(s), total change ${page.totalChangeMinor} minor\n`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a budget bill in its first days (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);

  it("names the player's own representative in each chamber that has the bill, and the vote they cast", () => {
    const tried: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const draw = drawPlace(`${seed}:rep:${i}`, "bill-page-rep");
      const world = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const dev = new DevMode(
        world.core,
        world.director,
        new BenchPlayer(world.core, world.director),
        world.placeId,
      );
      const house = dev.lawmakingBodies().find((b) => b.id === FEDERAL_HOUSE);
      if (!house) {
        tried.push(`${draw.name}: no House`);
        continue;
      }
      // A territory's or D.C.'s seat in the House is a delegate's, who casts no floor vote: the
      // place's own seat records say whether the town has a voting member.
      const houseKind = bodyOf(coreAPI(world.core), house.id)?.kind;
      if (
        !townSeats(coreAPI(world.core)).some(
          ({ office, holder }) => office.kind === houseKind && holder,
        )
      ) {
        tried.push(`${draw.name}: a delegate, no voting House member`);
        continue;
      }
      const filed = dev.introduce({
        bodyOfficeId: house.id,
        sponsorId: house.members[0]!.key,
        series: "minimum-wage",
        value: 1500,
      }).bill;
      if (filed.status === "blocked") {
        tried.push(`${draw.name}: blocked`);
        continue;
      }
      dev.decideAt(filed.id, 40, { chairHears: true });
      const page = billPageView(world.core, filed.id);
      const mine = page.yourMembers.filter((m) => m.chamber === house.id);
      expect(mine.length, `${draw.name}: the town's House member`).toBe(1);
      expect(mine[0]!.name.length, draw.name).toBeGreaterThan(0);
      expect(["yes", "no", "abstain"], `${draw.name}: their vote`).toContain(
        mine[0]!.vote,
      );
      console.log(
        `your member: ${draw.name} (${draw.key}, seed ${draw.seed}) ${mine[0]!.title} ${mine[0]!.name} voted ${mine[0]!.vote}`,
      );
      return;
    }
    throw new Error(
      `no drawn place showed the town's House member (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);

  it("gives a drafted bill the sitting it is in, the day it has until, and each section's own estimate", () => {
    const tried: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const draw = drawPlace(`${seed}:window:${i}`, "bill-page-window");
      const world = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const dev = new DevMode(
        world.core,
        world.director,
        new BenchPlayer(world.core, world.director),
        world.placeId,
      );
      const chamber = dev
        .lawmakingBodies()
        .find((b) => b.level === "state" && b.members.length > 0);
      if (!chamber) {
        tried.push(`${draw.name}: no state chamber`);
        continue;
      }
      const filed = dev.introduce({
        bodyOfficeId: chamber.id,
        sponsorId: chamber.members[0]!.key,
        series: "minimum-wage",
        value: 2500,
      }).bill;
      if (filed.status === "blocked") {
        tried.push(`${draw.name}: blocked`);
        continue;
      }
      const page = billPageView(world.core, filed.id);
      const session = page.where.session;
      if (!session) {
        tried.push(`${draw.name}: the body has no sitting on its calendar`);
        continue;
      }
      expect(session.startsOn, draw.name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(session.endsOn > session.startsOn, draw.name).toBe(true);
      // A bill still before the body has until the sitting ends: the floor never reaching it kills it.
      expect(page.where.until, draw.name).toBe(session.endsOn);
      const section = page.sections[0]!;
      expect(typeof section.estimate.annualPayMinor, draw.name).toBe("number");
      expect(section.estimate.note.length, draw.name).toBeGreaterThan(0);
      console.log(
        `stage window: ${draw.name} (${draw.key}, seed ${draw.seed}) ${page.number} sits ${session.startsOn} to ${session.endsOn}, until ${page.where.until}, section ${section.estimate.annualPayMinor} minor a year (${section.estimate.workersRaised} workers)`,
      );
      return;
    }
    throw new Error(
      `no drawn place showed a sitting for a drafted state bill (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);

  it("offers an amendment only on a section that has a law in force to move from", () => {
    const tried: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      const draw = drawPlace(`${seed}:amendable:${i}`, "bill-page-amendable");
      const world = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(world.core);
      const dev = new DevMode(
        world.core,
        world.director,
        new BenchPlayer(world.core, world.director),
        world.placeId,
      );
      const chamber = dev
        .lawmakingBodies()
        .find((b) => b.level === "state" && b.members.length > 0);
      if (!chamber) {
        tried.push(`${draw.name}: no state chamber`);
        continue;
      }
      // A bill on every catalog series the chamber may set: those the law gives no value to move
      // from must not be offered, the rest must be.
      let checked = 0;
      for (const row of dev.laws().series.slice(0, 40)) {
        let bill;
        try {
          bill = dev.introduce({
            bodyOfficeId: chamber.id,
            sponsorId: chamber.members[0]!.key,
            series: row.series,
            value:
              typeof row.combined === "number" && row.combined > 0
                ? row.combined * 1.2
                : 1,
          }).bill;
        } catch {
          continue;
        }
        if (bill.status === "blocked") continue;
        const stage = billStage(world.core, bill.id);
        const sections = billForm(api, bill).sections;
        for (const index of stage.sectionsAmendable)
          expect(
            sections[index]?.before.value,
            `${draw.name} ${row.series}: section ${index + 1} is offered an amendment`,
          ).not.toBeNull();
        checked += 1;
      }
      if (!checked) {
        tried.push(`${draw.name}: no bill the chamber may set`);
        continue;
      }
      console.log(
        `amendable sections: ${draw.name} (${draw.key}, seed ${draw.seed}) ${checked} bills checked`,
      );
      return;
    }
    throw new Error(
      `no drawn place had bills to check (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);
});
