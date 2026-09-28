/** Fetch official judiciary calibration originals through the shared client. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { acquirePlan } from "../acquire";
import type { AcquisitionPlan } from "../../../src/source/core/index";
import { toCanonicalJson } from "../../../src/source/core/index";

const domain = "judiciary-calibration";
const plan = JSON.parse(
  readFileSync(`data/source/${domain}/source-plan.json`, "utf8"),
) as AcquisitionPlan;
const lockPath = `data/source/${domain}/artifact-lock.json`;
if (!existsSync(lockPath))
  writeFileSync(lockPath, toCanonicalJson({ domain, artifacts: [] }));
const ids = process.argv.slice(2);
if (
  !ids.length ||
  ids.some((id) => !plan.requests.some((r) => r.artifactId === id))
)
  throw new Error("Pass one or more artifact IDs from source-plan.json");
const errors: string[] = [];
for (const id of ids) {
  try {
    await acquirePlan(domain, plan, lockPath, id);
  } catch (error) {
    errors.push(`${id}: ${String(error)}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
if (errors.length) throw new Error(errors.join("\n"));
