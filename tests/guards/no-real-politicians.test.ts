import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";

// Owner ruling, Sept 26, 2026: no real politicians appear in the game. This
// guards two places a name could slip in: the shipped sentences of the word
// banks, and the people the generated world seats in office. The list is
// current and recent national figures by full name; extend it as needed.
const REAL = [
  "Joe Biden",
  "Donald Trump",
  "Barack Obama",
  "George Bush",
  "George W. Bush",
  "Bill Clinton",
  "Hillary Clinton",
  "Jimmy Carter",
  "Ronald Reagan",
  "Richard Nixon",
  "Nancy Pelosi",
  "Mitch McConnell",
  "Chuck Schumer",
  "Hakeem Jeffries",
  "Mike Johnson",
  "John Thune",
  "Kamala Harris",
  "JD Vance",
  "Gavin Newsom",
  "Ron DeSantis",
  "Greg Abbott",
];

const dir = join(process.cwd(), "data", "english", "parts");

it("names no real politician in a shipped sentence of the word banks", () => {
  const found: string[] = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".json"))) {
    const bank = JSON.parse(readFileSync(join(dir, name), "utf8")) as {
      parts?: { key: string; text: string; shippable?: boolean }[];
    };
    for (const part of bank.parts ?? [])
      if (part.shippable !== false)
        for (const real of REAL)
          if (part.text.includes(real)) found.push(`${name}: ${part.key}`);
  }
  expect(found).toEqual([]);
});

it("seats no real politician in a generated town's offices", () => {
  const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
  setBookkeeping(false);
  const place = drawPlace(seed, "no-real-politicians");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const where = `${place.name} (${place.key}), seed ${seed}`;
  const seated = [...world.core.people.values()]
    .filter((p) => p.id.startsWith("official:") || p.id.includes(":official"))
    .map((p) => `${p.givenName} ${p.familyName}`);
  console.log(`no-real-politicians: ${where}: ${seated.length} officials`);
  for (const real of REAL) expect(seated, where).not.toContain(real);
  // Every full person in the town, not only the officials.
  const everyone = [...world.core.people.values()].map(
    (p) => `${p.givenName} ${p.familyName}`,
  );
  for (const real of REAL) expect(everyone, where).not.toContain(real);
}, 600_000);
