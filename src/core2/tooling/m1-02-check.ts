/**
 * M1-02 golden-path check. Uses GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY
 * from the runner. (1) A national year from the world's start date keeps
 * every simulated 12-month change and quarterly output growth inside the
 * 1990-2026 bands. (2) In the drawn town, opened June 1, 2022, the June
 * meeting's decision reprices a named business's prime-linked line on its
 * effective date, with every voter's reasons recorded. Exits nonzero on failure.
 */
import { advanceCore, createLifeCore } from "../life";
import { checkBands, historyMonths, stepMacroMonth } from "../macro-model";
import { MACRO_MODULE, withCentralBank } from "../modules/macro";
import { REGIONAL_MODULE } from "../modules/regional";
import { worldCoreData } from "../modules/world";
import { standInPrimeLine } from "../credit-stand-in";
import { parameter } from "../parameters";
import { coreAPI } from "../state";
import { prepareWorldAt } from "./world-prepare";
import measurement from "../data/measurement.json" with { type: "json" };

const seed = process.env.GOLDEN_PATH_SEED ?? "m1-02-local",
  placeKey = process.env.GOLDEN_PATH_PLACE_KEY;
if (!placeKey) throw new Error("GOLDEN_PATH_PLACE_KEY is required.");
const data = worldCoreData(),
  p = (key: string) => parameter(key, data.parameters);
const failures: string[] = [];

const months = historyMonths(measurement.startedAt, p);
for (let i = 0; i < 24; i++)
  months.push(
    stepMacroMonth(months.at(-1)!, months.at(-1)!.policyRatePct, 0, 0, p),
  );
const bands = checkBands(months, p).filter((row) => !row.baseIsHistory);
for (const row of bands.filter((row) => !row.inside))
  failures.push(
    `band ${row.measure} ${row.at} ${row.value.toFixed(2)} outside [${row.low}, ${row.high}]`,
  );

const { input, place } = prepareWorldAt({
  seed,
  placeKey,
  startedAt: "2022-06-01",
});
const core = createLifeCore(withCentralBank(input), {
  data,
  modules: [MACRO_MODULE, REGIONAL_MODULE],
});
const api = coreAPI(core);
advanceCore(core, core.date);
const borrower = [...core.organizations.values()]
  .filter((row) => row.kind === "employer")
  .sort((a, b) => a.id.localeCompare(b.id))[0];
if (!borrower) failures.push("no employer in the drawn town");
else {
  const lender = [...core.organizations.values()].find(
    (row) => row.id !== borrower.id,
  )!;
  const line = standInPrimeLine(api, borrower.id, lender.id, 1_000_000, 1.5);
  advanceCore(core, "2022-06-20");
  const store = api.moduleState("macro");
  const meeting = store.table("meetings").get("meeting:2022-06-15") as
    { toRatePct: number; fromRatePct: number; effectiveAt: string } | undefined;
  const votes = store.table("votes").query("byMeeting", ["meeting:2022-06-15"]);
  const repricing = store.table("repricings").query("byFacility", [line]);
  if (!meeting) failures.push("no June 15, 2022 meeting");
  else {
    if (votes.length !== p("macroBoardVoters"))
      failures.push(`votes ${votes.length}`);
    if (
      votes.some((row) => !row.pulls || typeof row.desiredRatePct !== "number")
    )
      failures.push("a vote without its reasons");
    if (
      meeting.toRatePct !== meeting.fromRatePct &&
      repricing[0]?.date !== meeting.effectiveAt
    )
      failures.push(`line not repriced on ${meeting.effectiveAt}`);
    console.log(
      JSON.stringify({
        place: place.name,
        seed,
        meeting: `${meeting.fromRatePct} -> ${meeting.toRatePct} effective ${meeting.effectiveAt}`,
        business: borrower.name,
        repricing: repricing[0] ?? null,
        bandRows: bands.length,
      }),
    );
  }
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
