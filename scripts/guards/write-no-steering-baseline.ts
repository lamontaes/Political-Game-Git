/**
 * Writes tests/guards/no-steering-baseline.json from the tree as it is, keeping
 * every owner already named. Run it only to record what exists the day the
 * guard starts; after that the counts only go down, by hand, as code is fixed.
 *   node --import tsx scripts/guards/write-no-steering-baseline.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  stepCounts,
  unlabeledCounts,
} from "../../tests/guards/no-steering-scan";

const file = "tests/guards/no-steering-baseline.json";
let old: {
  owners?: Record<string, string>;
  audited?: unknown;
} = {};
try {
  old = JSON.parse(readFileSync(file, "utf8"));
} catch {
  /* first run */
}
const steering = Object.fromEntries([...stepCounts()].sort());
const unlabeledRows = Object.fromEntries([...unlabeledCounts()].sort());
/** Which session answers for a file: by the folder it sits in and what it does. */
const ownerOf = (f: string): string =>
  old.owners?.[f] ??
  (/macro|regional|central-bank|budgets|treasury|credit|retirement|coverage|medical|poverty|business-books|finance/.test(
    f,
  )
    ? "Money"
    : /jobs|past-work|labor|wage|residents|employ/.test(f)
      ? "Jobs"
      : /counted-moves|births|deaths|renewal|partner|kin|lives|husk/.test(f)
        ? "Lives"
        : /law|bill|legislat|outcome-web|policy|school|health/.test(f)
          ? "Laws"
          : "Laws");
const owners = Object.fromEntries(
  [...Object.keys(steering), ...Object.keys(unlabeledRows)]
    .sort()
    .map((f) => [f, ownerOf(f)]),
);
writeFileSync(
  file,
  `${JSON.stringify({ steering, unlabeledRows, owners, audited: old.audited ?? [] }, null, 2)}\n`,
);
console.log(
  `${Object.keys(steering).length} files steer; ${Object.keys(unlabeledRows).length} data files hold unlabeled rows`,
);
