/**
 * Public-sector bargaining (gov-public-sector-bargaining), in the played
 * world: a random place from all 56, by seed. With the law in force, a public
 * unit's pay is re-rated at its budget date by the growth of its employer's
 * line, followed to a named worker's pay change and the contract record; a
 * repeal stops the next contract.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { governmentUnitsForPlace } from "./reference/government-units";
import { corePlaceStateIdentities, searchCorePlaces } from "./place-lookup";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";
import { enactLaw, lawChain } from "./modules/laws";
import { reachTable, yesLevels } from "./law-reach/group-a-records";
import { jobsAt } from "./law-reach/group-b-money";
import { lineForPost } from "./budgets-treasury";
import { governments } from "./modules/budgets";
import bargaining from "./data/laws/public-bargaining.json" with { type: "json" };
import type { CoreAPI, CoreState } from "./types";

const UNITS = bargaining.units as Readonly<Record<string, { line: string }>>;
const KEY =
  "us-policy-positions:labor-workforce.public-sector-collective-bargaining";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`bargaining:${Date.now()}`).digest("hex");

const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
const pick = <T>(list: readonly T[], salt: string): T =>
  list[
    parseInt(
      createHash("sha256").update(`${seed}:${salt}`).digest("hex").slice(0, 8),
      16,
    ) % list.length
  ]!;

/** A place with its own city government: only a city budget line moves from year to year. */
function townWithCity(attempt: number): { key: string; state: string } {
  for (let tries = 0; tries < 30; tries += 1) {
    const state = pick(states, `state:${attempt}:${tries}`);
    const places = searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: state,
      scope: "locality",
    })
      .filter((p) =>
        governmentUnitsForPlace(p.sourceGeoid ?? p.key).some(
          (u) => u.unitType === "municipality",
        ),
      )
      .sort((a, b) => a.key.localeCompare(b.key));
    if (places.length)
      return { key: pick(places, `place:${attempt}:${tries}`).key, state };
  }
  throw new Error(`no incorporated town in thirty tries (seed ${seed})`);
}

interface Contract {
  readonly id: string;
  readonly since: string;
  readonly facts: Record<string, string | number>;
}
const contracts = (api: CoreAPI): Contract[] =>
  (reachTable(api, "mechanics").rows() as unknown as Contract[]).filter((r) =>
    r.id.startsWith("bargaining:"),
  );

function setLaw(api: CoreAPI, level: string, value: 0 | 1, tag: string): void {
  const row = lawChain(api).levels.find((l) => l.level === level)!;
  enactLaw(api, {
    jurisdiction: row.jurisdiction,
    level: level as "federal" | "state" | "county" | "city",
    series: KEY,
    value,
    effectiveDate: addDays(makeIsoDate(api.state.date), 1),
    measureId: `test:bargaining:${tag}`,
    citation: `Test measure ${tag}`,
  });
}

describe("public-sector bargaining sets a unit's pay from its employer's budget line", () => {
  it(`raises a named worker's pay by the line's growth, and a repeal stops the next contract (seed ${seed})`, () => {
    const tried: string[] = [];
    // The named worker's case comes first; counted workers re-rated by a
    // contract are checked in the same place or, where its units are all
    // named people, in the next places drawn.
    let countedTotal = 0;
    let named = false;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const place = townWithCity(attempt);
      const world = buildBenchWorld(seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core: CoreState = world.core;
      const api = coreAPI(core);
      // The wider population's jobs in each unit, their pay the day before:
      // a contract re-rates them by the same growth as a named worker's.
      const countedPay = () =>
        new Map(
          Object.keys(UNITS).flatMap((classification) =>
            jobsAt(api, [classification])
              .filter((job) => !core.jobs.has(job.id))
              .map(
                (job) =>
                  [
                    job.id,
                    { classification, hourly: job.hourlyMinor ?? 0 },
                  ] as const,
              ),
          ),
        );
      let countedChecked = 0;
      // The world's own legislature may repeal the law on any day; the test
      // re-enacts it daily so a budget date never falls in a lapse.
      for (let day = 0; day < 400; day += 1) {
        if (!yesLevels(api, KEY).length)
          setLaw(api, "state", 1, `yes:${attempt}:${day}`);
        const before = countedPay();
        const known = new Set(contracts(api).map((c) => c.id));
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        for (const c of contracts(api)) {
          if (known.has(c.id) || !(Number(c.facts.raised) > 0)) continue;
          const growth =
            Number(c.facts.lineNowMinor) / Number(c.facts.lineBeforeMinor) - 1;
          const after = countedPay();
          for (const [jobId, was] of before) {
            if (was.classification !== c.facts.classification) continue;
            const now = after.get(jobId);
            if (!now || was.hourly <= 0) continue;
            expect(
              now.hourly,
              `${place.key}: counted ${jobId} under ${c.id}`,
            ).toBe(Math.max(was.hourly, Math.round(was.hourly * (1 + growth))));
            countedChecked += 1;
          }
        }
        // Stop as soon as a contract has raised a named worker's pay (or,
        // once that case is proved, a counted worker's).
        if (
          named
            ? countedChecked > 0
            : contracts(api).some(
                (c) =>
                  Number(c.facts.raised) > 0 &&
                  c.facts.sampleJobId !== undefined,
              )
        )
          break;
      }
      countedTotal += countedChecked;
      if (named) {
        tried.push(`${place.key}: ${countedChecked} counted jobs re-rated`);
        if (countedTotal > 0) {
          process.stdout.write(
            `BARGAINING COUNTED ${place.key} (seed ${seed}): ${countedChecked} counted jobs re-rated by their line's growth\n`,
          );
          return;
        }
        continue;
      }
      const raised = contracts(api).filter((c) => Number(c.facts.raised) > 0);
      tried.push(
        `${place.key}: ${contracts(api)
          .map(
            (c) =>
              `${c.facts.line} ${c.facts.raisePct}% (${c.facts.sampleJobId ?? "counted only"})`,
          )
          .join(", ")}`,
      );
      // A named worker's job is the proof: a place whose contracts raised only
      // counted workers is checked above and the search goes on.
      const contract = raised.find((c) => c.facts.sampleJobId !== undefined);
      if (!contract) continue;
      const f = contract.facts;
      // The raise is the line's growth, no more: the pay change cites the line.
      const growth = Number(f.lineNowMinor) / Number(f.lineBeforeMinor) - 1;
      expect(Number(f.raisePct)).toBeCloseTo(growth * 100, 1);
      {
        const change = core.work.payChanges
          .get(String(f.sampleJobId))
          ?.find(
            (c) =>
              c.source.citation.includes(String(f.line)) &&
              c.source.citation.includes("the unit's contract"),
          );
        expect(
          change,
          `${place.key}: pay change on ${f.sampleJobId}`,
        ).toBeDefined();
        expect(change!.hourlyMinor).toBe(Number(f.sampleToMinor));
        expect(Number(f.sampleToMinor)).toBe(
          Math.round(Number(f.sampleFromMinor) * (1 + growth)),
        );
      }
      // The raised pay is paid: the worker's next payroll receipt after the
      // contract, from the employer whose budget line the contract names.
      const sampleJob = core.jobs.get(String(f.sampleJobId))!;
      const gov = governments(api).find((g) => g.id === f.governmentId)!;
      expect(
        lineForPost(
          gov.level,
          sampleJob.id,
          core.organizations.get(sampleJob.organizationId)?.classification,
        ),
        `${place.key}: ${sampleJob.id}`,
      ).toBe(f.line);
      const receiptAfter = () =>
        [...core.work.payrollLedgerByCommitment.values()].find(
          (row) =>
            row.jobId === sampleJob.id &&
            row.lastPayrollReceiptId !== undefined &&
            String(row.lastPayrollReceiptId).split(":")[1]! >= contract.since,
        );
      for (let day = 0; day < 45 && !receiptAfter(); day += 1)
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const paid = receiptAfter();
      expect(
        paid?.lastPayrollReceiptId,
        `${place.key}: ${sampleJob.id} paid after ${contract.id}`,
      ).toBeTruthy();
      const receipt = core.work.latestPayrollByJob.get(sampleJob.id);
      expect(receipt).toMatchObject({
        id: paid!.lastPayrollReceiptId,
        personId: sampleJob.personId,
        organizationId: sampleJob.organizationId,
      });
      expect(receipt!.date >= contract.since).toBe(true);
      expect(receipt!.paidMinor).toBeGreaterThan(0);
      const cashSource = core.work.payrollCashSources.get(receipt!.id);
      expect(cashSource).toBeDefined();
      expect(
        cashSource!.postedJournalSequence !== undefined ||
          cashSource!.completedAt !== undefined,
      ).toBe(true);
      process.stdout.write(
        `BARGAINING ${place.key} (seed ${seed}): ${contract.id} raised ${f.raised} jobs by ${f.raisePct}% (${f.line}); ${sampleJob.personId} on ${sampleJob.id} ${f.sampleFromMinor} to ${f.sampleToMinor}, paid by ${sampleJob.organizationId} in ${paid!.lastPayrollReceiptId} (${receipt!.paidMinor} minor, journal ${cashSource!.postedJournalSequence ?? "completed public source"}); ${countedChecked} counted jobs re-rated and checked\n`,
      );
      // A repeal at every level in force stops the next contract.
      const repealed = new Set(yesLevels(api, KEY).map((l) => l.lawId));
      for (const l of yesLevels(api, KEY))
        setLaw(api, l.level, 0, `no:${attempt}:${l.level}`);
      advanceCore(core, addDays(makeIsoDate(core.date), 2));
      expect(yesLevels(api, KEY)).toHaveLength(0);
      const before = new Set(contracts(api).map((c) => c.id));
      advanceCore(core, addDays(makeIsoDate(core.date), 400));
      // A year on, the world's own legislature may have enacted the law again;
      // any contract since then cites that new law, never the repealed one.
      for (const c of contracts(api).filter((row) => !before.has(row.id)))
        expect(
          repealed.has(String(c.facts.lawId)),
          `${place.key}: ${c.id} was bargained under the repealed ${c.facts.lawId}`,
        ).toBe(false);
      named = true;
      if (countedTotal > 0) return;
    }
    throw new Error(
      named
        ? `no contract re-rated a counted worker in six places (seed ${seed}): ${tried.join("; ")}`
        : `no place raised a named worker's pay in six tries (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 3_600_000);
});
