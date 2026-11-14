/**
 * Words builder W3's proof for the filing counter as one scene (Nov 13, 2026):
 * in a place drawn from all 56, the player walks into the filing office, names
 * the first local race they may file for, asks every question the clerk's
 * scene offers, then files; every line and choice is printed as played, with
 * the place, the seed and the reply records the counter wrote.
 * Usage: node --import tsx scripts/words/w3-counter.ts <seed>
 */
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  checkEligibility,
  filingOfficeFor,
  playerContests,
} from "../../src/core2/modules/elections";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { chooseAtCounter, openBenchFilingVisit } from "../../src/bench/filing";
import { buildBenchWorld } from "../../src/bench/world";

const seed = process.argv[2] ?? "w3-counter";
setBookkeeping(false);
for (let attempt = 0; attempt < 6; attempt += 1) {
  const place = drawPlace(
    seed,
    `${process.env.PLACE_TAG ?? "w3-counter"}:${attempt}`,
  );
  const where = `${place.name} (${place.key}), seed ${seed}, draw ${attempt}`;
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const playerId = core.playerId as PersonId;
  const open = () =>
    playerContests(api).find(
      (row) =>
        row.level !== "federal" &&
        row.level !== "state" &&
        checkEligibility(api, playerId, row.id).every((check) => check.met),
    );
  let contest = open();
  for (let week = 0; week < 52 && !contest; week += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
    contest = open();
  }
  if (!contest) {
    console.log(`Passed over ${where}: no local race the player may file for`);
    continue;
  }
  const filedWith = filingOfficeFor(api, contest.id).filedWith;
  let counter = openBenchFilingVisit(core, playerId, filedWith, 10 * 60);
  let shown = 0;
  const show = (label: string) => {
    console.log(`-- ${label}`);
    for (const line of counter.visit.lines.slice(shown))
      console.log(`  ${line.speaker}: ${line.text}`);
    shown = counter.visit.lines.length;
    for (const choice of counter.visit.choices)
      console.log(`    [${choice.key}] ${choice.text}`);
  };
  console.log(`Place: ${where}\nRace: ${contest.title}`);
  show("open");
  counter = chooseAtCounter(core, counter, `pick:${contest.id}`);
  show("picked");
  for (let n = 0; n < 4; n += 1) {
    // SAY=confront asks about the rival first; otherwise the first reply that is not filing or leaving.
    const says = counter.visit.choices.filter((row) =>
      row.key.startsWith("say:"),
    );
    const say = says.find((row) => row.move === process.env.SAY) ?? says[0];
    if (!say) break;
    counter = chooseAtCounter(core, counter, say.key);
    show(`said ${say.key}`);
  }
  if (counter.visit.choices.some((row) => row.key === "file")) {
    counter = chooseAtCounter(core, counter, "file", {});
    show("filed");
  }
  const replies = [...core.eventIds].filter((id) =>
    id.startsWith("scene-reply:filing-counter:"),
  );
  console.log(`Reply records:\n  ${replies.join("\n  ")}`);
  process.exit(0);
}
console.log("No drawn place filed in six draws.");
