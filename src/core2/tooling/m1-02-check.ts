/**
 * M1-02 golden-path check, on the whole economy. A pinned town on the
 * two-level world with every economy engine runs the days given (default two
 * years) from its start date. Passes when:
 * (1) UNCHECKED (owner, Nov 8: real ranges are not targets): the simulated
 * 12-month changes and quarterly output growth are printed beside the
 * 1990-2026 bands and never tested against them. The national cycle has no
 * recorded cause to test a value against yet (the national row is the sum of the
 * country tier's states, country-model.ts), so this clause waits for the cycle's causes (Money) and
 * keeps no band meanwhile; (2) the country tier holds all 56 states and the
 * latest simulated month's unemployment is the sum of their cells; (3) every board vote records
 * its reasons; (4) at every rate change, each of the town bank's prime-linked
 * business lines reprices on the decision's effective date. The loan-cost
 * witness (4) needs a town with a bank line open at a rate change, so the
 * town is pinned below. Exits nonzero on failure.
 */
import { advanceCore, createLifeCore } from "../life";
import { checkBands, type MacroMonth } from "../macro-model";
import { countryStates } from "../modules/macro";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "../modules/world";
import { parameter } from "../parameters";
import { coreAPI } from "../state";
import { generatedOpening } from "./generated-world";

/**
 * This check names its own place by design, and the runner's drawn place is
 * ignored: the loan-cost witness (4) needs a town with a bank line open at a
 * rate change, which a drawn town often lacks, and a check that draws further
 * places until one has it is a draw loop. Ridgewood, New Jersey at this world
 * seed has a bank line open at the first rate change (2025-01-23, repriced the
 * day it took effect; measured Nov 14).
 *
 * How many days it plays is the argument, in days from the start date: 730
 * (two years, the long job) holds every clause over five rate changes; 120
 * (the quick job) holds the first two rate changes (2025-01-23 and
 * 2025-03-20) with their votes, reasons and repricing, in about a third of
 * the time. The days are the world's own played days (about 0.09 s each after
 * a 17.6 s build), so they cannot be skipped, only chosen.
 */
const PIN = {
  seed: "4f76e802069c3914723aad11a315bab328faf3c66c4ec6e783a1ed7664433966",
  placeKey: "3463000",
};
const days = Number(process.argv[2] ?? 730);
if (!Number.isInteger(days) || days < 90)
  throw new Error("the days to play must be a whole number of at least 90");
const seed = PIN.seed,
  placeKey = PIN.placeKey;
const data = worldCoreData(),
  p = (key: string) => parameter(key, data.parameters);

function check(seed: string, placeKey: string) {
  const failures: string[] = [];
  const input = withWorldEconomy(
    generatedOpening({ seed, key: placeKey }, { twoLevel: true }),
  );
  const core = createLifeCore(input, { data, modules: [...WORLD_MODULES] });
  const api = coreAPI(core);
  const end = new Date(`${input.startedAt}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + days);
  advanceCore(core, end.toISOString().slice(0, 10));

  const macro = api.moduleState("macro");
  const months = [...macro.table("months").rows()] as unknown as MacroMonth[];
  const bands = checkBands(months, p).filter((row) => !row.baseIsHistory);
  // Printed beside the real band, never tested against it (clause 1).
  const beside = bands
    .filter((row) => !row.inside)
    .map(
      (row) =>
        `${row.measure} ${row.at} ${row.value.toFixed(2)} beside the real [${row.low}, ${row.high}]`,
    );
  // The national row is the sum of the country tier's states.
  const states = countryStates(api);
  if (states.length !== 56)
    failures.push(`the country tier holds ${states.length} states, not 56`);
  let workers = 0,
    seekers = 0;
  for (const state of states)
    for (const cell of state.cells) {
      workers += cell.workers;
      seekers += cell.seekers;
    }
  const latest = months
    .filter((row) => row.kind === "simulated")
    .sort((a, b) => a.month.localeCompare(b.month))
    .at(-1);
  if (
    !latest ||
    Math.abs(latest.unemploymentPct - (100 * seekers) / (workers + seekers)) >
      1e-6
  )
    failures.push("the national unemployment is not the states' sum");

  const meetings = [...macro.table("meetings").rows()] as unknown as {
    id: string;
    fromRatePct: number;
    toRatePct: number;
    effectiveAt: string;
  }[];
  const lines = [...macro.table("lines").rows()] as unknown as {
    facilityId: string;
    source?: { asOf: string };
  }[];
  const changes = meetings.filter((row) => row.toRatePct !== row.fromRatePct);
  let repriced = 0;
  const repricedRecords: string[] = [];
  for (const meeting of meetings) {
    const votes = macro.table("votes").query("byMeeting", [meeting.id]);
    if (votes.length !== p("macroBoardVoters"))
      failures.push(`${meeting.id}: ${votes.length} votes`);
    if (
      votes.some((row) => !row.pulls || typeof row.desiredRatePct !== "number")
    )
      failures.push(`${meeting.id}: a vote without its reasons`);
  }
  for (const meeting of changes)
    for (const line of lines) {
      const facility = core.finance.facilities.get(line.facilityId);
      const linked = macro
        .table("repricings")
        .query("byFacility", [line.facilityId]) as unknown as {
        date: string;
        meetingId: string;
      }[];
      // Whether the line was open before the decision took effect comes from
      // the line's own recorded date, never from the repricing output: with
      // the repricing removed there is none, and a real line would otherwise
      // read as no witness.
      const openedOn = line.source?.asOf ?? facility?.source.asOf;
      // Lines opened on or after the day the decision took effect are
      // priced at the new rate when they are linked.
      if (!facility || !openedOn || openedOn >= meeting.effectiveAt) continue;
      // A line the borrower closed (or whose borrower's business closed) on or
      // before the decision took effect is never repriced again.
      const endedOn = [
        facility.closedAt,
        core.finance.businesses.get(facility.borrowerId)?.closedAt,
      ]
        .filter((day): day is string => !!day)
        .sort()[0];
      if (endedOn && endedOn <= meeting.effectiveAt) continue;
      if (
        linked.some(
          (row) =>
            row.meetingId === meeting.id && row.date === meeting.effectiveAt,
        )
      ) {
        repriced += 1;
        repricedRecords.push(
          `${line.facilityId} repriced ${meeting.effectiveAt} by ${meeting.id}`,
        );
      } else
        failures.push(
          `${line.facilityId} not repriced on ${meeting.effectiveAt} after ${meeting.id}`,
        );
    }
  if (!changes.length) failures.push(`no rate change in ${days} days`);
  if (changes.length && !repriced)
    failures.push("no town bank line was open at a rate change");

  const report = {
    place: input.placeMetadata?.placeName,
    seed,
    start: input.startedAt,
    bandRows: bands.length,
    unchecked:
      "clause 1: the national cycle has no recorded cause to test a value against yet (Money); the figures are printed beside the real band",
    outsideTheRealBand: beside,
    countryStates: states.length,
    nationalUnemploymentPct: latest?.unemploymentPct,
    rateChanges: changes.map(
      (row) =>
        `${row.id}: ${row.fromRatePct} -> ${row.toRatePct} effective ${row.effectiveAt}`,
    ),
    townBankLines: lines.length,
    linesRepricedOnTheDay: repriced,
    repricedRecords,
  };
  return { failures, report, changes: changes.length, repriced };
}

// The pinned town only: it must show the loan-cost chain, and fails naming
// the place and the seed if it does not.
const result = check(seed, placeKey);
console.log(JSON.stringify({ days, report: result.report }));
if (result.failures.length) {
  console.error(
    `place ${placeKey} seed ${seed}, ${days} days:\n${result.failures.join("\n")}`,
  );
  process.exit(1);
}
