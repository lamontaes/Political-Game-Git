import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { benchRequest } from "./handler";

// M7-04: no developer or proof pages in the shipped build. The client bundle
// is built from the play page alone, the installed game's play server runs
// with the developer routes off, and a developer route asked of it is refused.
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

it("builds the client from the play page alone", () => {
  const vite = read("vite.config.ts");
  const input = /rolldownOptions:\s*\{\s*input:\s*\{([^}]*)\}/.exec(vite);
  expect(input, "the client build's inputs").toBeTruthy();
  const pages = [...input![1]!.matchAll(/"([^"]+\.html)"/g)].map((m) => m[1]);
  expect(pages).toEqual(["src/bench/play.html"]);
});

it("runs the installed game's play server with the developer routes off", () => {
  expect(read("desktop/play-api-host.mjs")).toMatch(/developer:\s*false/);
  expect(read("desktop/play-api-host.mjs")).not.toMatch(/developer:\s*true/);
});

it("refuses a developer route when the developer routes are off", async () => {
  const refused = await benchRequest("POST", new URL("http://game/api/build"), {
    developer: false,
  });
  expect(refused.status).toBe(404);
});
