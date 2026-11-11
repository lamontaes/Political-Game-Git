/**
 * M1-02 golden-path check, on the whole economy. Uses GOLDEN_PATH_SEED and
 * GOLDEN_PATH_PLACE_KEY from the runner. A drawn town on the two-level world
 * with every economy engine runs two years from its start date. Passes when:
 * (1) UNCHECKED (owner, Nov 8: real ranges are not targets): the simulated
 * 12-month changes and quarterly output growth are printed beside the
 * 1990-2026 bands and never tested against them. The national cycle has no
 * recorded cause to test a value against yet (the national row is the sum of the
 * country tier's states, country-model.ts), so this clause waits for the cycle's causes (Money) and
 * keeps no band meanwhile; (2) the country tier holds all 56 states and the
 * latest simulated month's unemployment is the sum of their cells; (3) every board vote records
 * its reasons; (4) at every rate change, each of the town bank's prime-linked
 * business lines reprices on the decision's effective date. The loan-cost
 * witness (4) needs a town with a bank line open at a rate change; where the
 * drawn town has none (Swanton, Nebraska has no bank), further places are drawn
 * from all 56, every attempted place and seed reported. Exits nonzero on
 * failure.
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
import { drawPlace } from "../../../scripts/core2-year/place";
import { generatedOpening } from "./generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? process.argv[2],
  placeKey = process.env.GOLDEN_PATH_PLACE_KEY ?? process.argv[3];
if (!seed || !placeKey)
  throw new Error("GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY are required.");
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
  end.setUTCFullYear(end.getUTCFullYear() + 2);
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
  if (!changes.length) failures.push("no rate change in two years");
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

// The drawn town first. A town with no bank line open at a rate change cannot
// show the loan-cost chain, so further places are drawn from all 56 (bounded)
// until one does; every attempt is reported, and the zero-line town's other
// clauses (board votes, the country tier) still have to hold.
const NO_WITNESS = "no town bank line was open at a rate change";
const attempts: unknown[] = [];
const first = check(seed, placeKey);
const reasons = first.failures.filter((f) => f !== NO_WITNESS);
attempts.push(first.report);
let witness = first;
for (
  let draw = 0;
  !reasons.length && !witness.repriced && draw < 12;
  draw += 1
) {
  const place = drawPlace(seed, `m1-02-loan-witness-${draw}`);
  witness = check(place.seed, place.key);
  attempts.push(witness.report);
  if (witness.failures.filter((f) => f !== NO_WITNESS).length)
    reasons.push(...witness.failures.filter((f) => f !== NO_WITNESS));
}
if (!reasons.length && !witness.repriced)
  reasons.push(
    "no town bank line was open at a rate change in twelve more drawn places",
  );
console.log(JSON.stringify({ attempts, witness: witness.report }));
if (reasons.length) {
  console.error(reasons.join("\n"));
  process.exit(1);
}
