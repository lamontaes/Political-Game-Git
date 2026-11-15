import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { LEGISLATURE_MODULE_ID } from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import billNames from "../../data/english/bill-names.json" with { type: "json" };
import { billName } from "./journal";

// A member's bill to raise or cut one spending line is named for that line,
// so a meeting's agenda does not list "the Budget Ordinance" twice (pool item
// legislation-budget-line-bills-all-titled-budget-ordinance). Pinned to
// Klamath Falls, Oregon, the draw the meetings check saw it at: five months
// of its board and council, where six bills each change one line.
const DRAW = { seed: "meet-a1:2", purpose: "meetings-floor" } as const;

it("one-line budget bills carry their line's name at Klamath Falls, Oregon", () => {
  const place = drawPlace(DRAW.seed, DRAW.purpose);
  const where = `${place.name} (${place.key}), seed ${DRAW.seed}`;
  expect(place.name, where).toBe("Klamath Falls, Oregon");
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 150));
  const bills = coreAPI(core)
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .rows() as unknown as {
    id: string;
    bodyOfficeId: string;
    provisions: { kind: string; line?: string; value: number }[];
  }[];
  const authored = new Set(
    Object.keys(billNames.policies).filter((key) => key.startsWith("budget:")),
  );
  // Bills that change exactly one spending line with a name authored for it.
  const oneLine = bills.filter(
    (bill) =>
      bill.provisions.length === 1 &&
      bill.provisions[0]!.kind === "budget-line" &&
      bill.provisions[0]!.value !== 0 &&
      authored.has(`budget:${bill.provisions[0]!.line}`),
  );
  expect(oneLine.length, `${where}: one-line budget bills`).toBeGreaterThan(2);
  const seen = new Map<string, string>();
  for (const bill of oneLine) {
    const title = billName(core, bill.id) ?? "";
    expect(title, `${where}: ${bill.id}`).not.toMatch(/Budget Ordinance/);
    // Two bills of one body changing different lines read differently.
    const key = `${bill.bodyOfficeId}|${title}`;
    const line = bill.provisions[0]!.line!;
    const sign = Math.sign(bill.provisions[0]!.value);
    const same = seen.get(key);
    if (same)
      expect(same, `${where}: ${bill.id} reads like ${title}`).toBe(
        `${line}:${sign}`,
      );
    seen.set(key, `${line}:${sign}`);
  }
}, 900_000);
