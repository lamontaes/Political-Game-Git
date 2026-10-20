/**
 * One model, two tiers (pool item core-census-weight-money): a counted
 * household that stands for several real ones pays and is paid several times
 * its flows through the one journal. A drawn place opened twice from the same
 * seed, once as a sample (one household each) and once with every counted
 * household standing for three, played through two paydays.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import {
  countedPayment,
  flowScale,
  fundBalance,
  fundGroups,
} from "./counted-money";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const SCALE = 3;
const DAYS = 62;

interface Entry {
  readonly out: number;
  /** Tax withheld in the same entry (everything not paid to a group's fund). */
  readonly tax: number;
  /** The weight the flow's household stood for when it was paid, for a rent flow. */
  readonly weight?: number;
  /** Wages: pay-weighted mean household weight of the jobs the flow pays. */
  readonly wageScale?: number;
  /** Wages: the flow's pay per day over all its jobs, and weighted by each counted job's household weight. */
  readonly perDay?: number;
  readonly weightedPerDay?: number;
  /** Wages: how many jobs the flow pays. */
  readonly jobs?: number;
}

function play(seed: string, key: string, countScale: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
    ...(countScale !== 1 ? { countScale } : {}),
  });
  const api = coreAPI(core);
  const rt = residentsRuntime(core)!;
  const entries = new Map<string, Entry>();
  const post = api.postJournal.bind(api);
  api.postJournal = (entry) => {
    const id = String(entry.sourceRef.id);
    const [flowId] = id.split("@");
    if (/^(rent:|residents:wages:)/.test(id)) {
      let out = 0;
      let tax = 0;
      for (const row of entry.postings) {
        if (row.deltaMinor < 0) out -= row.deltaMinor;
        else if (!row.accountId.startsWith("fund:")) tax += row.deltaMinor;
      }
      const flow = rt.flows.get(flowId!);
      let weight: number | undefined;
      let wageScale: number | undefined;
      let perDay: number | undefined;
      let weightedPerDay: number | undefined;
      let jobs: number | undefined;
      if (flowId!.startsWith("rent:")) {
        const ix = rt.store.householdOf.get(flowId!.slice("rent:".length));
        if (ix !== undefined)
          weight = rt.store.weightOf(rt.store.households[ix]!);
      } else if (flow?.perDayMinorByJob) {
        let plain = 0;
        let weighted = 0;
        perDay = 0;
        weightedPerDay = 0;
        jobs = Object.keys(flow.perDayMinorByJob).length;
        for (const [jobId, pay] of Object.entries(flow.perDayMinorByJob)) {
          const job = rt.jobs.get(jobId);
          const m = job ? rt.store.countedMember(job.personId) : undefined;
          perDay += pay;
          if (m === undefined) {
            weightedPerDay += pay;
            continue;
          }
          const weight = rt.store.weightOf(
            rt.store.households[rt.store.household[m]!]!,
          );
          plain += pay;
          weighted += pay * weight;
          weightedPerDay += pay * weight;
        }
        if (plain > 0) wageScale = weighted / plain;
        // The independent figure is the code's own for these flows.
        if (wageScale !== undefined)
          expect(
            flowScale(rt, flow),
            `${key} seed ${seed} scale ${countScale} flow ${flowId}`,
          ).toBeCloseTo(wageScale, 9);
      }
      entries.set(id, {
        out,
        tax,
        weight,
        wageScale,
        perDay,
        weightedPerDay,
        jobs,
      });
    }
    return post(entry);
  };
  advanceCore(core, addDays(makeIsoDate(core.date), DAYS));
  return { core, rt, entries };
}

it("rent and pay of counted households are moved times their weights, and the books balance", () => {
  // A town with no counted renter has no rent to compare: draw again, a
  // few times, and fail if none of the draws pays any (pinned with
  // CWM_SEED and CWM_KEY to replay one).
  const pinned = process.env.CWM_SEED
    ? { name: "pinned", key: process.env.CWM_KEY!, seed: process.env.CWM_SEED }
    : undefined;
  let draw =
    pinned ?? drawPlace(randomBytes(32).toString("hex"), "census-weight-money");
  let base = play(draw.seed, draw.key, 1);
  const rented = (run: typeof base) =>
    [...run.rt.flows.keys()].filter((id) => id.startsWith("rent:")).length;
  const tried: string[] = [];
  for (let again = 0; !pinned && rented(base) <= 5 && again < 3; again += 1) {
    tried.push(`${draw.name} [${draw.key}]`);
    draw = drawPlace(randomBytes(32).toString("hex"), "census-weight-money");
    base = play(draw.seed, draw.key, 1);
  }
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}${tried.length ? ` (no counted rent in ${tried.join("; ")})` : ""}`;
  const scaled = play(draw.seed, draw.key, SCALE);

  // A town of one-household records changes nothing.
  for (const flow of base.rt.flows.values())
    expect(flowScale(base.rt, flow), `${where} ${flow.id}`).toBe(1);

  let rents = 0;
  let rentsInFull = 0;
  let wages = 0;
  let paidInFull = 0;
  let taxed = 0;
  // A flow's first payment in the window: later ones carry what was left unpaid.
  const first = new Set<string>();
  const seen = new Set<string>();
  for (const id of base.entries.keys()) {
    const flowId = id.split("@")[0]!;
    if (seen.has(flowId)) continue;
    seen.add(flowId);
    first.add(id);
  }
  for (const [id, one] of base.entries) {
    const many = scaled.entries.get(id);
    if (!many || !first.has(id)) continue;
    if (id.startsWith("rent:") && many.weight !== undefined) {
      rents += 1;
      // The rent of one household, times as many as the record stands for.
      // A group short of cash pays less (and carries the rest); none pays more.
      const expected = one.out * many.weight;
      expect(
        many.out,
        `${where} ${id}: ${one.out} -> ${many.out} for weight ${many.weight}`,
      ).toBeLessThanOrEqual(Math.ceil(expected) + 2);
      if (Math.abs(many.out - expected) <= 2) rentsInFull += 1;
    } else if (many.wageScale !== undefined) {
      // The two worlds hold the same employers but not always the same jobs
      // (the opening's allocation follows the counts), so the payroll is
      // compared with what its own jobs are owed: the pay of one day over the
      // flow's jobs, weighted by each counted job's household, times the days
      // the single-household run paid. A run that paid a part of a whole
      // number of days was short of cash and is not compared.
      const days = one.out / (one.perDay ?? Number.NaN);
      if (!(days >= 1) || Math.abs(days - Math.round(days)) > 0.005) continue;
      wages += 1;
      const expected = many.weightedPerDay! * Math.round(days);
      // Each job's pay is rounded to cents; an employer short of cash pays
      // less; none pays more.
      const slack = (many.jobs ?? 0) + 4;
      expect(many.out, `${where} ${id}`).toBeLessThanOrEqual(
        Math.ceil(expected) + slack,
      );
      if (Math.abs(many.out - expected) <= slack) {
        paidInFull += 1;
        // Withholding: the same rate per worker on as many workers.
        const taxExpected =
          (one.tax * expected) / (one.perDay! * Math.round(days));
        expect(
          Math.abs(many.tax - taxExpected),
          `${where} ${id}: tax ${one.tax} -> ${many.tax}`,
        ).toBeLessThanOrEqual(Math.max(8, taxExpected * 0.05));
        taxed += one.tax > 0 ? 1 : 0;
      }
    }
  }
  expect(rents, `${where}: rents compared`).toBeGreaterThan(5);
  // Flows that paid a part of a whole number of days are skipped above, so
  // the payrolls actually compared are counted, and too few fails.
  expect(wages, `${where}: payrolls compared`).toBeGreaterThan(5);
  expect(rentsInFull, `${where}: rents paid in full`).toBeGreaterThan(0);
  expect(paidInFull, `${where}: payrolls paid in full`).toBeGreaterThan(0);
  expect(taxed, `${where}: payrolls with tax withheld`).toBeGreaterThan(0);

  // A bill an engine sends one household (a tax, a benefit) is for one real
  // household: the record's group pays it as many times as it stands for, and
  // the engine is told what one household paid.
  const api = coreAPI(scaled.core);
  fundGroups(api, scaled.rt);
  const payee = [...scaled.core.organizations.values()].find(
    (org) => org.kind !== "residents" && org.outsideFlow === undefined,
  )!;
  const home = [...scaled.rt.store.liveHouseholds()].find(
    (h) =>
      scaled.rt.store.weightOf(h) > 1 &&
      fundBalance(api, scaled.rt, h.group) >
        100_000 * scaled.rt.store.weightOf(h),
  )!;
  expect(home, `${where}: a weighted household with money`).toBeTruthy();
  const before = fundBalance(api, scaled.rt, home.group);
  const told = countedPayment(api, {
    id: "test:weight-money:bill",
    placeId: home.placeId,
    householdId: home.id,
    otherOwnerId: payee.id,
    amountMinor: 10_000,
    reasonKey: "property-tax",
    source: scaled.rt.input.source,
  });
  const weight = scaled.rt.store.weightOf(home);
  expect(told, where).toBe(10_000);
  expect(
    Math.abs(
      before -
        fundBalance(api, scaled.rt, home.group) -
        Math.round(10_000 * weight),
    ),
    where,
  ).toBeLessThanOrEqual(2);

  for (const { core } of [base, scaled])
    expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
      core.cashJournal.totals.grossCreditMinor,
    );
}, 1_200_000);
