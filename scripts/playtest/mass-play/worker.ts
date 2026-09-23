/** One worker process: plays the games in a spec file, one JSON line each. */
import { appendFileSync, readFileSync } from "node:fs";
import { playGame, type GameSpec } from "./driver";

const [specFile, outFile] = process.argv.slice(2);
const specs = JSON.parse(readFileSync(specFile!, "utf8")) as GameSpec[];
for (const spec of specs) {
  let line: string;
  try {
    line = JSON.stringify(playGame(spec));
  } catch (error) {
    line = JSON.stringify({
      spec,
      ended: "driver-crash",
      findings: [
        {
          kind: "crash",
          signature: `driver: ${(error as Error)?.message}`,
          detail: String((error as Error)?.stack ?? error).slice(0, 1500),
          date: "",
          action: null,
        },
      ],
    });
  }
  appendFileSync(outFile!, `${line}\n`);
}
