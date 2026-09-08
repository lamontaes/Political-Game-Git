import { lifeReportMarkdown } from "../src/presentation/life-diagnostics";

/**
 * The development life report, on the command line.
 *
 *   npm run report:life -- <seed> <answer-index> <beats> [start-age]
 *
 * A shim, deliberately. Everything it does lives in `life-diagnostics.ts`,
 * where the app project typechecks it; this file only reads argv, the way the
 * repository's other tooling scripts do.
 */
const [seed, answerIndex, beats, startAge] = process.argv.slice(2);

process.stdout.write(
  lifeReportMarkdown({
    seed: seed ?? "life-report",
    answerIndex: Number(answerIndex ?? "0"),
    beats: Number(beats ?? "6"),
    startAge: startAge === undefined ? undefined : Number(startAge),
  }) + "\n",
);
