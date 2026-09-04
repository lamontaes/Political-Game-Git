import path from "path";

import { deriveSceneTiers } from "./scene-master-derive";

/**
 * Usage:
 *   cli-scene-master-derive.ts <master> <width>:<output.png> [<width>:<output.png> ...]
 *
 * Every output is a reduction of the master. A width at or above the master's
 * own width is refused and reported rather than enlarged.
 */
const [master, ...tierArguments] = process.argv.slice(2);
if (!master || tierArguments.length === 0) {
  throw new Error(
    "Usage: cli-scene-master-derive.ts <master> <width>:<output.png> [...]",
  );
}

const requests = tierArguments.map((argument) => {
  const separator = argument.indexOf(":");
  const width = Number.parseInt(argument.slice(0, separator), 10);
  const output = argument.slice(separator + 1);
  if (!Number.isInteger(width) || width <= 0 || output.length === 0) {
    throw new Error(`Tier request '${argument}' is not '<width>:<path>'.`);
  }
  return { width, path: path.resolve(output) };
});

const result = await deriveSceneTiers(path.resolve(master), requests);
console.log(
  JSON.stringify(
    {
      ...result,
      tiers: result.tiers.map((tier) => ({
        ...tier,
        path: path.relative(process.cwd(), tier.path),
      })),
    },
    null,
    2,
  ),
);
