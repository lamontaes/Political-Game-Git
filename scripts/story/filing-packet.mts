// The filing counter as played, for the grading packet: draws places, walks a grown resident who lives alone to the counter,
// picks a race, asks, files, lets a day pass and hears the clerk's petition talk with both of a first filing's answers.
// Writes docs/grading/<date>-w2-filing/packet.json: each scene's cast, numbered lines, replies offered and taken, and the
// element ids of the bank lines said.
// Usage: node --import tsx scripts/story/filing-packet.mts <run-seed> [places=3] [out-dir]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { PLATFORM_QUESTIONS } from "../../src/core2/campaign-data";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  ELECTIONS_MODULE_ID,
  checkEligibility,
  filingOfficeFor,
  playerContests,
} from "../../src/core2/modules/elections";
import { filingClerkFor } from "../../src/core2/modules/filing-clerk";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import { chooseAtCounter, openBenchFilingVisit } from "../../src/bench/filing";

const [run, placesArg, outArg] = process.argv.slice(2) as [
  string,
  string?,
  string?,
];
const places = Number(placesArg ?? 3);
const out = outArg ?? "docs/grading/2026-11-27-w2-filing";
const bank = JSON.parse(
  readFileSync("data/english/parts/scene-talk.json", "utf8"),
) as { parts: { key: string; text: string; elements?: string[] }[] };
const elementsOf = (text: string) =>
  bank.parts.find((part) => part.text === text)?.elements ?? [];

type Line = { n: number; speaker: string; text: string; elements: string[] };
const numbered = (rows: { speaker: string; text: string }[]): Line[] =>
  rows.map((row, index) => ({
    n: index + 1,
    speaker: row.speaker,
    text: row.text,
    elements: [],
  }));

const scenes: unknown[] = [];
for (let draw = 0, done = 0; done < places && draw < places * 8; draw += 1) {
  const place = drawPlace(`${run}:${draw}`, "filing-packet");
  let world;
  try {
    world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
  } catch {
    continue;
  }
  const { core, director } = world;
  const api = coreAPI(core);
  const town = core.people.get(core.playerId!)?.placeId;
  const alone = () =>
    [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.placeId === town &&
          row.birthDate < "1990-01-01" &&
          core.households.get(row.householdId)?.memberIds.length === 1 &&
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("filings")
            .query("byPerson", [row.id]).length === 0,
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0];
  const player = alone();
  if (!player) continue;
  const playerId = player.id as PersonId;
  core.playerId = playerId;
  director.watch(core, playerId);
  const races = () =>
    playerContests(api).filter(
      (row) =>
        checkEligibility(api, playerId, row.id).every((check) => check.met) &&
        filingClerkFor(api, row.id) !== null,
    );
  for (let week = 0; week < 104 && races().length < 1; week += 1)
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  const race = races()[0];
  if (!race) continue;
  const filedWith = filingOfficeFor(api, race.id).filedWith;
  try {
    let counter = openBenchFilingVisit(core, playerId, filedWith, 10 * 60);
    const steps: {
      step: string;
      lines: Line[];
      offered: string[];
      taken: string;
    }[] = [];
    const record = (step: string, taken: string) =>
      steps.push({
        step,
        lines: numbered(counter.visit.lines),
        offered: counter.visit.choices.map(
          (row) => `[${row.control}] ${row.text}`,
        ),
        taken,
      });
    // The narrator opens the visit (the bench's `intro`), before the clerk speaks.
    const intro = counter.intro.map((row) => row.text);
    record("the counter opens", "");
    const pick = counter.visit.choices.find((row) => row.control === "pick");
    if (!pick) continue;
    counter = chooseAtCounter(core, counter, pick.key);
    record("the race is picked", pick.key);
    const ask = counter.visit.choices.find((row) => row.control === "ask");
    if (ask) {
      counter = chooseAtCounter(core, counter, ask.key);
      record("a question asked", ask.key);
    }
    counter = chooseAtCounter(core, counter, "file", {
      platform: [`${PLATFORM_QUESTIONS[0]}=1`],
    });
    const filing = (counter.result as { filing: { id: string } }).filing;
    steps.push({
      step: "filed",
      lines: numbered(counter.visit.lines),
      offered: [],
      taken: "file",
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const entry = director.ledger.people
      .get(playerId)!
      .schedule.find((row) =>
        row.momentId.includes(`candidate-filed:${filing.id}`),
      );
    let petition: unknown = "no scene staged for this filing";
    if (
      entry &&
      entry.bindings.some((binding) => binding.typeKey === "filing")
    ) {
      const scene = purposeScene(core, director, playerId, entry, {
        typeKey: "filing",
      });
      if (scene?.kind === "composed") {
        const talk = scene.scene.talk;
        const say = (line: { role: string; text: string }) => ({
          speaker:
            line.role === "asked"
              ? "the candidate"
              : line.role === "narrator"
                ? "narration"
                : "the clerk",
          text: line.text,
        });
        petition = {
          narration: talk.narration.map((row) => row.text),
          clerkSays: talk.state.text,
          replies: talk.tree.replies.map((reply) => ({
            offered: reply.line.text,
            move: reply.line.move,
            then: (reply.next?.lines ?? []).map(say),
          })),
        };
      }
    }
    scenes.push({
      place: `${place.name} (${place.key})`,
      runSeed: run,
      draw,
      race: race.id,
      narration: intro,
      counter: steps,
      petition,
    });
    done += 1;
  } catch (error) {
    process.stderr.write(`${place.name}: ${String(error).slice(0, 120)}\n`);
  }
}
void elementsOf;
mkdirSync(out, { recursive: true });
writeFileSync(
  `${out}/packet.json`,
  JSON.stringify({ part: "W2 filing", scenes }, null, 2),
);
process.stdout.write(`wrote ${out}/packet.json with ${scenes.length} scenes\n`);
