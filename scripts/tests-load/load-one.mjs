/* global process */
// Child of scripts/tests-load/check.ts: imports the modules named on the command
// line, in order, in this fresh process. Exit 1 with the first line of the error
// when one throws, so the cause can be read without a rerun.
import { pathToFileURL } from "node:url";

for (const file of process.argv.slice(2)) {
  try {
    await import(pathToFileURL(file).href);
  } catch (e) {
    const first = String(e instanceof Error ? e.message : e).split("\n")[0];
    process.stderr.write(`${file}: ${first}\n`);
    process.exit(1);
  }
}
process.exit(0);
