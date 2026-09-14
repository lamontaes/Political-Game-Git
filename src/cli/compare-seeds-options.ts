import {
  DEFAULT_NEW_GAME_SETUP,
  type NewGameDepth,
  type NewGameHousehold,
  type NewGameSetup,
  type NewGameStartingLife,
} from "../presentation/new-game";

export const DEFAULT_COMPARE_SEEDS = [
  "compare-seed-one",
  "compare-seed-two",
  "compare-seed-three",
] as const;

/** Frame fields only. Place stays empty until `--place`. */
const FRAME: Omit<NewGameSetup, "seed"> = {
  ...DEFAULT_NEW_GAME_SETUP,
  placeKey: "",
};

export interface CompareSeedOptions {
  readonly seeds: readonly string[];
  readonly setup: Omit<NewGameSetup, "seed">;
  readonly format: "markdown" | "json";
}

export function parseCompareSeedOptions(
  argv: readonly string[],
): CompareSeedOptions {
  let seeds: readonly string[] = DEFAULT_COMPARE_SEEDS;
  let setup: Omit<NewGameSetup, "seed"> | null = null;
  let format: "markdown" | "json" = "markdown";
  let placeExplicit = false;

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
        placeExplicit = true;
        setup = { ...(setup ?? FRAME), placeKey: value };
        index += 1;
        break;
      case "--age": {
        const parsed = Number(value);
        if (!Number.isSafeInteger(parsed)) {
          throw new Error("--age must be an integer.");
        }
        setup = { ...(setup ?? FRAME), startAge: parsed };
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
        setup = {
          ...(setup ?? FRAME),
          depth: value satisfies NewGameDepth,
        };
        index += 1;
        break;
      case "--starting-life":
        if (
          value !== "ordinary-life" &&
          value !== "legislative-office" &&
          value !== "state-agency-director"
        ) {
          throw new Error(
            "--starting-life must be ordinary-life, legislative-office or state-agency-director.",
          );
        }
        setup = {
          ...(setup ?? FRAME),
          startingLife: value satisfies NewGameStartingLife,
        };
        index += 1;
        break;
      case "--household":
        if (value !== "lives-alone" && value !== "shares-a-home") {
          throw new Error("--household must be lives-alone or shares-a-home.");
        }
        setup = {
          ...(setup ?? FRAME),
          household: value satisfies NewGameHousehold,
        };
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

  if (!placeExplicit || !setup?.placeKey.trim()) {
    throw new Error("--place <key> is required. Lexington is not assumed.");
  }
  return { seeds, setup, format };
}
