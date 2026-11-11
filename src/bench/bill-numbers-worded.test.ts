/**
 * A bill's number never reaches a screen bare (owner, Nov 11, on the council meeting: "don't let
 * dates go 2025-8 like how they are in the council member thing. Like, have August 2025 or
 * something."): every bench view a bill appears in hands the page its number said with its
 * form's word ("Ordinance 2025-8"), through the English engine's `spokenDesignation`. In a drawn
 * place the player, seated on a local body, drafts a bill; the meeting's item, the seat's result,
 * the desk, the deals, the bill's stage and page, Bills and Coming up are read, and any number
 * that reads as a year, a dash and a number fails, by place and seed (BILL_SEED replays).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { memberKey, members } from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import { billPageView, billStage, followedBills } from "./bill-stage";
import { governmentBodies } from "./government-bodies";
import { seatAct, seatView } from "./legislature";
import { officeView } from "./office";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

const seed = process.env.BILL_SEED ?? randomBytes(8).toString("hex");
/** A designation said bare: a year, a dash and a number ("2025-8"), or no word at all. */
const bare = (text: unknown) =>
  typeof text === "string" && /^\s*\d{4}-\d+\s*$/.test(text);

describe(`a bill's number is said with its word on every screen (seed ${seed})`, () => {
  it("reaches no bench view bare", () => {
    const tried: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      const draw = drawPlace(`${seed}:${i}`, "bill-numbers-worded");
      const world = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(world.core);
      const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
      const council = (
        api
          .moduleState("core2-offices-v1")
          .table("offices")
          .rows() as unknown as { id: string; kind: string; level: string }[]
      ).find((o) =>
        ["council", "township-board", "county-board"].includes(o.kind),
      );
      const seated = council ? members(api, council.id) : [];
      const sponsor = seated[0] ? memberKey(seated[0]) : "";
      if (!council || !world.core.people.has(sponsor)) {
        tried.push(`${where}: no full-person member of a local body`);
        continue;
      }
      const player = new BenchPlayer(world.core, world.director);
      player.select(sponsor);
      world.core.focusPersonIds.add(sponsor);
      const wage = seatView(world.core, sponsor).amounts.find(
        (a: { series: string }) => a.series === "minimum-wage",
      );
      const drafted = seatAct(world.core, sponsor, {
        kind: "draft",
        officeId: council.id,
        series: "minimum-wage",
        value: (wage?.current ?? 0) + 200,
      }) as { id: string; status: string; spoken: string; title: string };
      if (drafted.status !== "drafted") {
        tried.push(`${where}: the draft was ${drafted.status}`);
        continue;
      }
      // Every number each view hands the page, by where it was read.
      const seen: [string, unknown][] = [
        ["the seat's result", drafted.spoken],
        ["the seat's result title", drafted.title],
        ...seatView(world.core, sponsor).bills.map(
          (row: { spoken: string }) =>
            ["the desk", row.spoken] as [string, unknown],
        ),
        ...(officeView(world.core, sponsor).deals ?? []).map(
          (row: { number: string }) =>
            ["the deals", row.number] as [string, unknown],
        ),
        ["the bill's stage", billStage(world.core, drafted.id, sponsor).number],
        [
          "the bill's page",
          billPageView(world.core, drafted.id, sponsor).number,
        ],
        ...followedBills(world.core, sponsor).map(
          (row: { number: string }) =>
            ["Bills", row.number] as [string, unknown],
        ),
        ...(governmentBodies(
          world.core,
          sponsor,
          council.level as never,
        ).bodies?.flatMap?.(
          (body: { comingUp?: { kind: string; number?: string }[] }) =>
            (body.comingUp ?? [])
              .filter((row) => row.kind === "bill")
              .map((row) => ["Coming up", row.number] as [string, unknown]),
        ) ?? []),
      ];
      const bareOnes = seen.filter(([, text]) => bare(text));
      expect(
        bareOnes.map(([view, text]) => `${view}: "${text}"`),
        `${where}: a bill's number said bare`,
      ).toEqual([]);
      expect(drafted.spoken, where).toMatch(/[A-Za-z]/);
      console.log(
        `${where}: ${drafted.spoken} read in ${seen.length} places, none bare` +
          (tried.length ? `; passed over ${tried.join("; ")}` : ""),
      );
      return;
    }
    throw new Error(
      `no draw seated a full person on a local body: ${tried.join("; ")}`,
    );
  }, 600_000);
});
