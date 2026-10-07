import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  captureRoute,
  compareCaptures,
  runParity,
  schedule,
  type Capture,
  type RouteAdapter,
} from "./parity";
import { runNationalParity } from "./national";
import { nationalPlacePlan, nationalHistoryTable } from "./places";

/** stdout only; caller owns evidence destination and storage guard. */
async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "plan")
    return nationalPlacePlan(args[0] ?? "engine-proof", Number(args[1] ?? 5));
  if (command === "compare") {
    if (!args[0] || !args[1] || resolve(args[0]) === resolve(args[1]))
      throw new Error("Two independent capture paths required");
    const baseline = JSON.parse(readFileSync(args[0], "utf8")) as Capture;
    const candidate = JSON.parse(readFileSync(args[1], "utf8")) as Capture;
    const comparison = compareCaptures(baseline, candidate);
    process.exitCode = comparison.equal ? 0 : 1;
    return {
      comparison,
      national: {
        baseline: nationalHistoryTable(baseline.world),
        candidate: nationalHistoryTable(candidate.world),
      },
    };
  }
  if (command === "national") {
    const [oldPath, newPath, seed, countText] = args;
    const days = Number(countText);
    if (
      !oldPath ||
      !newPath ||
      !seed ||
      resolve(oldPath) === resolve(newPath) ||
      !Number.isSafeInteger(days) ||
      days < 1
    )
      throw new Error(
        "national requires two independent adapters, seed and explicit positive days",
      );
    const baseline = (await import(pathToFileURL(resolve(oldPath)).href))
      .default as RouteAdapter;
    const candidate = (await import(pathToFileURL(resolve(newPath)).href))
      .default as RouteAdapter;
    const result = await runNationalParity(
      seed,
      days,
      baseline,
      candidate,
      (completed, comparison) =>
        console.error(
          JSON.stringify({
            completed,
            total: 56,
            placeKey: comparison.input.placeKey,
            equal: comparison.equal,
          }),
        ),
    );
    process.exitCode = result.equal ? 0 : 1;
    return result;
  }
  if (command === "capture") {
    const [modulePath, seed, placeKey, mode] = args;
    if (
      !modulePath ||
      !seed ||
      !placeKey ||
      !["days400", "minutes96"].includes(mode ?? "")
    )
      throw new Error(
        "capture requires module, seed, place and days400|minutes96",
      );
    const adapter = (await import(pathToFileURL(resolve(modulePath)).href))
      .default as RouteAdapter;
    return captureRoute(
      {
        seed,
        placeKey,
        steps:
          mode === "days400"
            ? schedule("days", 1, 400)
            : schedule("minutes", 15, 96),
      },
      adapter,
    );
  }
  if (command === "run") {
    const [oldPath, newPath, seed, placeKey, mode] = args;
    if (
      !oldPath ||
      !newPath ||
      !seed ||
      !placeKey ||
      resolve(oldPath) === resolve(newPath)
    )
      throw new Error(
        "run requires distinct adapter modules, seed, place key, days400|minutes96",
      );
    if (mode !== "days400" && mode !== "minutes96")
      throw new Error("Explicit days400 or minutes96 mode required");
    const baseline = (await import(pathToFileURL(resolve(oldPath)).href))
      .default as RouteAdapter;
    const candidate = (await import(pathToFileURL(resolve(newPath)).href))
      .default as RouteAdapter;
    const result = await runParity(
      {
        seed,
        placeKey,
        steps:
          mode === "days400"
            ? schedule("days", 1, 400)
            : schedule("minutes", 15, 96),
      },
      baseline,
      candidate,
    );
    process.exitCode = result.comparison.equal ? 0 : 1;
    const { history, input, ...comparison } = result.comparison;
    const table = (world: typeof result.baseline.world) =>
      nationalHistoryTable(world).map(({ eventTypes, ...row }) => ({
        ...row,
        eventTypeCount: eventTypes.length,
      }));
    return {
      baselineWatched: result.baseline.watched,
      candidateWatched: result.candidate.watched,
      comparison: {
        ...comparison,
        input: {
          seed: input.seed,
          placeKey: input.placeKey,
          stepCount: input.steps.length,
          unit: input.steps[0]?.unit,
          total: input.steps.reduce((sum, step) => sum + step.amount, 0),
        },
        historyGroupCount: history.length,
        unequalHistory: history.filter((row) => !row.equal),
      },
      national: {
        baseline: table(result.baseline.world),
        candidate: table(result.candidate.world),
      },
    };
  }
  throw new Error(
    "Commands: plan SEED [COUNT]; compare OLD_CAPTURE NEW_CAPTURE; run OLD_MODULE NEW_MODULE SEED PLACE days400|minutes96",
  );
}
main()
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
