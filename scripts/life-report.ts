import { lifeReportMarkdown } from "../src/presentation/life-diagnostics";

/**
 * The development life report, on the command line.
 *
 *   npm run report:life -- <seed> <answer-index> <beats> [start-age] [place-key]
 *
 * The place defaults to Kentucky, which is the scenario this report was
 * written against rather than a normal starting place, and can be any key the
 * place registry knows.
 *
 * A shim, deliberately. Everything it does lives in `life-diagnostics.ts`,
 * where the app project typechecks it; this file only reads argv, the way the
 * repository's other tooling scripts do.
 */
const [seed, answerIndex, beats, startAge, placeKey] = process.argv.slice(2);

process.stdout.write(
  lifeReportMarkdown({
    seed: seed ?? "life-report",
    answerIndex: Number(answerIndex ?? "0"),
    beats: Number(beats ?? "6"),
    startAge: startAge === undefined ? undefined : Number(startAge),
    placeKey,
  }) + "\n",
);
