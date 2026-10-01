import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { serializeWorld } from "../simulation/serialization";
import type { EntityId, World } from "../simulation/types";
import { PlayerBillsPanel } from "./PlayerBillsPanel";

const source = ts.createSourceFile(
  "PlayerGame.tsx",
  readFileSync(new URL("./PlayerGame.tsx", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
let mount: ts.JsxSelfClosingElement | undefined;
function findMount(node: ts.Node) {
  if (
    ts.isJsxSelfClosingElement(node) &&
    node.tagName.getText(source) === "PlayerBillsPanel"
  )
    mount = node;
  ts.forEachChild(node, findMount);
}
findMount(source);
let conditional: ts.Node | undefined = mount?.parent;
while (conditional && !ts.isJsxExpression(conditional))
  conditional = conditional.parent;
if (
  !mount ||
  !conditional ||
  !ts.isJsxExpression(conditional) ||
  !conditional.expression
)
  throw new Error(
    "Expected the released conditional Bills mount in PlayerGame",
  );
const expression = conditional.expression.getText(source);
// Execute the production mount JSX without exporting the private shell renderer
// or loading unrelated title, setup, scene and navigation paths.
const code = ts.transpileModule(`const render = () => (${expression});`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText;
const renderMount = new Function(
  "React",
  "PlayerBillsPanel",
  "view",
  "session",
  `${code}\nreturn render();`,
) as (
  react: typeof React,
  panel: typeof PlayerBillsPanel,
  view: { section?: string },
  session: { world: World; personId: EntityId },
) => React.ReactNode;
let session: { world: World; personId: EntityId };

beforeAll(() => {
  const seed = "c9-monthly-money-routes";
  const place = drawRandomPlace(seed);
  console.info(
    `Bills mount: seed=${seed}, place=${place.displayName} (${place.key})`,
  );
  const fixture = smallWorld({ seed, place: place.key, people: 3 });
  session = { world: fixture.world, personId: fixture.personId };
}, 30_000);

describe("the exact finances shell Bills mount", () => {
  it("renders the actual leaf from production JSX without changing the world", () => {
    const saved = serializeWorld(session.world);
    const html = renderToStaticMarkup(
      <>
        {renderMount(React, PlayerBillsPanel, { section: "finances" }, session)}
      </>,
    );
    expect(html).toContain('data-testid="player-bills"');
    expect(html).toContain("No upcoming bills are recorded.");
    expect(serializeWorld(session.world)).toBe(saved);
  });

  it("does not mount Bills on the identity section or the default personal view", () => {
    for (const view of [{ section: "identity" }, {}]) {
      const html = renderToStaticMarkup(
        <>{renderMount(React, PlayerBillsPanel, view, session)}</>,
      );
      expect(html).toBe("");
    }
  });

  it("keeps the panel between PersonalWorkspace and MoneyLawsPanel in the same personal branch", () => {
    let ancestor: ts.Node | undefined = mount;
    while (ancestor && !ts.isCaseClause(ancestor)) ancestor = ancestor.parent;
    if (!ancestor || !ts.isCaseClause(ancestor))
      throw new Error("Missing personal branch");
    expect(ancestor.expression.getText(source)).toBe('"personal"');
    const branch = ancestor.getText(source);
    expect(branch.indexOf("<PersonalWorkspace")).toBeLessThan(
      branch.indexOf("<PlayerBillsPanel"),
    );
    expect(branch.indexOf("<PlayerBillsPanel")).toBeLessThan(
      branch.indexOf("<MoneyLawsPanel"),
    );
    expect(
      mount!.attributes.properties.map((property) => property.getText(source)),
    ).toEqual(["world={session.world}", "personId={session.personId}"]);
  });
});
