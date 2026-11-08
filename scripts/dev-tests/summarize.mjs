// Grades law-run JSONL lines: node scripts/dev-tests/summarize.mjs file...
import { readFileSync } from "node:fs";
for (const f of process.argv.slice(2)) {
  const rows = readFileSync(f, "utf8").split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
  console.log(`\n## ${f}: ${rows.length} policies`);
  for (const r of rows) {
    const passed = (r.pass ?? []).slice(-1)[0];
    let grade = r.error ? "ERROR " + r.error : !r.allowed ? "barred" : passed === "enacted" || passed === "overridden" ? (r.inForceAfterLag ? "in force" : "enacted, law unchanged") : "bill " + passed;
    const rep = r.repeal ? ` | repeal ${r.repeal.slice(-1)[0]}` : "";
    console.log(`${r.policy.replace("us-policy-positions:", "").padEnd(70)} ${grade}${rep} | cash ${r.cashDeltaMinor ?? "-"} org ${r.orgCashDeltaMinor ?? "-"}`);
  }
}
