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
// A place given by its key (a playtest's town) or drawn from the seed.
const drawn = args.includes("--place-key")
  ? { key: flag("--place-key", ""), name: "" }
  : drawPlace(seed, "journal-walk");
const place =
  realLocalities().find((row) => row.key === drawn.key)?.displayName ??
  drawn.name;
const [year, month] = gameStartDate().split("-").map(Number);
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
  // and the player files for a town or county seat through the bench's own
  // route; the days after are played as a player plays them.
  const world = benchWorld();
  const dev = new DevMode(
    world.core!,
    world.director!,
    world.player!,
    world.placeId!,
  );
  dev.runUntil({ event: "may-file", cap: 1500 });
  // A town or county seat (the golden path files where the town files).
  // else a seat in the state legislature (early access: local and state).
  const open = playerContests(coreAPI(world.core!));
  const local = open.filter((contest) =>
    ["city", "township", "county"].includes(String(contest.level)),
  );
  const contests = local.length
    ? local
    : open.filter((contest) => /:(?:lower|upper):/.test(contest.id));
  if (!contests.length)
    console.log(
      `no local seat open; open: ${playerContests(coreAPI(world.core!))
        .map((contest) => contest.id)
        .join(", ")}`,
    );
  for (const contest of contests) {
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
}
// A stop the player is shown (a scene, a notice) is passed as a player
// presses Continue on it.
const resumeStops = async () => {
  for (let stops = 0; stops < 60; stops += 1) {
    const packet = benchWorld().player?.packet as Json | undefined;
    if (packet?.kind !== "stop") return;
    await ask(
      "POST",
      `/api/resume?${new URLSearchParams({ kind: "stop", pauseId: String(packet.pauseId ?? "") })}`,
    );
  }
};
// Each Day press, the toast the play screen would show, by its own rule
// (src/bench/play.mjs renderJournalNote): the newest entry, once per entry
// id, only on the day it was written or the first time.
const toastSeen = new Set<string>();
let firstToast = true;
const toastAfterPress = async (press: number) => {
  const shown = ((await ask(
    "GET",
    `/api/journal?id=${encodeURIComponent(me)}`,
  )) ?? []) as Json[];
  const newest = shown.at(-1)?.lines?.at(-1) as Json | undefined;
  const today = String(benchWorld().player?.packet?.at?.date ?? "");
  if (
    newest &&
    !toastSeen.has(String(newest.id)) &&
    (firstToast || !today || String(newest.date) >= today.slice(0, 10))
  ) {
    toastSeen.add(String(newest.id));
    console.log(
      `toast after press ${press} (${today.slice(0, 10)}): ${newest.text}`,
    );
  } else
    console.log(`toast after press ${press} (${today.slice(0, 10)}): none`);
  firstToast = false;
};
// Play to the day after the filed race's count when --count is given.
const counted = () =>
  !!filed &&
  [...(benchWorld().core?.durableLog.values() ?? [])].some(
    (row) =>
      row.kind === "election-result" &&
      String(row.facts?.contestId ?? "") === filed,
  );
let afterCount = -1;
for (let d = 0; d < (args.includes("--count") ? 400 : days); d += 1) {
  await resumeStops();
  const body = (await ask("POST", "/api/advance?mode=day"))!;
  if (body.pollingPlace || body.candidateMorning)
    await ask("POST", "/api/polling-place/leave").catch(() => null);
  await resumeStops();
  await toastAfterPress(d + 1);
  if (args.includes("--count")) {
    if (afterCount < 0 && counted()) afterCount = d;
    if (afterCount >= 0 && d > afterCount) break;
  }
}
if (args.includes("--kinds")) {
  const w = benchWorld();
  for (const m of w.director!.ledger.people.get(me)?.moments ?? [])
    if (/filed|petition|election/.test(m.causeKind))
      console.log(
        `moment ${m.date} ${m.causeKind} ${m.causeId} logged=${!!w.core!.durableLog.get(m.causeId as never)}`,
      );
  const { lifeOf } = await import("../../src/core2/modules/people");
  for (const e of lifeOf(w.core!, me as never))
    if (e.life === "politics") console.log(`life ${e.date} ${e.what} ${e.id}`);
}
const chapters = ((await ask(
  "GET",
  `/api/journal?id=${encodeURIComponent(me)}`,
)) ?? []) as Json[];
console.log("\n=== Journal ===");
for (const chapter of chapters) {
  console.log(`\n## ${chapter.title}`);
  for (const line of chapter.lines)
    console.log(
      args.includes("--kinds")
        ? `- ${line.date} ${JSON.stringify(line.kinds)} ${line.text}`
        : `- ${line.text}`,
    );
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
