/**
 * M3-06 (first slice): an official hires someone they know or an applicant;
 * a staffer's work follows their own record and improves with experience;
 * every delegated result traces to who did it (a briefing on a bill, a
 * constituent case the office handled).
 */
import { createHash } from "node:crypto";
import { setBookkeeping } from "./bookkeeping";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { governments, openBudgets } from "./modules/budgets";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { lawInForce, openLaws } from "./modules/laws";
import { openOffices, townSeats } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { draftBill, openLegislature } from "./modules/legislature";
import { allCases, openCases } from "./modules/constituent-cases";
import {
  briefOnBill,
  adviseOnBudget,
  hireStaff,
  openStaff,
  STAFF_MODULE_ID,
  staffCandidates,
  workOf,
  workingAgeWeight,
} from "./modules/staff";
import { governmentUnitsForPlace } from "./reference/government-units";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`staff:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();

describe("M3-06 staff", () => {
  it("a staffer's work follows their record, improves with experience, and every result traces to them", () => {
    let report: Record<string, unknown> | null = null;
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8 && !report; attempt += 1) {
      const state = pick(states, `state:${attempt}`);
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ]
        .filter((p) =>
          governmentUnitsForPlace(p.sourceGeoid ?? p.key).some(
            (u) => u.unitType === "municipality",
          ),
        )
        .sort((a, b) => a.key.localeCompare(b.key));
      if (!places.length) continue;
      const key = pick(places, `place:${attempt}`).key;
      tried.push(`${state} ${key}`);
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: key,
          startedAt: START,
          minimumPeople: 200,
        }),
      );
      openLaws(core);
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openLegislature(core);
      openStaff(core);
      openCases(core);
      openBudgets(core);
      const api = coreAPI(core);
      const seat = townSeats(api).find(
        (s) => s.office.kind === "council" && s.holder?.personId,
      );
      if (!seat) continue;
      const official = seat.holder!.personId!;
      const candidates = staffCandidates(api, official);
      // Everyone offered is someone the records can place: never a relative
      // whose own work isn't modeled, always within some commuting reach, and
      // weighed by their age's place in the working-age pool.
      for (const c of candidates) {
        expect(core.people.get(c.personId)?.tier).not.toBe("husk");
        expect(c.reach).toBeGreaterThan(0);
        expect(c.workingAge).toBeGreaterThan(0);
        expect(c.workingAge).toBeLessThanOrEqual(1);
      }
      const known = candidates.find((c) => c.from === "known");
      const applicant = candidates.find((c) => c.from === "applicant");
      if (!known || !applicant) continue;
      const aide = hireStaff(api, {
        officialId: official,
        personId: known.personId,
        role: "aide",
      });
      hireStaff(api, {
        officialId: official,
        personId: applicant.personId,
        role: "aide",
      });
      const bill = draftBill(api, {
        bodyOfficeId: seat.office.id,
        sponsorId: official,
        provisions: [
          {
            kind: "law-amount",
            series: "minimum-wage",
            value: lawInForce(api, "minimum-wage").value! + 100,
            unit: "minor/hour",
          },
        ],
      });
      const briefings = [1, 2, 3, 4, 5].map(() =>
        briefOnBill(api, aide.id, bill.id),
      );
      // Experience grows with each task; nothing else in the record changed.
      for (let i = 1; i < briefings.length; i += 1) {
        expect(briefings[i]!.work.parts.experience).toBeGreaterThan(
          briefings[i - 1]!.work.parts.experience,
        );
        expect(briefings[i]!.work.quality).toBeGreaterThanOrEqual(
          briefings[i - 1]!.work.quality,
        );
      }
      // The briefing covers as many members as the work's quality reaches.
      for (const b of briefings)
        expect(b.stakes.length).toBe(b.work.result.covered as number);
      expect(workOf(api, aide.id).length).toBe(5);
      // In play (bookkeeping off) the why of an aide nobody deals with is not
      // kept, but the count of their tasks still is.
      const previous = setBookkeeping(false);
      briefOnBill(api, aide.id, bill.id);
      setBookkeeping(previous);
      expect(workOf(api, aide.id).length).toBe(5);
      expect(
        (
          api
            .moduleState(STAFF_MODULE_ID)
            .table("staff")
            .get(aide.id) as unknown as { tasksDone: number }
        ).tasksDone,
      ).toBe(6);
      // Advice on the city's budget priorities: who favors each change.
      const city = governments(api).find((g) => g.level === "city");
      const advice = city
        ? adviseOnBudget(api, aide.id, city.id, {
            parks: 10_000_000,
            police: -5_000_000,
          })
        : null;
      if (advice) {
        expect(advice.lines.map((l) => l.line)).toEqual(["parks", "police"]);
        for (const l of advice.lines)
          for (const c of l.chambers) {
            expect(c.read).toBe(Math.round(advice.work.quality * c.of));
            expect(c.favor + c.oppose).toBeLessThanOrEqual(c.read);
            expect(l.atRisk || c.oppose <= c.favor).toBe(true);
          }
      }
      // Cases this office handles go to its staff, and say who did them.
      advanceCore(core, "2026-02-20");
      // The aide is on the payroll of the government the official serves,
      // and paydays have paid them from its treasury.
      const aideJob = core.people.get(aide.personId)!.jobId;
      const employer = aideJob ? core.jobs.get(aideJob)?.organizationId : null;
      const town = governments(api).find((g) =>
        ["city", "county"].includes(g.level),
      );
      const payroll = aideJob
        ? core.work.latestPayrollByJob.get(aideJob)
        : undefined;
      if (town) {
        expect(aideJob).toMatch(/^job:public:staff:/);
        expect(
          governments(api).some((g) => g.organizationId === employer),
        ).toBe(true);
        // Paydays pay the post's pay from that treasury.
        // Paid, unless the treasury holds less than what's owed (a small
        // village can't carry a full-time aide).
        const owed =
          (payroll as unknown as { requestedMinor?: number } | undefined)
            ?.requestedMinor ?? 0;
        const cash = core.organizations.get(employer!)?.liquidMinor ?? 0;
        expect(owed, key).toBeGreaterThan(0);
        expect(
          (payroll?.paidMinor ?? 0) > 0 || cash < owed,
          `${key}: owed ${owed}, treasury ${cash}`,
        ).toBe(true);
      }
      const staffed = allCases(api).filter(
        (c) => c.officialId === official && c.handledBy === "staff",
      );
      for (const c of staffed) expect(c.stafferId).toBeTruthy();
      report = {
        budgetAdvice: advice?.lines ?? null,
        aidePay: { job: aideJob, employer, lastPaidMinor: payroll?.paidMinor },
        seed,
        state,
        place: key,
        hired: [aide.hiredFrom, "applicant"],
        quality: briefings.map((b) => Math.round(b.work.quality * 1000) / 1000),
        covered: briefings.map(
          (b) => `${String(b.work.result.covered)}/${String(b.work.result.of)}`,
        ),
        staffedCases: staffed.map(
          (c) => `${c.problem}:${c.status}:${c.stafferId}`,
        ),
      };
    }
    expect(
      report,
      `no office could hire in ${tried.join(", ")}`,
    ).not.toBeNull();
    govReport("staff", JSON.stringify(report));
  });

  it("weighs age by the working-age pool, sliding, with no cutoff", () => {
    const at = (age: number) => workingAgeWeight(age);
    expect(at(30)).toBeCloseTo(1, 5);
    expect(at(40)).toBeGreaterThan(0.95);
    expect(at(92)).toBeGreaterThan(0);
    expect(at(92)).toBeLessThan(at(70));
    expect(at(70)).toBeLessThan(at(60));
    expect(at(65)).toBeLessThan(at(60));
    expect(at(65)).toBeGreaterThan(at(70));
    expect(at(20)).toBeLessThan(at(30));
  });
});
