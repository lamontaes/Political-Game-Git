import {
  compareSeeds,
  seedComparisonJson,
  seedComparisonMarkdown,
} from "../devtools";
import { parseCompareSeedOptions } from "./compare-seeds-options";

/**
 * Generates several lives from different seeds and reports where they actually
 * differ.
 *
 * The report separates structural differences from name differences on
 * purpose, because "the generator varies" is the kind of claim that is easy to
 * make from a screenshot of two different surnames and hard to make honestly.
 * Where a setup produces no structural variation at all, the command says so
 * rather than padding the list.
 *
 * Usage:
 *   node --import tsx src/cli/compare-seeds.ts [options]
 *
 *   --seeds a,b,c            seeds to compare (default three fixed seeds)
 *   --place <key>            life place key (required)
 *   --age <n>                starting age
 *   --depth play-formative-years|summarize-earlier-life
 *   --starting-life ordinary-life|legislative-office|state-agency-director
 *   --household lives-alone|shares-a-home
 *   --format markdown|json
 */

const options = parseCompareSeedOptions(process.argv.slice(2));
const comparison = compareSeeds({
  seeds: options.seeds,
  setup: options.setup,
});

process.stdout.write(
  options.format === "json"
    ? seedComparisonJson(comparison)
    : seedComparisonMarkdown(comparison),
);
