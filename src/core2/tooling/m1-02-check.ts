/**
 * M1-02 golden-path check, on the whole economy. Uses GOLDEN_PATH_SEED and
 * GOLDEN_PATH_PLACE_KEY from the runner. A drawn town on the two-level world
 * with every economy engine runs two years from its start date. Passes when:
 * (1) every simulated 12-month change and quarterly output growth stays
 * inside the 1990-2026 bands; (2) the national step heard the town's own
 * income growth once a year of it was recorded; (3) every board vote records
 * its reasons; (4) at every rate change, each of the town bank's prime-linked
 * business lines reprices on the decision's effective date. Exits nonzero on
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
import { generatedOpening } from "./generated-world";

const seed = process.env.GOLDEN_PATH_SEED ?? process.argv[2],
  placeKey = process.env.GOLDEN_PATH_PLACE_KEY ?? process.argv[3];
if (!seed || !placeKey)
  throw new Error("GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY are required.");
const data = worldCoreData(),
  p = (key: string) => parameter(key, data.parameters);
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
// Only months whose year-earlier base is itself simulated hear the town; before that the base is the opening's seeded income.
const firstSimulated = input.startedAt.slice(0, "YYYY-MM".length);
const heard = months
  .filter(
    (row) =>
      row.townIncomeGrowthPct !== undefined &&
      row.month > shiftMonth(firstSimulated, p("macroMonthsPerYear"), p),
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
for (const meeting of meetings) {
  const votes = macro.table("votes").query("byMeeting", [meeting.id]);
  if (votes.length !== p("macroBoardVoters"))
    failures.push(`${meeting.id}: ${votes.length} votes`);
  if (votes.some((row) => !row.pulls || typeof row.desiredRatePct !== "number"))
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
    if (
      linked.some(
        (row) =>
          row.meetingId === meeting.id && row.date === meeting.effectiveAt,
      )
    )
      repriced += 1;
    else
      failures.push(
        `${line.facilityId} not repriced on ${meeting.effectiveAt} after ${meeting.id}`,
      );
  }
if (!changes.length) failures.push("no rate change in two years");
if (changes.length && !repriced)
  failures.push("no town bank line was open at a rate change");

console.log(
  JSON.stringify({
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
  }),
);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
