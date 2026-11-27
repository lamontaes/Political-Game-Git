// Writes the lines a player reads, at three drawn places, so a change to a piece of a
// sentence (a name, a pronoun, a date, a list) is shown before and after on the same worlds.
// Usage: node --import tsx scripts/story/lines-capture.mts <run-seed> <out-dir> [places=3] [people=60]
// The places are drawn from all 56 by the run seed; the first line of each file names the
// place and its world seed. Run it on the base, then on the change, and diff the folders.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld, NoPlayerHereError } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { composeJournal } from "../../src/director/journal";
import { personCard } from "../../src/bench/card";

const [run, out, placesArg, peopleArg] = process.argv.slice(2) as [
  string,
  string,
  string?,
  string?,
];
if (!run || !out)
  throw new Error(
    "Usage: lines-capture.mts <run-seed> <out-dir> [places] [people]",
  );
const places = Number(placesArg ?? 3);
const peopleCount = Number(peopleArg ?? 60);
mkdirSync(out, { recursive: true });
for (let draw = 0, done = 0; done < places; draw += 1) {
  const place = drawPlace(`${run}:${draw}`, "story-lines");
  let world;
  try {
    world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
  } catch (error) {
    // A place with no adult in a household cannot open a new game; a draw passes it over.
    if (error instanceof NoPlayerHereError) {
      console.log(`passed over ${place.name} (${place.key}): ${error.message}`);
      continue;
    }
    throw error;
  }
  const { core, director } = world;
  // The world's own residents (the filled-in people; everyone else is the counted population).
  const people = world.residents
    .map((r) => core.people.get(r.id as never))
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.alive))
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, peopleCount);
  for (const person of people) director.watch(core, person.id);
  const rows = [
    `# ${place.name} (${place.key}), run seed ${run} draw ${draw}, world seed ${place.seed}`,
  ];
  for (const person of people)
    for (const chapter of composeJournal(core, director, person.id, {}))
      for (const line of chapter.lines)
        rows.push(
          `${person.id}\t${line.date}\t${line.text.replace(/\s+/g, " ")}`,
        );
  // The person card: every string it shows for each resident (names, relations, lists).
  const leaves = (value: unknown, at: string, into: string[]) => {
    if (typeof value === "string")
      into.push(`${at}\t${value.replace(/\s+/g, " ")}`);
    else if (Array.isArray(value))
      value.forEach((item, i) => leaves(item, `${at}[${i}]`, into));
    else if (value && typeof value === "object")
      for (const [key, item] of Object.entries(value))
        if (key !== "face") leaves(item, `${at}.${key}`, into);
  };
  for (const person of people) {
    const into: string[] = [];
    try {
      leaves(personCard(core, person.id), "card", into);
    } catch {
      continue;
    }
    for (const row of into) rows.push(`${person.id}\t${row}`);
  }
  writeFileSync(path.join(out, `place-${done}.txt`), `${rows.join("\n")}\n`);
  console.log(`${rows[0]}: ${rows.length - 1} lines`);
  done += 1;
}
