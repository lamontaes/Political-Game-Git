// @vitest-environment node
/**
 * Amounts beside the law are the law in force (CTO, Nov 17, pins family 16;
 * owner: "Everything comes from the simulation"). In one drawn world, bodies
 * enact four amounts through the game's own call (`enactLaw`), and each
 * engine pays or reads the enacted amount:
 * - the state's minimum wage is the floor a new hire in the state is offered;
 * - the paid leave program's premium is the share its payroll takes;
 * - the town's or county's pay ordinance is a part-time seat's stipend;
 * - Congress's debt limit is the limit the Treasury borrows under.
 * A place with no part-time local seat is passed over and named.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { traceNode } from "../bench/dev-trace";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { DEBT_LIMIT, federalDebtLimit } from "./budgets-treasury";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { withholdingOf } from "./modules/budgets";
import { enactLaw, lawChain } from "./modules/laws";
import { OFFICE_DAY_MODULE_ID, type OfficeJobRow } from "./modules/office-day";
import { localSeatPaySeries, seatPayRow } from "./office-day-pay";
import { OFFICES_MODULE_ID } from "./modules/offices";
import {
  PAID_LEAVE_KEY,
  PAID_LEAVE_PREMIUM,
  paidLeaveProgram,
} from "./paid-leave";
import { coreAPI } from "./state";
import { minimumHourlyAt } from "./wage-floor";
import { setKeepEveryonesWhy } from "./why-kept";

// Reads the stipend's withholding record for people outside the player's circle.
setKeepEveryonesWhy(true);

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const TRIES = 4;
const MEASURE = "Act 9007 (test)";

it(`enacted amounts are what the engines pay and read (replay ${replay})`, () => {
  setBookkeeping(false);
  const passed: string[] = [];
  try {
    for (let attempt = 0; attempt < TRIES; attempt += 1) {
      const place = drawPlace(replay, `amounts-read-the-law:${attempt}`);
      const where = `${place.name} (${place.key}), replay ${replay} draw amounts-read-the-law:${attempt}, world seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const chain = lawChain(api);
      const offices = api.moduleState(OFFICES_MODULE_ID).table("offices");
      const kindOf = (row: OfficeJobRow) =>
        (offices.get(row.officeId) as { kind?: string } | undefined)?.kind ??
        "";
      const seat = (
        api
          .moduleState(OFFICE_DAY_MODULE_ID)
          .table("officeJobs")
          .rows() as unknown as OfficeJobRow[]
      ).find(
        (row) =>
          !row.jobId &&
          !row.endedOn &&
          seatPayRow(kindOf(row)) !== undefined &&
          api.state.people.get(row.personId)?.alive,
      );
      if (!seat) {
        passed.push(`${where}: no part-time local seat`);
        continue;
      }
      const seatLevel = ["county-board", "county-executive"].includes(
        kindOf(seat),
      )
        ? "county"
        : "city";
      const seatJurisdiction = chain.levels.find(
        (l) => l.level === seatLevel,
      )!.jurisdiction;
      const minimumBefore = minimumHourlyAt(api, chain.townPlaceId) ?? 0;
      const limitBefore = federalDebtLimit(api);
      // Every act takes effect on the 1st of next month; the payday after it
      // pays the first month under the ordinance.
      const effective = makeIsoDate(
        `${addDays(makeIsoDate(`${core.date.slice(0, 8)}01`), 40).slice(0, 8)}01`,
      );
      const second = makeIsoDate(`${addDays(effective, 40).slice(0, 8)}01`);
      const acts = {
        minimum: {
          jurisdiction: chain.stateKey,
          level: "state" as const,
          series: "minimum-wage",
          value: Math.round((minimumBefore + 3) * 100),
          unit: "minor/hour",
        },
        leave: {
          jurisdiction: chain.stateKey,
          level: "state" as const,
          series: PAID_LEAVE_KEY,
          value: 1,
        },
        premium: {
          jurisdiction: chain.stateKey,
          level: "state" as const,
          series: PAID_LEAVE_PREMIUM,
          value: 0.0123,
          unit: "share",
        },
        seatPay: {
          jurisdiction: seatJurisdiction,
          level: seatLevel,
          series: localSeatPaySeries(seatPayRow(kindOf(seat))!),
          value: Math.round((seat.annualMinor * 2) / 100),
          unit: "dollars/year",
        },
        debtLimit: {
          jurisdiction: "US",
          level: "federal" as const,
          series: DEBT_LIMIT,
          value: 50_000_000_000_000,
          unit: "dollars",
        },
      };
      const idOf = (act: {
        jurisdiction: string;
        level: string;
        series: string;
      }) =>
        `law:${act.jurisdiction}:${act.level}:${act.series}:general:${effective}:${MEASURE}`;
      for (const act of Object.values(acts))
        enactLaw(api, {
          ...act,
          effectiveDate: effective,
          measureId: MEASURE,
          citation: "Test: an act the body passed",
          estimate: false,
        });
      advanceCore(core, addDays(second, 1));

      // The minimum wage a new hire in the state is offered.
      expect(minimumHourlyAt(api, chain.townPlaceId), where).toBeCloseTo(
        acts.minimum.value / 100,
        2,
      );
      // The paid leave program's premium.
      const program = paidLeaveProgram(api);
      expect(program?.share, where).toBe(acts.premium.value);
      expect(program?.lawId, where).toBe(idOf(acts.premium));
      // The seat's stipend for the first month under the ordinance.
      const row = api
        .moduleState(OFFICE_DAY_MODULE_ID)
        .table("officeJobs")
        .get(seat.id) as unknown as OfficeJobRow;
      expect(row.annualMinor, `${where}: ${seat.id}`).toBe(
        acts.seatPay.value * 100,
      );
      expect(row.citation, `${where}: ${seat.id}`).toContain(
        idOf(acts.seatPay),
      );
      const stipend = withholdingOf(api, seat.personId).find(
        (w) => w.payrollReceiptId === `stipend:${seat.id}:${second}`,
      );
      const days = (Date.parse(second) - Date.parse(effective)) / 86_400_000;
      const due = Math.round((acts.seatPay.value * 100 * days) / 365);
      expect(
        (stipend?.paidMinor ?? 0) + (row.owedMinor ?? 0),
        `${where}: ${seat.id} on ${second}`,
      ).toBeGreaterThanOrEqual(due - 100);
      // The debt limit the Treasury borrows under.
      expect(federalDebtLimit(api), where).toBeGreaterThan(limitBefore);
      // Each act's law row opens in the Trace box.
      for (const act of Object.values(acts))
        expect(
          traceNode(core, undefined, idOf(act)).answer,
          idOf(act),
        ).not.toBe("not-a-record");
      process.stdout.write(
        `AMOUNTS ${where}: from ${effective}, the state minimum ${minimumBefore} to ${acts.minimum.value / 100} an hour; the paid leave premium ${acts.premium.value}; ${kindOf(seat)} ${seat.id} paid ${acts.seatPay.value} a year (was ${seat.annualMinor / 100}), ${stipend?.paidMinor ?? 0} on ${second}; the debt limit ${limitBefore} to ${federalDebtLimit(api)} (minor, held by the public). Passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(
      `No place had a part-time local seat: ${passed.join("; ")}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
