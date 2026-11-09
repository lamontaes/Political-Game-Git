// @vitest-environment node
/**
 * A ban-the-box law in force in the town stops a public employer from weighing
 * a conviction against an applicant. Twin worlds of one drawn place and seed:
 * in both, every other seeker looking for work in the town has a conviction
 * on the justice record (written as the justice engine writes it; the engine
 * convicts too rarely for a year to supply them); in one the state and town
 * have the ban-the-box law, in the other they do not. Public employers hire
 * from the same pool for 90 days. With the ban, the law is applied to the
 * applicants with a record they hired over the penalty; without it, none is,
 * and applicants with a record are hired less often.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { advanceCore } from "./life";
import { BAN_THE_BOX_KEY, recordBiasAt } from "./jobs-record-bias";
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
const build = (p: { seed: string; key: string }) =>
  buildBenchWorld(p.seed, gameStartDate(), {
    placeKey: p.key,
    twoLevel: true,
  }).core as CoreState;

/** Workers a town's employers could lay off: a dozen at private ones and thirty at public ones, so the public ones have openings to fill. */
function laidOffIn(core: CoreState) {
  const town = lawChain(coreAPI(core)).townPlaceId;
  const workers = (isPublic: boolean, count: number) =>
    [...core.jobs.values()]
      .filter((job) => {
        const org = core.organizations.get(job.organizationId);
        return (
          job.endsAt === undefined &&
          org?.placeId === town &&
          org.kind === "employer" &&
          !!org.publicPayAuthority === isPublic &&
          core.people.get(job.personId)?.tier !== "husk"
        );
      })
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, count);
  const jobs = [...workers(false, 12), ...workers(true, 30)];
  const publicEmployer = [...core.organizations.values()].some(
    (o) => o.publicPayAuthority && o.placeId === town,
  );
  return { jobs, publicEmployer };
}

// The first drawn town with a dozen private workers to lay off and a public employer to hire them.
const place = (() => {
  for (let n = 0; n < 12; n++) {
    const drawn = drawPlace(seed, `ban-the-box-${n}`);
    const { jobs, publicEmployer } = laidOffIn(build(drawn));
    if (jobs.length >= 20 && publicEmployer) return drawn;
  }
  throw new Error(
    `No drawn town for seed ${seed} has twenty workers to lay off and a public employer`,
  );
})();
const where = `${place.name} (${place.key}), seed ${seed}`;

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

function twin(ban: boolean) {
  const core = build(place);
  const api = coreAPI(core);
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
  // The same twelve named workers of private employers are laid off in both
  // worlds, through the business's own layoff, and so come to look for work.
  const town = lawChain(api).townPlaceId;
  const laidOff = laidOffIn(core).jobs;
  const seekersNowAll = () =>
    api
      .moduleState(JOBS_MODULE_ID)
      .table("seekers")
      .query("all", [true]) as unknown as {
      personId: string;
      placeId: string;
    }[];
  for (const job of laidOff) layOffWorker(api, job.id);
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const seekersNow = () =>
    (
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
  const seekers = seekersNow();
  const withRecord = seekers.filter((_, i) => i % 2 === 0);
  for (const id of withRecord) convict(api, id);
  return { core, api, seekers, withRecord };
}

it(
  `a ban-the-box law keeps a conviction from costing an applicant a public job: ${where}`,
  { timeout: 1_800_000 },
  () => {
    const banned = twin(true);
    const open = twin(false);
    expect(banned.withRecord, where).toEqual(open.withRecord);
    expect(banned.withRecord.length, `${where}: seekers`).toBeGreaterThan(1);
    const person = banned.withRecord[0]!;
    expect(convictionsOf(banned.api, person).length).toBe(1);
    const employer = [...banned.core.organizations.values()].find(
      (o) =>
        o.publicPayAuthority && o.placeId === lawChain(banned.api).townPlaceId,
    );
    expect(employer, `${where}: a public employer in the town`).toBeTruthy();
    // The cause is read before anyone is hired: the law in force, per world.
    const biasOf = (w: ReturnType<typeof twin>) =>
      recordBiasAt(w.api, employer!.id, employer!.placeId);
    expect(biasOf(banned)?.ban, "ban world").toBe(true);
    expect(biasOf(open)?.ban, "no-ban world").toBe(false);
    expect(
      biasOf(open)?.penaltyOf(person),
      "penalty without the ban",
    ).toBeGreaterThan(0);
    for (const w of [banned, open]) {
      const end = addDays(makeIsoDate(w.core.date), 180);
      advanceCore(w.core, end);
    }
    const hired = (w: ReturnType<typeof twin>) =>
      appliedOn(w.api, BAN_THE_BOX_KEY).filter(
        (r) => r.what === "hired-over-record-penalty",
      );
    const underBan = hired(banned);
    const withoutBan = hired(open);
    process.stdout.write(
      `BAN-THE-BOX ${where}: ${banned.withRecord.length} seekers with a record; hired over the penalty with the ban: ${underBan.length}, without it: ${withoutBan.length}\n`,
    );
    expect(withoutBan.length, "no ban, no application").toBe(0);
    for (const row of underBan) {
      expect(banned.withRecord, `${row.targetId} has a record`).toContain(
        row.targetId,
      );
      expect(row.amountMinor).toBeGreaterThan(0);
    }
    // Seekers all lost their jobs, so any job held now is a re-hire; count those at public employers.
    const publicHiresWithRecord = (w: ReturnType<typeof twin>) =>
      w.withRecord.filter((id) => {
        const job = w.core.jobs.get(w.core.people.get(id)?.jobId ?? "");
        return (
          job &&
          !!w.core.organizations.get(job.organizationId)?.publicPayAuthority
        );
      }).length;
    const a = publicHiresWithRecord(banned);
    const b = publicHiresWithRecord(open);
    process.stdout.write(
      `BAN-THE-BOX ${where}: public hires of seekers with a record: ${a} with the ban, ${b} without\n`,
    );
    expect(a).toBeGreaterThanOrEqual(b);
  },
);
