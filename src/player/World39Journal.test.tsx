import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { World39Journal } from "./World39Journal";

it("renders life chapters without the removed journal sections", () => {
  const seed = "session7-journal-sections";
  const place = drawRandomPlace(seed);
  const { world, personId } = smallWorld({ seed, place: place.key });
  const html = renderToStaticMarkup(
    <World39Journal world={world} personId={personId} />,
  );
  expect(html).toContain("My life so far");
  expect(html).toContain("I was born");
  expect(html).not.toContain("Private notes and intentions");
  expect(html).not.toContain("world39-record");
  expect(html).not.toContain("world39-notes");
});

describe("the journal screen carries no authored sentence", () => {
  it("has no sentence literal in its file", () => {
    const text = readFileSync(join(__dirname, "World39Journal.tsx"), "utf8")
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n");
    expect(text.match(/"[A-Z][^"]{25,}[.?!]"/g) ?? []).toEqual([]);
    expect(text.match(/^\s*[A-Z][a-z]+ [a-z ,'&;]{15,}[.?!]$/gm) ?? []).toEqual(
      [],
    );
  });
});
