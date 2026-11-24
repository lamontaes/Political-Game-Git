/* eslint-disable @typescript-eslint/no-explicit-any */
// Whether the player lives where the seats say they must, then what the clerk says after their address moves: tsx filing-residency.ts <name prefix> <state key> | <seed>
import { createHash } from "node:crypto";
import { placeLocalities } from "../../src/core2/places";
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import {
  ELECTIONS_MODULE_ID,
  checkEligibility,
} from "../../src/core2/modules/elections";
setBookkeeping(false);
const [arg = "a1", state] = process.argv.slice(2);
let key: string, seed: string, name: string;
if (state) {
  const row = [...placeLocalities(state)].find((r) =>
    r.displayName.startsWith(arg),
  );
  if (!row) throw new Error(`No ${arg} in ${state}`);
  key = row.key;
  name = row.displayName;
  seed = createHash("sha256").update(`${arg}:filing`).digest("hex");
} else {
  const p = drawPlace(arg, "filing");
  key = p.key;
  name = p.name;
  seed = p.seed;
}
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: key,
});
const core: any = w.core;
const months = Number(process.env.MONTHS ?? 0);
if (months)
  advanceCore(core, addDays(makeIsoDate(core.date), Math.round(months * 30.4)));
const api = coreAPI(core);
const player = core.people.get(core.playerId);
const townRow = api
  .moduleState(ELECTIONS_MODULE_ID)
  .table("town")
  .get("town") as any;
console.log(
  "place",
  name,
  key,
  "player",
  player?.id,
  "placeId",
  player?.placeId,
  "townPlaceId",
  townRow?.townPlaceId,
  "match",
  player?.placeId === townRow?.townPlaceId,
);
const contests = api
  .moduleState(ELECTIONS_MODULE_ID)
  .table("contests")
  .rows() as any[];
for (const c of contests
  .filter(
    (c) =>
      c.level === "local" ||
      c.level === "municipal" ||
      c.family === "municipalOffice",
  )
  .slice(0, 3)) {
  const unmet = checkEligibility(api, core.playerId, c.id).filter(
    (r: any) => !r.met,
  );
  console.log(
    c.title,
    "unmet",
    unmet
      .map((r: any) => `${r.rule}: required ${r.required}, actual ${r.actual}`)
      .join(" | ") || "none",
  );
}

// The player walks to the counter after their address moved to another town of the state: what the clerk says.
import { openBenchFilingVisit, chooseAtCounter } from "../../src/bench/filing";
import { filingOfficeFor } from "../../src/core2/modules/elections";
const other = [...placeLocalities(townRow.stateKey ?? "US-CT")].find(
  (r) => r.key !== key,
);
if (other) {
  const { corePlaceByKey } = await import("../../src/core2/place-lookup");
  const otherPlace = corePlaceByKey(other.key);
  if (otherPlace) {
    api.updatePerson(core.playerId, {
      placeId: otherPlace.context.jurisdiction.id,
    });
    const contest = (
      api.moduleState(ELECTIONS_MODULE_ID).table("contests").rows() as any[]
    ).find((c) => c.level !== "federal" && c.level !== "state");
    if (contest) {
      core.date = contest.filingOpens ?? core.date;
      const filedWith = filingOfficeFor(api, contest.id).filedWith;
      const visit: any = openBenchFilingVisit(
        core,
        core.playerId,
        filedWith,
        600,
      );
      let state: any = visit;
      const pick =
        (state.visit.choices as any[]).find(
          (c) => c.action.kind === "pick" && c.action.contestId === contest.id,
        ) ?? state.visit.choices[0];
      state = chooseAtCounter(core, state, pick.key);
      console.log(
        "moved to",
        other.displayName,
        "->",
        state.visit.lines
          .filter((l: any) => l.speaker === "clerk")
          .map((l: any) => l.text)
          .join(" | "),
      );
    }
  }
}

// The race page the player sees with that address: does it offer filing, or say why not.
import { localRaces } from "../../src/bench/government";
for (const race of (localRaces(core) as any).races ?? []) {
  console.log(
    "race page",
    race.title,
    "playerMayFile",
    race.playerMayFile,
    "cannotFile",
    JSON.stringify(race.cannotFile),
  );
}
