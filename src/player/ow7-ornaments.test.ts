import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = (file: string) =>
  readFileSync(join(__dirname, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

function ruleBody(source: string, selectorStart: string): string {
  const at = source.indexOf(selectorStart);
  expect(at, selectorStart).toBeGreaterThanOrEqual(0);
  const open = source.indexOf("{", at);
  return source.slice(open + 1, source.indexOf("}", open));
}

describe("OW-7 corner ornaments and the primary corner mark", () => {
  it("rests a primary action without the brass corner mark", () => {
    const body = ruleBody(
      css("controls/controls.css"),
      ".pg-game.pg-game .ui-action--primary,\n.pg-game.pg-game .front-door .game-creator .game-creator-next {",
    );
    expect(body).not.toContain("primary-corner");
  });

  it("pads the orientation panel by at least the corner pieces' size", () => {
    const source = css("world-orientation.css");
    const corner = Number(
      /\.pg-orientation-corners > span \{[^}]*width: (\d+)px/.exec(source)![1],
    );
    const padding = Number(
      /padding: (\d+)px/.exec(ruleBody(source, ".pg-orientation-panel {"))![1],
    );
    expect(padding).toBeGreaterThanOrEqual(corner);
  });
});
