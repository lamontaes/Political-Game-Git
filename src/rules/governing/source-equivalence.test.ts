import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";
const directory = "src/rules/governing";
const adapted = new Set([
  "checkExecutiveTermLimit",
  "budgetDeadlineConsideration",
  "procedureApplicability",
  "personnelAuthority",
  "buildEstimatedPack",
  "exactAge",
  "transitionServiceStatus",
  "validateSurfaceSlotsRule",
  "validateRasterRule",
  "validatePresentationRule",
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

it("accepts selected facts rather than an old World parameter", () => {
  for (const file of readdirSync(directory).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
  )) {
    const sf = ts.createSourceFile(
      file,
      readFileSync(join(directory, file), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node: ts.Node) {
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isFunctionExpression(node)
      )
        for (const parameter of node.parameters)
          if (parameter.type && ts.isTypeReferenceNode(parameter.type))
            expect(parameter.type.typeName.getText(sf), file).not.toBe("World");
      ts.forEachChild(node, visit);
    }
    visit(sf);
  }
});
