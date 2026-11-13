/**
 * A budget line's new amount is said once, the same everywhere
 * (play-bill-page-new-amount-adds-the-line-to-today): a member writes a bill on
 * a budget line from Your office, typing the line's new amount beside today's.
 * The engine adds a budget-line section's change to the line in force
 * (legislature.ts billForm), so the bill records the change on today's amount,
 * and the law, the paper's two cells, its section sentence and the bill page's
 * figures all say the amount typed: never today plus the typed amount. Three
 * drawn places; BILL_LINE_SEED replays.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { moneySaid } from "../english/count-words";
import { gameStartDate } from "../core2/game-start";
import {
  billForm,
  memberKey,
  members,
  type BillRow,
} from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import { billPageView } from "./bill-stage";
import { billPaper, seatAct, seatView } from "./legislature";
import { buildBenchWorld } from "./world";

const seed = process.env.BILL_LINE_SEED ?? randomBytes(8).toString("hex");

describe(`a budget line's new amount (seed ${seed})`, () => {
  it("is the amount typed on the law, the paper and the bill page", () => {
    const seen: string[] = [];
    const passed: string[] = [];
    for (let i = 0; i < 16 && seen.length < 3; i += 1) {
      const draw = drawPlace(`${seed}:${i}`, "bill-line-amount");
      const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;
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
      const seated = council ? members(api, council.id) : [];
      if (!council || !seated[0]) {
        passed.push(`${where}: no local body`);
        continue;
      }
      const sponsor = memberKey(seated[0]);
      const item = seatView(world.core, sponsor)
        .bodies.find((b: { officeId: string }) => b.officeId === council.id)
        ?.menus.flatMap((m: { items: unknown[] }) => m.items)
        .find(
          (row: { kind: string; inForce: number | null; allowed: boolean }) =>
            row.kind === "budget-line" && row.inForce && row.allowed !== false,
        ) as { line: string; inForce: number } | undefined;
      if (!item) {
        passed.push(`${where}: no budget line this body may set`);
        continue;
      }
      const typed = Math.round(item.inForce * 1.1);
      const drafted = seatAct(world.core, sponsor, {
        kind: "draft",
        officeId: council.id,
        line: item.line,
        value: typed,
      }) as { id: string; status: string };
      if (drafted.status !== "drafted") {
        passed.push(`${where}: the draft was ${drafted.status}`);
        continue;
      }
      const bill = api
        .moduleState("core2-legislature-v1")
        .table("bills")
        .get(drafted.id) as unknown as BillRow;
      // The law: the engine's own after for the section.
      expect(billForm(api, bill).sections[0]!.after.value, where).toBe(typed);
      // The paper: its new amount, and the sentence that names it.
      const paper = billPaper(world.core, drafted.id);
      expect(paper.sections[0]!.estimate.lineNewMinor, where).toBe(typed);
      expect(paper.sections[0]!.estimate.ofMinor, where).toBe(item.inForce);
      expect(paper.sections[0]!.text, where).toContain(moneySaid(typed));
      // The bill page's figures: this year, last year and the change.
      const page = billPageView(world.core, drafted.id, sponsor) as {
        sections: {
          amountMinor: number;
          lastYearMinor: number;
          changeMinor: number;
        }[];
      };
      expect(page.sections[0]!.amountMinor, where).toBe(typed);
      expect(page.sections[0]!.lastYearMinor, where).toBe(item.inForce);
      expect(page.sections[0]!.changeMinor, where).toBe(typed - item.inForce);
      seen.push(`${where}: ${item.line} ${item.inForce} → ${typed}`);
    }
    console.log(
      `${seen.join("; ")}${passed.length ? `; passed over ${passed.join("; ")}` : ""}`,
    );
    expect(seen.length, passed.join("; ")).toBe(3);
  }, 900_000);
});
