import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";
const directory = "src/rules/campaigns";
const adapted = new Set([
  "assessCampaignContribution",
  "assessContribution",
  "civicStake",
  "doorKnockingReturn",
  "daysUntilElection",
]);
const printer = ts.createPrinter({ removeComments: true });
it("preserves every lifted function body against the independent legacy source", () => {
  let compared = 0;
  for (const file of readdirSync(directory).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
  )) {
    const text = readFileSync(join(directory, file), "utf8");
    const source = /Lifted unchanged from ([^;]+);/.exec(text)?.[1];
    if (!source) continue;
    const old = ts.createSourceFile(
      source,
      readFileSync(source, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const fresh = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    for (const node of fresh.statements) {
      if (
        !ts.isFunctionDeclaration(node) ||
        !node.name ||
        !node.body ||
        adapted.has(node.name.text)
      )
        continue;
      const original = old.statements.find(
        (n) => ts.isFunctionDeclaration(n) && n.name?.text === node.name!.text,
      ) as ts.FunctionDeclaration | undefined;
      expect(original?.body, `${source}:${node.name.text}`).toBeDefined();
      expect(
        printer.printNode(ts.EmitHint.Unspecified, node.body, fresh),
        `${file}:${node.name.text}`,
      ).toBe(printer.printNode(ts.EmitHint.Unspecified, original!.body!, old));
      compared++;
    }
  }
  expect(compared).toBeGreaterThan(10);
});
it("has no runtime import of legacy engine logic", () => {
  for (const file of readdirSync(directory).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
  )) {
    const sf = ts.createSourceFile(
      file,
      readFileSync(join(directory, file), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const node of sf.statements) {
      if (!ts.isImportDeclaration(node) || node.importClause?.isTypeOnly)
        continue;
      const module = (node.moduleSpecifier as ts.StringLiteral).text;
      if (module.includes("/simulation/"))
        expect(module, `${file} runtime dependency`).toContain(".generated");
    }
  }
});

it("preserves newly copied constants and calibration initializers", () => {
  let compared = 0;
  for (const file of readdirSync(directory).filter(
    (f) => f.startsWith("pure-") && f.endsWith(".ts"),
  )) {
    const text = readFileSync(join(directory, file), "utf8");
    const source = /Lifted unchanged from ([^;]+);/.exec(text)![1]!;
    const old = ts.createSourceFile(
      source,
      readFileSync(source, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const fresh = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    for (const node of fresh.statements) {
      if (!ts.isVariableStatement(node)) continue;
      for (const declaration of node.declarationList.declarations) {
        const original = old.statements
          .filter(ts.isVariableStatement)
          .flatMap((s) => [...s.declarationList.declarations])
          .find((d) => d.name.getText(old) === declaration.name.getText(fresh));
        expect(original, file).toBeDefined();
        expect(
          printer.printNode(ts.EmitHint.Unspecified, declaration, fresh),
        ).toBe(printer.printNode(ts.EmitHint.Unspecified, original!, old));
        compared++;
      }
    }
  }
  expect(compared).toBeGreaterThan(0);
});
