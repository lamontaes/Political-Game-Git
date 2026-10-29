/**
 * A cut to a city's schools line lays off named public-school teachers (pool
 * item office-budget-line-reaches-pay), and a raise hires named adults who had
 * no work (office-budget-line-schools-raise-hires): the mayor's amended line
 * is the adopted line, the staffing reach reads it, and the district ends its
 * newest teachers' jobs or hires. A place is drawn from all 56 on a seed
 * nobody chose (SCHOOLS_LINE_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { staffingOf } from "./law-reach/group-a-staffing";
import { advanceCore } from "./life";
import {
  budgetsOf,
  governments,
  registerBudgetVote,
  type BudgetRow,
} from "./modules/budgets";
import {
  LEGISLATURE_MODULE_ID,
  governingMembers,
  memberKey,
  votesOn,
  type BillRow,
} from "./modules/legislature";
import { residentsRuntime } from "./modules/residents";
import { prepareAct, officeHost } from "./modules/office-day";
import { townSeats } from "./modules/offices";
import { budgetProposalDue, officeActHandlers } from "./office-day-acts";
import { coreAPI } from "./state";

const seed = process.env.SCHOOLS_LINE_SEED ?? randomBytes(8).toString("hex");
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

/**
 * Why a budget's schools line is not the mayor's request, by record: the
 * council's own budget bill (its status and the schools section it kept) and
 * its roll call. Only a recorded amendment, rejection or veto is a reason to
 * draw another place; a missing bill, a missing roll call, or a different
 * amount with the bill showing the request passed whole is a broken producer.
 */
function councilReason(
  api: ReturnType<typeof coreAPI>,
  adopted: BudgetRow | undefined,
  requested: number,
  change: number,
): { recorded: true; note: string } | { recorded: false; note: string } {
  if (!adopted)
    return { recorded: false, note: "no budget record for the new year" };
  const bills = api
    .moduleState(LEGISLATURE_MODULE_ID)
    .table("bills")
    .rows() as unknown as (BillRow & { kind?: string })[];
  // Bill numbers repeat between governments: only this government's
  // budget-voting bodies can explain its adopted line.
  const government = governments(api).find(
    (g) => g.id === adopted.governmentId,
  );
  const votingBodies = new Set(
    (government ? governingMembers(api, government) : []).map(
      (m) => m.officeId,
    ),
  );
  const own = bills.filter(
    (b) =>
      b.kind === "budget" &&
      votingBodies.has(b.bodyOfficeId) &&
      new RegExp(`(^|[ ,])${b.number.replace(/\W/g, "\\$&")}( |$)`).test(
        adopted.adoptedBy,
      ),
  );
  const bill = own.at(-1);
  if (!bill)
    return {
      recorded: false,
      note: `budget ${adopted.id} (${adopted.adoptedBy}) names no recorded budget bill; adopted schools line ${adopted.spendingMinor.schools}, requested ${requested}`,
    };
  const rolls = votesOn(api, bill.id);
  if (!rolls.length)
    return {
      recorded: false,
      note: `budget bill ${bill.id} has no recorded vote; adopted schools line ${adopted.spendingMinor.schools}, requested ${requested}`,
    };
  const section = bill.provisions.find(
    (p) => (p as { line?: string }).line === "schools",
  ) as { value: number } | undefined;
  const votes = `${rolls.length} votes recorded on ${bill.id}`;
  if (bill.status === "failed")
    return {
      recorded: true,
      note: `council rejected or the executive vetoed ${bill.id} (${votes}; ${adopted.adoptedBy})`,
    };
  if (!section || section.value !== change)
    return {
      recorded: true,
      note: `council amended the schools section of ${bill.id} to ${section?.value ?? "dropped"} from ${change} (${votes}; ${adopted.adoptedBy})`,
    };
  return {
    recorded: false,
    note: `bill ${bill.id} passed the schools change ${change} whole (${votes}) yet the adopted line is ${adopted.spendingMinor.schools}, not ${requested}`,
  };
}

/**
 * The mayor amends the city's schools line by a third, up or down, and the
 * year turns. `breakProducer` runs after the world is built and breaks the
 * council's budget vote itself (the negative control).
 */
function amendSchoolsLine(direction: -1 | 1, breakProducer?: () => void) {
  const tried: string[] = [];
  for (let draw = 0; draw < 25; draw += 1) {
    // A failure names its place and seed; these replay exactly that town.
    const drawn = drawPlace(`${seed}:${draw}`, "schools-line");
    const place =
      process.env.SCHOOLS_LINE_PLACE_KEY && process.env.SCHOOLS_LINE_PLACE_SEED
        ? {
            ...drawn,
            key: process.env.SCHOOLS_LINE_PLACE_KEY,
            seed: process.env.SCHOOLS_LINE_PLACE_SEED,
          }
        : drawn;
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    breakProducer?.();
    const mayor = townSeats(api).find(
      (s) => s.office.kind === "mayor" && s.holder?.personId,
    );
    const city = governments(api).find((g) => g.level === "city");
    const district = [...core.organizations.values()].find((o) =>
      (o.classification ?? "").startsWith("service:school"),
    );
    // A district's teachers are mostly counted workers (their jobs sit in the
    // district's wage flows) and a few are full people; both are its staff.
    const teachers = (organizationId: string) => {
      const rt = residentsRuntime(core);
      const full = [...core.jobs.values()].filter(
        (j) => j.organizationId === organizationId && !j.endsAt,
      );
      const ids = new Set(full.map((j) => j.id));
      const counted = new Set<string>();
      for (const flow of rt?.flows.values() ?? [])
        if (
          flow.kind === "wages" &&
          !flow.endedAt &&
          flow.organizationId === organizationId
        )
          for (const id of flow.jobIds ?? []) if (!ids.has(id)) counted.add(id);
      return [
        ...full,
        // A counted job that has ended is no longer staff.
        ...[...counted]
          .map((id) => rt!.jobs.get(id)!)
          .filter((job) => job && job.endsAt === undefined),
      ];
    };
    if (!mayor || !city || !district || teachers(district.id).length < 4) {
      tried.push(`${where}: no mayor, city or district with teachers`);
      continue;
    }
    const mayorId = memberKey(mayor.holder!);
    const lead = api.parameter("budgetProposalLeadDays");
    const year = Number(core.date.slice(0, 4));
    const next =
      `${year}-${city.fiscalYearStart}` > core.date
        ? `${year}-${city.fiscalYearStart}`
        : `${year + 1}-${city.fiscalYearStart}`;
    const open = addDays(makeIsoDate(next), -(lead - 1));
    if (core.date < open) advanceCore(core, open);
    if (core.date > open) {
      tried.push(`${where}: the year was already past the proposal window`);
      continue;
    }
    const priorLine = budgetsOf(api, city.id).at(-1)!.spendingMinor.schools;
    if (!priorLine) {
      tried.push(`${where}: the city budget has no schools line`);
      continue;
    }
    expect(budgetProposalDue(api, officeHost, mayorId), where).not.toBeNull();
    const staffBefore = teachers(district.id).map((j) => j.personId);
    const staffInPlace = staffBefore.length;
    // A row set earlier keeps the base the engine funds against: within its
    // fiscal year the base it took, and in a new year the positions it funded.
    const earlier = staffingOf(api, "budget-line:schools", district.id);
    // The jobs each person held when the line was proposed, both tiers: a
    // named person's current jobs and a counted resident's (the residents
    // runtime's jobs). A hire must not have been taken from one still running.
    const priorJobs = new Map<string, string[]>();
    const holdBefore = (personId: string, jobId: string) =>
      priorJobs.set(personId, [...(priorJobs.get(personId) ?? []), jobId]);
    for (const job of core.jobs.values())
      if (job.endsAt === undefined) holdBefore(job.personId, job.id);
    for (const job of residentsRuntime(core)?.jobs.values() ?? [])
      if (job.endsAt === undefined && !core.jobs.has(job.id))
        holdBefore(job.personId, job.id);
    const fullBefore = new Set(core.people.keys());
    const change = direction * Math.floor(priorLine / 3);
    prepareAct(api, mayorId, "propose-budget", {
      budget: { changes: { schools: change } },
    });
    officeActHandlers(officeHost)["propose-budget"]!(api, mayorId, {} as never);
    // The district's headcount each day: the engine funds the line change
    // against the staff in place the day it takes effect, which ordinary
    // turnover can move from what it was when the line was proposed.
    const staffByDate = new Map<string, number>([[core.date, staffInPlace]]);
    for (
      let day = addDays(makeIsoDate(core.date), 1);
      day <= addDays(makeIsoDate(next), 10);
      day = addDays(makeIsoDate(day), 1)
    ) {
      advanceCore(core, day);
      staffByDate.set(core.date, teachers(district.id).length);
    }
    const adopted = budgetsOf(api, city.id).find(
      (b) => b.startsOn === next || b.adoptedOn === next,
    );
    // Only a recorded council amendment, rejection or veto (the budget bill
    // and its roll call) sends the test to another place. A missing budget, a
    // missing bill or vote, or a different amount with no such record fails.
    if (adopted?.spendingMinor.schools !== priorLine + change) {
      const why = councilReason(api, adopted, priorLine + change, change);
      if (!why.recorded)
        throw new Error(
          `${where}: the mayor's schools line was not adopted and no council amendment or rejection explains it: ${why.note}`,
        );
      tried.push(`${where}: ${why.note}`);
      continue;
    }
    const activeNow = new Set(teachers(district.id).map((j) => j.personId));
    return {
      where,
      governmentId: city.id,
      core,
      api,
      staffInPlace,
      staffByDate,
      earlier,
      district,
      priorLine,
      change,
      adopted,
      staffBefore,
      activeNow,
      priorJobs,
      fullBefore,
      teachers,
    };
  }
  throw new Error(`no drawn place had the pieces: ${tried.join("; ")}`);
}

/** The headcount the engine funds against: the staff at the end of the day before it set the row (or that day's, when the day before was not recorded). */
function baseDay(
  r: { staffByDate: ReadonlyMap<string, number>; staffInPlace: number },
  setOn: string,
): number {
  const before = addDays(makeIsoDate(setOn), -1);
  return (
    r.staffByDate.get(before) ?? r.staffByDate.get(setOn) ?? r.staffInPlace
  );
}

it("a cut to the city's schools line ends named teachers' jobs at the public schools", () => {
  const r = amendSchoolsLine(-1);
  const laidOff = r.staffBefore.filter(
    (personId) => !r.activeNow.has(personId),
  );
  // The bill reaches the district: it is funded for the staff in place (named
  // or counted) times the line after the bill against the line before it.
  const row = staffingOf(r.api, "budget-line:schools", r.district.id);
  expect(row, r.where).not.toBeNull();
  expect(row!.baseStaff, r.where).toBe(
    // An earlier row set by another government's line (a state's schools line
    // beside this city's) funded its own positions, so this line starts from
    // the staff in place (group-a-staffing.ts baseStaffFor).
    !r.earlier || r.earlier.governmentId !== r.governmentId
      ? baseDay(r, row!.setOn)
      : r.earlier.fiscalYear === row!.fiscalYear
        ? r.earlier.baseStaff
        : r.earlier.positions,
  );
  expect(row!.positions, r.where).toBeCloseTo(
    row!.baseStaff * ((r.priorLine + r.change) / r.priorLine),
  );
  expect(row!.positions, r.where).toBeLessThan(row!.baseStaff);
  expect(
    laidOff.length,
    `${r.where}: schools line ${r.priorLine} cut by ${-r.change}, adopted ${r.adopted?.id}; ${r.staffBefore.length} teachers before`,
  ).toBeGreaterThan(0);
}, 1_800_000);

it("a raise to the city's schools line hires named adults who had no work at the public schools", () => {
  const r = amendSchoolsLine(1);
  const hired = [...r.activeNow].filter(
    (personId) => !r.staffBefore.includes(personId),
  );
  const jobIds = r
    .teachers(r.district.id)
    .filter((j) => hired.includes(j.personId))
    .map((j) => j.id);
  const row = staffingOf(r.api, "budget-line:schools", r.district.id);
  expect(row, r.where).not.toBeNull();
  expect(row!.baseStaff, r.where).toBe(
    // An earlier row set by another government's line (a state's schools line
    // beside this city's) funded its own positions, so this line starts from
    // the staff in place (group-a-staffing.ts baseStaffFor).
    !r.earlier || r.earlier.governmentId !== r.governmentId
      ? baseDay(r, row!.setOn)
      : r.earlier.fiscalYear === row!.fiscalYear
        ? r.earlier.baseStaff
        : r.earlier.positions,
  );
  expect(row!.positions, r.where).toBeCloseTo(
    row!.baseStaff * ((r.priorLine + r.change) / r.priorLine),
  );
  expect(row!.positions, r.where).toBeGreaterThan(row!.baseStaff);
  expect(
    hired.length,
    `${r.where}: schools line ${r.priorLine} raised by ${r.change}, adopted ${r.adopted?.id}; ${r.staffBefore.length} teachers before`,
  ).toBeGreaterThan(0);
  console.log(
    `schools raise: ${r.where}: ${hired.length} hired at ${r.district.id}; budget ${r.adopted.id} (${r.adopted.adoptedBy}); jobs ${jobIds.slice(0, 5).join(", ")}; people ${hired.slice(0, 5).join(", ")}`,
  );
  // Each hire, named or counted, held no job still running when hired: every
  // job the person held when the line was proposed had ended on or before the
  // day they started at the district. The job is a record at the district.
  const rt = residentsRuntime(r.core);
  const startOf = (jobId: string, personId: string): string | undefined => {
    for (const c of r.core.work.commitments.values())
      if (c.jobId === jobId) return c.startsAt;
    const household = rt?.households.get(
      rt.householdOfPerson.get(personId) ?? "",
    );
    return household?.workCommitments.find((c) => c.jobId === jobId)?.startsAt;
  };
  const endOf = (jobId: string) =>
    (r.core.jobs.get(jobId) ?? rt?.jobs.get(jobId))?.endsAt;
  const report: string[] = [];
  for (const personId of hired) {
    const tier = r.fullBefore.has(personId) ? "named" : "counted";
    const hireJob = r
      .teachers(r.district.id)
      .find((j) => j.personId === personId)!;
    const hiredOn = startOf(hireJob.id, personId);
    expect(
      hiredOn,
      `${r.where}: no start record for ${hireJob.id}`,
    ).toBeDefined();
    const prior = r.priorJobs.get(personId) ?? [];
    for (const jobId of prior) {
      const endsAt = endOf(jobId);
      expect(
        endsAt !== undefined && endsAt <= hiredOn!,
        `${r.where}: ${tier} ${personId} was hired at ${r.district.id} on ${hiredOn} while ${jobId} was ${endsAt === undefined ? "still running" : `running until ${endsAt}`} (jobs ${jobIds.join(", ")})`,
      ).toBe(true);
    }
    report.push(
      `${tier} ${personId} hired ${hiredOn} (${hireJob.id}); previous ${prior.length ? prior.map((id) => `${id} ended ${endOf(id)}`).join(", ") : "none"}`,
    );
  }
  process.stdout.write(
    `schools raise hires by tier: ${r.where}: ${report.slice(0, 8).join(" | ")}; counted hires ${report.filter((x) => x.startsWith("counted")).length} of ${report.length}\n`,
  );
}, 1_800_000);

it("negative control: with the council's budget vote broken, an eligible place fails instead of drawing on", () => {
  let failure = "";
  try {
    amendSchoolsLine(1, () => registerBudgetVote(() => null));
  } catch (error) {
    failure = (error as Error).message;
  }
  console.log(`negative control failure: ${failure}`);
  // The producer is restored by the next world build (openLegislature).
  expect(failure).toMatch(
    /was not adopted and no council amendment or rejection explains it: budget .* names no recorded budget bill/,
  );
}, 1_800_000);
