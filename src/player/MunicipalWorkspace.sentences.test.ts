import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { MunicipalWorkspace } from "./MunicipalWorkspace";

describe("the municipal screen carries no authored sentence", () => {
  it("has no sentence literal in its file", () => {
    const text = readFileSync(join(__dirname, "MunicipalWorkspace.tsx"), "utf8")
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n");
    expect(text.match(/"[A-Z][^"]{25,}[.?!]"/g) ?? []).toEqual([]);
    expect(text.match(/`[A-Z][^`]{25,}[.?!]`/g) ?? []).toEqual([]);
    expect(
      text.match(/>\s*[A-Z][a-z]+ [a-z ,'&;]{20,}[.?!]\s*</g) ?? [],
    ).toEqual([]);
    expect(text).not.toContain(["Unknown"].join(""));
  });

  it.each(lifePlaceStateIdentities())(
    "omits unrecorded values for $jurisdictionKey",
    (place) => {
      const { world } = smallWorld({
        place: place.jurisdictionKey,
        seed: `municipal-missing-values:${place.jurisdictionKey}`,
      });
      const html = renderToStaticMarkup(
        createElement(MunicipalWorkspace, {
          world,
          diagnostics: true,
          onWorldChange: () => {},
        }),
      );
      expect(html).not.toContain(">Unknown<");
      expect(html).not.toContain(">—<");
    },
  );
});
