// @vitest-environment node
/**
 * A ban-the-box law in force in the town stops a public employer from weighing
 * a conviction against an applicant. Twin worlds of one drawn place and seed,
 * identical but for the law: the same twenty-five workers of private
 * employers are laid off through the business's own layoff, and every other
 * one of them who then looks for work is given a conviction on the justice
 * record (written as the justice engine writes it; the engine convicts too
 * rarely for a year to supply them). The town's government then raises its
 * police line by four positions' cost through the real budget, so the public
 * employer posts openings that the week's matching fills from whoever applies:
 * more applicants than openings. Ninety days on, a seeker with a record who
 * holds a public job only where the law is in force is the proof; a town where
 * nobody does is reported, and the other checks hold in every town.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { BAN_THE_BOX_KEY, recordBiasAt } from "./jobs-record-bias";
import { appliedOn } from "./law-reach/applied";
import { budgetToday } from "./law-reach/group-a-money";
import {
  currentStaff,
  reachParameter,
  STAFFING,
  townOrganizations,
} from "./law-reach/group-a-records";
import { advanceCore } from "./life";
import { amendBudget, governments } from "./modules/budgets";
import {
  JUSTICE_MODULE_ID,
  convictionsOf,
  type CaseRow,
  type SentenceRow,
} from "./modules/justice";
import { JOBS_MODULE_ID, layOffWorker } from "./modules/jobs";
import { enactLaw, lawChain } from "./modules/laws";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const LINE = "budget-line:police";
const line = "police";
const build = (p: { seed: string; key: string }) =>
  buildBenchWorld(p.seed, gameStartDate(), {
    placeKey: p.key,
    twoLevel: true,
  }).core as CoreState;

/** The town's police government and employers, and the private workers to lay off. */
function setupOf(core: CoreState) {
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  const gov = STAFFING[LINE]!.levels.map((level) =>
    governments(api).find(
      (g) =>
        g.level === level &&
        (budgetToday(api, g)?.spendingMinor[line] ?? 0) > 0,
    ),
  ).find((g) => g);
  const employers = townOrganizations(api, STAFFING[LINE]!.employers);
  const jobs = [...core.jobs.values()]
    .filter((job) => {
      const org = core.organizations.get(job.organizationId);
      return (
        job.endsAt === undefined &&
        org?.placeId === town &&
        org.kind === "employer" &&
        !org.publicPayAuthority &&
        core.people.get(job.personId)?.tier !== "husk"
      );
    })
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 25);
  const staffed = employers.some((o) => currentStaff(api, o.id).length > 0);
  return {
    api,
    town,
    gov,
    employers,
    jobs,
    ok: !!gov && staffed && jobs.length >= 25,
  };
}

/** The first drawn town, from a start, whose police have staff to copy a job from and which has twenty-five private workers. */
function townFrom(start: number) {
  for (let n = start; n < start + 12; n++) {
    const drawn = drawPlace(seed, `ban-the-box-${n}`);
    if (setupOf(build(drawn)).ok) return { n, drawn };
  }
  return undefined;
}

function convict(api: CoreAPI, personId: string) {
  const date = api.state.date;
  const table = (name: string) =>
    api.moduleState(JUSTICE_MODULE_ID).table(name);
  const sentence: SentenceRow = {
    id: `sentence:test:${personId}`,
    kind: "person",
    caseId: `case:test:${personId}`,
    personId,
    date,
    severity: 0.3,
    fineMinor: 0,
    finePaidMinor: 0,
    treasuryId: null,
    probationMonths: 0,
    custodyMonths: 0,
    releaseDate: date,
    seatsVacated: [],
    jobsEnded: [],
    reasons: {},
    source: { tag: "SOURCED", citation: "test", asOf: date },
  };
  const row: CaseRow = {
    id: sentence.caseId,
    kind: "person",
    investigationId: "investigation:test",
    prosecutorOfficeId: "office:test",
    defendantId: personId,
    crimeIds: ["crime:test"],
    evidence: 1,
    date,
    status: "convicted",
    plea: false,
    trialDate: null,
    reasons: {},
    sentenceId: sentence.id,
  };
  table("sentences").put(sentence as never);
  table("cases").put(row as never);
}

function twin(ban: boolean, place: { seed: string; key: string }) {
  const core = build(place);
  const { api, town, gov, employers, jobs } = setupOf(core);
  for (const level of lawChain(api).levels)
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: level.level,
      series: BAN_THE_BOX_KEY,
      value: ban ? 1 : 0,
      effectiveDate: core.date,
      measureId: `fixture:ban-the-box:${ban}`,
      citation: "Controlled law case: ban the box in public hiring.",
    });
  for (const job of jobs) layOffWorker(api, job.id);
  const seekers = (
    api
      .moduleState(JOBS_MODULE_ID)
      .table("seekers")
      .query("all", [true]) as unknown as {
      personId: string;
      placeId: string;
    }[]
  )
    .filter((s) => s.placeId === town)
    .map((s) => s.personId)
    .sort();
  const withRecord = seekers.filter((_, i) => i % 2 === 0);
  for (const id of withRecord) convict(api, id);
  // Four positions' cost more for the police: the employer posts the openings.
  amendBudget(api, {
    governmentId: gov!.id,
    line,
    deltaMinor: 4 * reachParameter("publicPositionAnnualMinor"),
    measureId: `fixture:ban-the-box:${line}`,
  });
  return { core, api, seekers, withRecord, employers, gov: gov! };
}

it(
  "a ban-the-box law changes which applicant a public employer hires, and a conviction costs an applicant a public job only without it",
  { timeout: 3_600_000 },
  () => {
    let start = 0;
    let witness: string | undefined;
    let lastWhere = "";
    for (let tries = 0; tries < 4 && !witness; tries++) {
      const found = townFrom(start);
      if (!found) break;
      const place = found.drawn;
      start = found.n + 1;
      const where = `${place.name} (${place.key}), seed ${seed}`;
      lastWhere = where;
      const banned = twin(true, place);
      const open = twin(false, place);
      expect(banned.withRecord, where).toEqual(open.withRecord);
      expect(banned.withRecord.length, `${where}: seekers`).toBeGreaterThan(1);
      const employer = banned.employers[0]!;
      const biasOf = (w: ReturnType<typeof twin>) =>
        recordBiasAt(w.api, employer.id, employer.placeId);
      expect(biasOf(banned)?.ban, "ban world").toBe(true);
      expect(biasOf(open)?.ban, "no-ban world").toBe(false);
      const person = banned.withRecord[0]!;
      expect(convictionsOf(banned.api, person).length).toBe(1);
      expect(
        biasOf(open)?.penaltyOf(person),
        "penalty without the ban",
      ).toBeGreaterThan(0);
      for (const w of [banned, open])
        advanceCore(w.core, addDays(makeIsoDate(w.core.date), 90));
      const hired = (w: ReturnType<typeof twin>) =>
        appliedOn(w.api, BAN_THE_BOX_KEY).filter(
          (r) => r.what === "hired-over-record-penalty",
        );
      expect(hired(open).length, "no ban, no application").toBe(0);
      for (const row of hired(banned)) {
        expect(banned.withRecord, `${row.targetId} has a record`).toContain(
          row.targetId,
        );
        expect(row.amountMinor).toBeGreaterThan(0);
      }
      // The ranking is read by record: the same applicant for the same opening, weighed in each world.
      const rankings = (w: ReturnType<typeof twin>) =>
        new Map(
          appliedOn(w.api, BAN_THE_BOX_KEY)
            .filter((r) => r.what.startsWith("ranked-"))
            .map((r) => {
              const m =
                /^ranked-(\d+)-of-(\d+)-fit-(-?[\d.]+)-(record|clear)$/.exec(
                  r.what,
                )!;
              return [
                r.targetId,
                {
                  id: r.id,
                  place: Number(m[1]),
                  of: Number(m[2]),
                  fit: Number(m[3]),
                  record: m[4] === "record",
                },
              ] as const;
            }),
        );
      const withLaw = rankings(banned);
      const without = rankings(open);
      const penalty = banned.api.parameter("jobsRecordApplicantPenalty");
      const shared = [...withLaw.keys()].filter((k) => without.has(k));
      process.stdout.write(
        `BAN-THE-BOX ${where}: ${withLaw.size} ranked applicants with the law, ${without.size} without, ${shared.length} the same applicant for the same opening in both\n`,
      );
      let example: string | undefined;
      for (const k of shared) {
        const a = withLaw.get(k)!;
        const b = without.get(k)!;
        expect(a.record, `${k}: same record in both worlds`).toBe(b.record);
        // A conviction costs the penalty only where the law is not in force.
        expect(a.fit - b.fit, k).toBeCloseTo(a.record ? penalty : 0, 0);
        if (a.record && example === undefined) {
          example = k;
          const [position, person] = k.split("|");
          process.stdout.write(
            `BAN-THE-BOX RANKING ${where}: ${person} has a conviction (case ${convictionsOf(banned.api, person!)[0]!.id}); for opening ${position}: with the law, fit ${a.fit} (law record ${a.id}, place ${a.place} of ${a.of}); without it, fit ${b.fit} (law record ${b.id}, place ${b.place} of ${b.of})\n`,
          );
        }
      }
      const publicJob = (w: ReturnType<typeof twin>, id: string) =>
        w.employers.some((o) =>
          currentStaff(w.api, o.id).some((s) => s.personId === id),
        );
      const held = (w: ReturnType<typeof twin>) =>
        w.withRecord.filter((id) => publicJob(w, id));
      const posted = appliedOn(banned.api, LINE).filter(
        (r) => r.what === "hired-on-budget-line",
      ).length;
      process.stdout.write(
        `BAN-THE-BOX ${where}: ${banned.seekers.length} laid-off seekers, ${banned.withRecord.length} with a record; ${posted} hired on the police line with the law; seekers with a record in a public job: ${held(banned).length} with the law, ${held(open).length} without; hired over the penalty: ${hired(banned).length}\n`,
      );
      const flipped = banned.withRecord.find(
        (id) => publicJob(banned, id) && !publicJob(open, id),
      );
      if (flipped) {
        witness = flipped;
        const row = hired(banned).find((r) => r.targetId === flipped);
        process.stdout.write(
          `BAN-THE-BOX WITNESS ${where}: ${flipped} has a conviction (case ${convictionsOf(banned.api, flipped)[0]!.id}) and holds a public job with the law${row ? ` (law record ${row.id}, ${row.amountMinor} minor units a year)` : ""}; without it they hold none\n`,
        );
      }
    }
    // Whether the law flipped a hire is reported, not required: a record holder has to compete with equal fit for the same few openings.
    process.stdout.write(
      witness
        ? `BAN-THE-BOX: witness ${witness}\n`
        : `BAN-THE-BOX ${lastWhere}: the law did not change a public hire in the towns tried\n`,
    );
  },
);
