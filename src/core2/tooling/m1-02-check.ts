/**
 * M1-02 golden-path check, on the whole economy. Uses GOLDEN_PATH_SEED and
 * GOLDEN_PATH_PLACE_KEY from the runner. A drawn town on the two-level world
 * with every economy engine runs two years from its start date. Passes when:
 * (1) every simulated 12-month change and quarterly output growth stays
 * inside the 1990-2026 bands; (2) the national step heard the town's own
 * income growth once a year of it was recorded; (3) every board vote records
 * its reasons; (4) at every rate change, each of the town bank's prime-linked
 * business lines reprices on the decision's effective date. The loan-cost
 * witness (4) needs a town with a bank line open at a rate change; where the
 * drawn town has none (Swanton, Nebraska has no bank), further places are drawn
 * from all 56, every attempted place and seed reported. Exits nonzero on
 * failure.
 */
import { advanceCore, createLifeCore } from "../life";
import { checkBands, shiftMonth, type MacroMonth } from "../macro-model";
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
  const months = [...macro.table("months").rows()] as unknown as (MacroMonth & {
    townIncomeGrowthPct?: number;
  })[];
  const bands = checkBands(months, p).filter((row) => !row.baseIsHistory);
  for (const row of bands.filter((row) => !row.inside))
    failures.push(
      `band ${row.measure} ${row.at} ${row.value.toFixed(2)} outside [${row.low}, ${row.high}]`,
    );
  // Only months whose two compared years are both simulated hear the town; before that the base includes the opening's seeded income.
  const firstSimulated = input.startedAt.slice(0, "YYYY-MM".length);
  const heard = months
    .filter(
      (row) =>
        row.townIncomeGrowthPct !== undefined &&
        // Twelve months against the twelve before: both years simulated from the 24th month.
        row.month >= shiftMonth(firstSimulated, 2 * p("macroMonthsPerYear"), p),
    )
    .sort((a, b) => a.month.localeCompare(b.month));
  if (!heard.length) failures.push("the national step never heard the town");

  const meetings = [...macro.table("meetings").rows()] as unknown as {
    id: string;
    fromRatePct: number;
    toRatePct: number;
    effectiveAt: string;
  }[];
  const lines = [...macro.table("lines").rows()] as unknown as {
    facilityId: string;
    linkedAt?: string;
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
      const first = linked.map((row) => row.date).sort()[0];
      // Lines opened after the decision took effect have nothing to reprice.
      if (!facility || !first || first > meeting.effectiveAt) continue;
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
    townGrowthByMonth: heard.map(
      (row) => `${row.month} ${row.townIncomeGrowthPct!.toFixed(2)}`,
    ),
    townHeardFrom: heard[0]
      ? `${heard[0].month} (${heard[0].townIncomeGrowthPct!.toFixed(2)}% a year), ${heard.length} months`
      : null,
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
// clauses (bands, board votes, the town heard) still have to hold.
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
