import ts from "typescript";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const baseline = "800bb5a0c57f6301db18e1bd769565386c3e39dd";
const checks = [];
for (const [kind, path, name] of [
  ["dc", "src/simulation/dc-council-sittings.ts", "dcCouncilActTitle"],
  [
    "town",
    "src/simulation/living-world/local-council-meetings.ts",
    "ordinanceTitle",
  ],
]) {
  const source = execFileSync("git", ["show", `${baseline}:${path}`], {
    encoding: "utf8",
  });
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const fn = tree.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === name,
  );
  const text = fn.getText(tree).replace(/^export /, "");
  const js = ts.transpile(text, { target: ts.ScriptTarget.ES2022 });
  const render = new Function(`${js}; return ${name};`)();
  const rows = JSON.parse(
    readFileSync(new URL(`./${kind}-titles.json`, import.meta.url), "utf8"),
  );
  for (const row of rows) {
    const oldTitle = `${row.answer === "yes" ? "" : "Repeal: "}${render(row.question, "2026")}`;
    if (oldTitle !== row.title)
      throw Error(`Title parity failed for ${row.question}`);
    checks.push({ ...row, kind, oldTitle, same: true });
  }
}
console.log(
  JSON.stringify(
    {
      baseline,
      method:
        "Actual candidate filed records compared with exact original pure title functions. This does not execute a baseline world or clock.",
      checks,
    },
    null,
    2,
  ),
);
