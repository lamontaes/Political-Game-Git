/**
 * No body passes a bill whose answer is already the law in force at its
 * level: in a played year, a policy law a bill enacts always changes the
 * answer its government had before (its starting answer or its last act),
 * and every bill that passes changes some law. After one pinned regression,
 * places are drawn from all 56; each names its place and seed.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { LAWS_MODULE_ID } from "./modules/laws";
import { LEGISLATURE_MODULE_ID, type BillRow } from "./modules/legislature";
import { POLICY_QUESTIONS } from "./policy-answers";
import { coreAPI } from "./state";
import type { LawRowInput } from "./laws-starting";

const PLACES = 6;
const WANTED = 2;

it(
  "never passes a bill for a policy already in force at its level",
  () => {
    const tried: string[] = [];
    let witnessed = 0;
    for (let n = 0; n < PLACES && witnessed < WANTED; n++) {
      // The first is the case a county board once passed twice: civilian
      // oversight of police, enacted by one bill and then passed again by
      // another that had waited on the same meeting's agenda.
      const draw = n
        ? drawPlace(randomBytes(32).toString("hex"), `repass:${n}`)
        : {
            name: "Colwich, Kansas",
            key: "2015100",
            seed: "948b220271825094d5d58187daee570d46355594a76e74161012c7b117ec6b03",
          };
      setBookkeeping(false);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      const label = `${draw.name} (${draw.key}) seed ${draw.seed}`;
      const rows = api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .rows() as unknown as (LawRowInput & {
        terms?: { enactedByBill?: string };
      })[];
      const series = new Map<string, typeof rows>();
      for (const row of rows)
        if (row.series in POLICY_QUESTIONS) {
          const key = `${row.jurisdiction}|${row.series}`;
          (series.get(key) ?? series.set(key, []).get(key)!).push(row);
        }
      const enacted: string[] = [];
      for (const [key, list] of series) {
        list.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
        list.forEach((row, i) => {
          const bill = row.terms?.enactedByBill;
          if (!bill) return;
          enacted.push(`${bill} (${key} = ${row.value})`);
          // The answer before it at the same government: its last row, if any.
          const before = list[i - 1];
          if (before)
            expect(
              row.value === 1,
              `${label}: ${bill} enacts ${key} = ${row.value}, already ${before.id}`,
            ).not.toBe(before.value === 1);
        });
      }
      // Every bill that passed changed some law: a bill of policy sections
      // alone wrote at least one law row of its own.
      const wrote = new Set(rows.map((r) => r.terms?.enactedByBill));
      for (const bill of api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .rows() as unknown as BillRow[])
        if (
          ["enacted", "signed", "overridden"].includes(bill.status) &&
          bill.provisions.every((p) => p.kind === "policy-question")
        )
          expect(
            wrote.has(bill.id),
            `${label}: ${bill.number} (${bill.id}) passed and changed no law`,
          ).toBe(true);
      tried.push(`${label}: ${enacted.length} policy laws enacted`);
      if (!enacted.length) continue;
      witnessed += 1;
      process.stdout.write(
        `policy laws enacted, none repeating: ${label}; ${enacted.slice(0, 5).join("; ")}\n`,
      );
    }
    process.stdout.write(`repass draws: ${tried.join("; ")}\n`);
    expect(
      witnessed,
      `fewer than ${WANTED} places enacted a policy law: ${tried.join("; ")}`,
    ).toBe(WANTED);
    // A drawn town's played year took 36 to 184 seconds on a 4-core
    // container; up to PLACES of them.
  },
  PLACES * 300_000,
);
