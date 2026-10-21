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
import { budgetsOf, governments } from "./modules/budgets";
import { memberKey } from "./modules/legislature";
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

/** The mayor amends the city's schools line by a third, up or down, and the year turns. */
function amendSchoolsLine(direction: -1 | 1) {
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
    if (core.date > open) continue;
    const priorLine = budgetsOf(api, city.id).at(-1)!.spendingMinor.schools;
    if (!priorLine) {
      tried.push(`${where}: the city budget has no schools line`);
      continue;
    }
    expect(budgetProposalDue(api, officeHost, mayorId), where).not.toBeNull();
    const staffBefore = teachers(district.id).map((j) => j.personId);
    const staffInPlace = staffBefore.length;
    // The job each full person held when the line was proposed: a hire must
    // not have been taken from a job still running.
    const priorJob = new Map(
      [...core.people.values()].map((person) => [person.id, person.jobId]),
    );
    const fullBefore = new Set(core.people.keys());
    const change = direction * Math.floor(priorLine / 3);
    prepareAct(api, mayorId, "propose-budget", {
      budget: { changes: { schools: change } },
    });
    officeActHandlers(officeHost)["propose-budget"]!(api, mayorId, {} as never);
    advanceCore(core, addDays(makeIsoDate(next), 10));
    const adopted = budgetsOf(api, city.id).find(
      (b) => b.startsOn === next || b.adoptedOn === next,
    );
    // A council that rewrites the mayor's proposal (the District of Columbia's)
    // is another place's story: draw on until the amended line is adopted as asked.
    if (adopted?.spendingMinor.schools !== priorLine + change) {
      tried.push(
        `${where}: adopted schools line ${adopted?.spendingMinor.schools}, not ${priorLine + change}`,
      );
      continue;
    }
    const activeNow = new Set(teachers(district.id).map((j) => j.personId));
    return {
      where,
      core,
      api,
      staffInPlace,
      district,
      priorLine,
      change,
      adopted,
      staffBefore,
      activeNow,
      priorJob,
      fullBefore,
      teachers,
    };
  }
  throw new Error(`no drawn place had the pieces: ${tried.join("; ")}`);
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
  expect(row!.baseStaff, r.where).toBe(r.staffInPlace);
  expect(row!.positions, r.where).toBeCloseTo(
    row!.baseStaff * ((r.priorLine + r.change) / r.priorLine),
  );
  expect(row!.positions, r.where).toBeLessThan(r.staffInPlace);
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
  expect(row!.baseStaff, r.where).toBe(r.staffInPlace);
  expect(row!.positions, r.where).toBeCloseTo(
    row!.baseStaff * ((r.priorLine + r.change) / r.priorLine),
  );
  expect(row!.positions, r.where).toBeGreaterThan(r.staffInPlace);
  expect(
    hired.length,
    `${r.where}: schools line ${r.priorLine} raised by ${r.change}, adopted ${r.adopted?.id}; ${r.staffBefore.length} teachers before`,
  ).toBeGreaterThan(0);
  console.log(
    `schools raise: ${r.where}: ${hired.length} hired at ${r.district.id}; jobs ${jobIds.slice(0, 5).join(", ")}; people ${hired.slice(0, 5).join(", ")}`,
  );
  // Each hire is a counted resident filled in, or a full person whose earlier
  // job (if any) had ended by the day they were hired; none was taken from a
  // job still running. The job is a record at the district.
  for (const personId of hired) {
    const prior = r.priorJob.get(personId);
    const earlier = prior ? r.core.jobs.get(prior) : undefined;
    expect(
      !r.fullBefore.has(personId) || !earlier || earlier.endsAt !== undefined,
      `${r.where}: ${personId} was hired at ${r.district.id} while ${prior} was still running (jobs ${jobIds.join(", ")})`,
    ).toBe(true);
  }
}, 1_800_000);
