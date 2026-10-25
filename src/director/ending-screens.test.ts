import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import arcsJson from "./data/purpose-arcs.json" with { type: "json" };
import rulesJson from "./data/scene-talk-rules.json" with { type: "json" };

// Some scenes hand the player to a game screen when they end. An
// ending names the screen by the key the game screen itself uses.
it("every ending that opens a screen names one the game has", () => {
  const screens = rulesJson.screens as Record<string, string>;
  const play = readFileSync(
    new URL("../bench/play.mjs", import.meta.url),
    "utf8",
  );
  for (const key of Object.keys(screens).filter((k) => k !== "about"))
    expect(
      play.includes(`"${key}"`) || play.includes(`${key}:`),
      `the game has no screen "${key}"`,
    ).toBe(true);
  const purposes = arcsJson.purposes as Record<
    string,
    { endings?: { id: string; opens?: string }[] }
  >;
  const opened = Object.entries(purposes).flatMap(([purpose, arc]) =>
    (arc.endings ?? [])
      .filter((ending) => ending.opens)
      .map((ending) => ({ purpose, ...ending })),
  );
  expect(opened.length).toBeGreaterThan(0);
  for (const ending of opened)
    expect(Object.keys(screens), `${ending.purpose}/${ending.id}`).toContain(
      ending.opens,
    );
  // The bill on the desk always ends at the desk when it is decided.
  expect(
    purposes["desk-bill"]!.endings!.find((row) => row.id === "signed")?.opens,
  ).toBe("desk");
});
