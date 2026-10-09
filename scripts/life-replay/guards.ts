import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ONE, ZERO } from "./parameters";
import { replayTripwires, stopgapCount } from "./tripwires";

export function checkReplay(root: string, release: boolean): string[] {
  return replayTripwires(root, release);
}

if (
  process.argv[ONE] &&
  import.meta.url === pathToFileURL(resolve(process.argv[ONE])).href
) {
  const problems = checkReplay(
    process.cwd(),
    process.argv.includes("--release"),
  );
  process.stdout.write(`P9 open stopgaps: ${stopgapCount()}\n`);
  for (const problem of problems) process.stderr.write(`${problem}\n`);
  process.exitCode = problems.length === ZERO ? ZERO : ONE;
}
