// @vitest-environment node
/**
 * An official's salary is the law in force, not a table (CTO, Nov 17, pins
 * family 16; owner: "Everything comes from the simulation"). In a drawn place,
 * the state enacts a legislators' pay act and Congress a House pay act, each
 * taking effect on the 1st of next month. From the payday after that, the
 * state's legislators and the House members are paid the enacted salary, the
 * pay row and the office post's wage say so, and the law row the salary was
 * read from opens in dev mode's Trace box.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { traceNode } from "../bench/dev-trace";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { withholdingOf } from "./modules/budgets";
import { enactLaw, lawChain } from "./modules/laws";
import { OFFICIAL_PAY_MODULE_ID, salarySeries } from "./modules/official-pay";
import { OFFICIALS_MODULE_ID, type OfficialRow } from "./modules/officials";
import { coreAPI } from "./state";
import { setKeepEveryonesWhy } from "./why-kept";

// Reads each official's withholding record for people outside the player's circle.
setKeepEveryonesWhy(true);

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "official-salary-law");

interface PayRecord {
  readonly id: string;
  readonly jobId: string;
  readonly annualMinor: number;
  readonly citation: string;
  readonly owedMinor?: number;
}

it(`an enacted pay act moves what officials are paid: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const where = `${place.name} (${place.key}), replay ${replay}, world seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // A day in, every official the opening seated holds a pay row.
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const state = lawChain(api).stateKey;
    const pay = api.moduleState(OFFICIAL_PAY_MODULE_ID).table("pay");
    const officials = api
      .moduleState(OFFICIALS_MODULE_ID)
      .table("officials")
      .rows() as unknown as OfficialRow[];
    const paid = (row: OfficialRow) =>
      pay.get(row.id) as unknown as PayRecord | undefined;
    const legislators = officials.filter(
      (o) => o.bodyKind === "legislature" && o.stateKey === state && paid(o),
    );
    const house = officials.filter(
      (o) => o.officeKind.startsWith("us-house") && paid(o),
    );
    expect(
      legislators.length,
      `${where}: state legislators paid`,
    ).toBeGreaterThan(0);
    expect(house.length, `${where}: House members paid`).toBeGreaterThan(0);
    const before = {
      legislator: paid(legislators[0]!)!.annualMinor,
      house: paid(house[0]!)!.annualMinor,
    };
    // Each act raises the salary a quarter, from the 1st of next month.
    const effective = makeIsoDate(
      `${addDays(makeIsoDate(`${core.date.slice(0, 8)}01`), 40).slice(0, 8)}01`,
    );
    const acts = [
      {
        jurisdiction: state,
        level: "state" as const,
        series: salarySeries("legislatorAnnual"),
        dollars: Math.round((before.legislator * 1.25) / 100),
        measureId: "HB 9001 (legislators' pay, test)",
      },
      {
        jurisdiction: "US",
        level: "federal" as const,
        series: salarySeries("representative"),
        dollars: Math.round((before.house * 1.25) / 100),
        measureId: "H.R. 9006 (House pay, test)",
      },
    ];
    const lawIds = acts.map(
      (act) =>
        `law:${act.jurisdiction}:${act.level}:${act.series}:general:${effective}:${act.measureId}`,
    );
    for (const act of acts)
      enactLaw(api, {
        jurisdiction: act.jurisdiction,
        level: act.level,
        series: act.series,
        value: act.dollars,
        unit: "dollars/year",
        effectiveDate: effective,
        measureId: act.measureId,
        citation: "Test: a pay act the body passed",
        estimate: false,
      });
    // The payday on the effective date pays the month before at the old pay;
    // the next one pays the first month under the act.
    const second = makeIsoDate(`${addDays(effective, 40).slice(0, 8)}01`);
    advanceCore(core, addDays(second, 1));
    const checked: string[] = [];
    for (const [group, rows, act, lawId] of [
      ["legislators", legislators, acts[0]!, lawIds[0]!],
      ["House members", house, acts[1]!, lawIds[1]!],
    ] as const) {
      let moved = 0;
      for (const row of rows) {
        const record = paid(row);
        if (!record || !api.state.people.get(row.id)?.alive) continue;
        expect(record.annualMinor, `${where}: ${row.id}`).toBe(
          act.dollars * 100,
        );
        expect(record.citation, `${where}: ${row.id}`).toContain(lawId);
        // The office post's wage follows the act, so every reader of the job agrees.
        const job = core.jobs.get(record.jobId);
        if (job && record.jobId.startsWith("job:office:"))
          expect(job.wageDailyMinor, `${where}: ${record.jobId}`).toBe(
            Math.round((act.dollars * 100) / 365),
          );
        // The month under the act was paid at the act's salary, or owed.
        const check = withholdingOf(api, row.id).find(
          (w) => w.payrollReceiptId === `salary:${row.id}:${second}`,
        );
        if (!check) continue;
        const days = (Date.parse(second) - Date.parse(effective)) / 86_400_000;
        const due = Math.round((act.dollars * 100 * days) / 365);
        expect(
          check.paidMinor + (record.owedMinor ?? 0),
          `${where}: ${row.id} on ${second}`,
        ).toBeGreaterThanOrEqual(due - 100);
        moved += 1;
      }
      expect(moved, `${where}: ${group} paid under the act`).toBeGreaterThan(0);
      checked.push(`${moved} ${group} at ${act.dollars} dollars`);
      // The law row the salary was read from opens in the Trace box.
      const node = traceNode(core, undefined, lawId);
      expect(node.answer, `${where}: ${lawId} in the Trace`).not.toBe(
        "not-a-record",
      );
    }
    process.stdout.write(
      `OFFICIAL PAY ${where}: from ${effective}, ${checked.join("; ")} (before ${before.legislator / 100} and ${before.house / 100}).\n`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
