import {
  compareSeeds,
  seedComparisonJson,
  seedComparisonMarkdown,
} from "../devtools";
import {
  DEFAULT_NEW_GAME_SETUP,
  type NewGameDepth,
  type NewGameHousehold,
  type NewGameSetup,
  type NewGameStartingLife,
} from "../presentation/new-game";

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
 *   --place <key>            life place key
 *   --age <n>                starting age
 *   --depth play-formative-years|summarize-earlier-life
 *   --starting-life ordinary-life|legislative-office
 *   --household lives-alone|shares-a-home
 *   --format markdown|json
 */

const DEFAULT_SEEDS = [
  "compare-seed-one",
  "compare-seed-two",
  "compare-seed-three",
] as const;

interface Options {
  readonly seeds: readonly string[];
  readonly setup: Omit<NewGameSetup, "seed">;
  readonly format: "markdown" | "json";
}

function parseOptions(argv: readonly string[]): Options {
  let seeds: readonly string[] = DEFAULT_SEEDS;
  let setup: Omit<NewGameSetup, "seed"> = DEFAULT_NEW_GAME_SETUP;
  let format: "markdown" | "json" = "markdown";

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    switch (flag) {
      case "--seeds":
        if (!value) throw new Error("--seeds needs a comma-separated list.");
        seeds = value
          .split(",")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0);
        index += 1;
        break;
      case "--place":
        if (!value) throw new Error("--place needs a life place key.");
        setup = { ...setup, placeKey: value };
        index += 1;
        break;
      case "--age": {
        const parsed = Number(value);
        if (!Number.isSafeInteger(parsed)) {
          throw new Error("--age must be an integer.");
        }
        setup = { ...setup, startAge: parsed };
        index += 1;
        break;
      }
      case "--depth":
        if (
          value !== "play-formative-years" &&
          value !== "summarize-earlier-life"
        ) {
          throw new Error(
            "--depth must be play-formative-years or summarize-earlier-life.",
          );
        }
        setup = { ...setup, depth: value satisfies NewGameDepth };
        index += 1;
        break;
      case "--starting-life":
        if (value !== "ordinary-life" && value !== "legislative-office") {
          throw new Error(
            "--starting-life must be ordinary-life or legislative-office.",
          );
        }
        setup = { ...setup, startingLife: value satisfies NewGameStartingLife };
        index += 1;
        break;
      case "--household":
        if (value !== "lives-alone" && value !== "shares-a-home") {
          throw new Error("--household must be lives-alone or shares-a-home.");
        }
        setup = { ...setup, household: value satisfies NewGameHousehold };
        index += 1;
        break;
      case "--format":
        if (value !== "markdown" && value !== "json") {
          throw new Error("--format must be markdown or json.");
        }
        format = value;
        index += 1;
        break;
      default:
        throw new Error(`Unrecognized option: ${String(flag)}`);
    }
  }

  return { seeds, setup, format };
}

const options = parseOptions(process.argv.slice(2));
const comparison = compareSeeds({
  seeds: options.seeds,
  setup: options.setup,
});

process.stdout.write(
  options.format === "json"
    ? seedComparisonJson(comparison)
    : seedComparisonMarkdown(comparison),
);
