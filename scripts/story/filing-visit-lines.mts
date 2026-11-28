// What the clerk and the player say at the filing counter: draws places, walks the best-connected adult to the
// counter, picks the first race and prints every line and choice the visit shows.
// Usage: node --import tsx scripts/story/filing-visit-lines.mts <run-seed> [places=2]
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld, NoPlayerHereError } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { openContests } from "../../src/core2/modules/elections";
import { lawChain } from "../../src/core2/modules/laws";
import { filingOfficeFor } from "../../src/core2/modules/elections";
import {
  chooseAtCounter,
  NothingAtCounter,
  openBenchFilingVisit,
} from "../../src/bench/filing";

const [run, placesArg] = process.argv.slice(2) as [string, string?];
const places = Number(placesArg ?? 2);
for (let draw = 0, done = 0; done < places && draw < places * 6; draw += 1) {
  const place = drawPlace(`${run}:${draw}`, "filing-visit-lines");
  let world;
  try {
    world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
  } catch (error) {
    if (!(error instanceof NoPlayerHereError))
      process.stdout.write(
        `\n## ${place.name} did not build: ${String(error).slice(0, 90)}\n`,
      );
    continue;
  }
  const core = world.core;
  const api = coreAPI(core);
  const town = lawChain(api).townPlaceId;
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
    )
    .sort(
      (a, b) =>
        b.familyIds.size +
          b.knownIds.size -
          a.familyIds.size -
          a.knownIds.size || a.id.localeCompare(b.id),
    );
  const player = adults[0];
  if (!player) continue;
  core.playerId = player.id;
  let shown = false;
  for (let week = 0; week < 60 && !shown; week += 1) {
    for (const contest of openContests(api)) {
      const filedWith = filingOfficeFor(api, contest.id).filedWith;
      try {
        let state = openBenchFilingVisit(core, player.id, filedWith, 600);
        process.stdout.write(
          `\n## ${place.name} (${place.key}), run seed ${run} draw ${draw}, ${contest.officeId}, counter: ${filedWith}\n`,
        );
        const show = (label: string) => {
          process.stdout.write(`-- ${label}\n`);
          for (const row of state.visit.lines)
            process.stdout.write(`  ${row.speaker}: ${row.text}\n`);
          for (const row of state.visit.choices)
            process.stdout.write(
              `  [${row.control}] ${row.key.slice(0, 40)}: ${row.text}\n`,
            );
        };
        show("opening");
        const pick = state.visit.choices.find((row) => row.control === "pick");
        if (pick) {
          state = chooseAtCounter(core, state, pick.key);
          show("after picking the race");
          // A question or a challenge, then the filing itself, the way a player would.
          for (const control of ["ask", "file"] as const) {
            const next = state.visit.choices.find(
              (row) => row.control === control,
            );
            if (!next) continue;
            state = chooseAtCounter(core, state, next.key);
            show(`after ${control}`);
          }
        }
        shown = true;
        done += 1;
        break;
      } catch (error) {
        if (!(error instanceof NothingAtCounter)) throw error;
      }
    }
    if (!shown) advanceCore(core, addDays(makeIsoDate(core.date), 7));
  }
}
