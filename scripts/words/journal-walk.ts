/**
 * The Journal and a card's life story as played (words composer, unit 6).
 * Development tooling; shipped play never imports it.
 *
 *   node --import tsx scripts/words/journal-walk.ts <seed> [--days D] [--age A] [--file]
 *
 * Starts a new life on the bench through its own routes, as a player of age
 * A (36 by default) chosen in the creator, files for the first open local
 * race when --file is given, plays D days (30 by default) pressing Day, and
 * prints the place, the seed, the whole Journal, the player's own card story
 * and the card story of the oldest other person in the household.
 */
import { benchRequest, benchWorld } from "../../src/bench/handler";
import { DevMode } from "../../src/bench/dev-mode";
import { coreAPI } from "../../src/core2/state";
import { playerContests } from "../../src/core2/modules/elections";
import { gameStartDate } from "../../src/core2/game-start";
import { realLocalities } from "../../src/core2/places";
import { drawPlace } from "../core2-year/place";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function ask(method: string, route: string): Promise<Json | null> {
  const reply = await benchRequest(method, new URL(route, "http://bench"), {
    developer: true,
  });
  const body = JSON.parse(String(reply.body)) as Json | null;
  if (reply.status !== 200)
    throw new Error(
      `${method} ${route}: ${reply.status} ${JSON.stringify(body)}`,
    );
  return body;
}

const args = process.argv.slice(2);
const seed = args[0] ?? "";
const flag = (name: string, fallback: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1]! : fallback;
};
const days = Number(flag("--days", "30"));
const age = Number(flag("--age", "36"));
const drawn = drawPlace(seed, "journal-walk");
const place =
  realLocalities().find((row) => row.key === drawn.key)?.displayName ??
  drawn.name;
const [year, month, day] = gameStartDate().split("-").map(Number);
const person = {
  givenName: "Jordan",
  familyName: "Avery",
  gender: "female",
  birthYear: year! - age,
  birthMonth: month === 1 ? 6 : 1,
  birthDay: 15,
};
const life = (await ask(
  "POST",
  `/api/newlife?${new URLSearchParams({ seed, placeKey: drawn.key, person: JSON.stringify(person) })}`,
))!;
const me = String(life.personId);
console.log(`place ${place} (key ${drawn.key}) seed ${seed} player ${me}`);
let filed = "";
if (args.includes("--file")) {
  // Dev mode's run-until (as a second session checks a filing): the world
  // runs to the day a seat the player qualifies for opens its filing window,
  // the player files through the bench's own route, and the world runs to
  // the election's result.
  const world = benchWorld();
  const dev = new DevMode(
    world.core!,
    world.director!,
    world.player!,
    world.placeId!,
  );
  dev.runUntil({ event: "may-file", cap: 1500 });
  for (const contest of playerContests(coreAPI(world.core!))) {
    const contestId = String(
      (contest as Json).contestId ?? (contest as Json).id ?? contest,
    );
    try {
      await ask("POST", `/api/file?contestId=${encodeURIComponent(contestId)}`);
      filed = contestId;
      break;
    } catch (error) {
      console.log(
        `could not file for ${contestId}: ${String(error).slice(0, 160)}`,
      );
    }
  }
  console.log(`filed: ${filed || "none"} on ${world.core!.date}`);
  if (filed) {
    dev.runUntil({ event: "election", cap: 400 });
    console.log(`after the election: ${world.core!.date}`);
  }
}
for (let d = 0; d < days; d += 1) {
  let body = (await ask("POST", "/api/advance?mode=day"))!;
  for (let stops = 0; stops < 60; stops += 1) {
    if (body.pollingPlace || body.candidateMorning) {
      await ask("POST", "/api/polling-place/leave").catch(() => null);
      body = (await ask("POST", "/api/advance?mode=day"))!;
      continue;
    }
    if (body.packet?.kind !== "stop") break;
    body = (await ask("POST", "/api/resume").catch(() => null)) ?? {};
  }
}
const chapters = ((await ask(
  "GET",
  `/api/journal?id=${encodeURIComponent(me)}`,
)) ?? []) as Json[];
console.log("\n=== Journal ===");
for (const chapter of chapters) {
  console.log(`\n## ${chapter.title}`);
  for (const line of chapter.lines) console.log(`- ${line.text}`);
}
const story = (c: Json) =>
  (c.history ?? []).map((row: Json) => row.text ?? row).join(" ");
const mine = (await ask(
  "GET",
  `/api/known?id=${encodeURIComponent(me)}&other=${encodeURIComponent(me)}`,
))!;
console.log(`\n=== Player's own story (You screen) ===\n${story(mine)}`);
const own = (await ask("GET", `/api/card?id=${encodeURIComponent(me)}`))!;
const members: Json[] = (own.home?.members ?? []) as Json[];
const otherId = String(
  members
    .map((row) => row.personId ?? row.id ?? row)
    .find((id) => id && id !== me) ?? "",
);
if (otherId) {
  const theirs = (await ask(
    "GET",
    `/api/known?id=${encodeURIComponent(me)}&other=${encodeURIComponent(otherId)}`,
  ))!;
  console.log(
    `\n=== Card story of ${theirs.name ?? otherId} ===\n${story(theirs)}`,
  );
}
process.exit(0);
