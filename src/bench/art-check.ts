/* global process, console */
// Every picture the play screen can show, headless, in the place the
// golden-path runner draws: the opening, home and work for each household
// member, every town place in Go to, each filing office, each body you could
// sit on, and each speech venue. A scene fails when its backdrop file is
// missing or a person on its stage has no drawable figure. Also lists the
// painted places this world never reached.
// Usage: node --import tsx src/bench/art-check.ts
import { existsSync } from "node:fs";
import { coreAPI } from "../core2/state";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { BenchPlayer } from "./player";
import { governmentView } from "./government";
import { openBenchFilingVisit } from "./filing";
import { townPlaces, visitPlace } from "./places";
import { backdropFile, backdropPath, benchScene } from "./scene";
import { hasBackdrop } from "./backdrop-places";
import scenePlaces from "./data/scene-places.json" with { type: "json" };

const seed = process.env.GOLDEN_PATH_SEED ?? "art-check";
const placeKey = process.env.GOLDEN_PATH_PLACE_KEY;
const w = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  ...(placeKey ? { placeKey } : {}),
});
const core = w.core;
const me = w.playerId!;
const player = new BenchPlayer(core, w.director);
player.select(me);

interface Staged {
  personId?: string;
  figureUrl: string;
}
const reached = new Set<string>();
const failures: string[] = [];
let scenes = 0,
  figures = 0;

function check(
  label: string,
  place: string,
  backdropFileName: string,
  people: readonly Staged[],
  cast: number,
) {
  scenes++;
  reached.add(place);
  if (!existsSync(backdropPath(backdropFileName)))
    failures.push(`${label}: backdrop ${backdropFileName} missing`);
  if (cast && !people.length)
    failures.push(`${label}: ${place} has nobody on its stage`);
  for (const row of people) {
    figures++;
    // Only the v2 standing figures are drawn.
    const url = new URL(row.figureUrl, "http://bench");
    if (!url.pathname.startsWith("/art/people-engine/v2/figures/"))
      failures.push(`${label}: ${row.personId} is not a v2 figure`);
    else if (!existsSync(new URL(`../..${url.pathname}`, import.meta.url)))
      failures.push(`${label}: figure ${url.pathname} missing`);
  }
}

const household =
  core.households.get(core.people.get(me)!.householdId)?.memberIds ?? [];
for (const id of household) {
  const scene = benchScene(core, id, id === me ? player.packet : undefined);
  check(
    `home or work of ${id}`,
    scene.place,
    scene.backdrop.file,
    scene.people,
    1,
  );
}

for (const row of townPlaces(core, me, player.packet)) {
  const visit = visitPlace(core, me, row.organizationId, 10 * 60);
  check(`go to ${row.name}`, visit.place, visit.backdrop.file, visit.people, 1);
}

const gov = governmentView(core, me);
for (const filedWith of new Set(
  gov.contests.map((c) => c.filingOffice.filedWith),
)) {
  const visit = openBenchFilingVisit(core, me, filedWith, 10 * 60);
  check(
    `filing at ${filedWith}`,
    visit.place,
    visit.backdrop.file,
    visit.people,
    1,
  );
}

// The rooms bodies meet in and the speech venues, by their mapped picture.
const kinds = new Set(
  (
    coreAPI(core)
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .rows() as unknown as {
      kind?: string;
    }[]
  ).map((row) => row.kind ?? ""),
);
const bodyPlaces = scenePlaces.bodyPlaces as unknown as Record<
  string,
  string[]
>;
for (const [kind, places] of Object.entries(bodyPlaces)) {
  const place = places.find?.(hasBackdrop);
  if (place && (kind === "default" || kinds.has(kind)))
    check(`body ${kind}`, place, backdropFile(place, 19 * 60).file, [], 0);
}
for (const place of scenePlaces.speechPlaces)
  check(`speech ${place}`, place, backdropFile(place, 18 * 60).file, [], 0);

// Story situations, school by age and election night, by their mapped picture
// (the first one painted, as the screens pick it).
for (const [key, places] of Object.entries(
  scenePlaces.situationPlaces as Record<string, string[]>,
)) {
  const place = places.find((row) => row !== "@home" && hasBackdrop(row));
  if (place)
    check(`story ${key}`, place, backdropFile(place, 12 * 60).file, [], 0);
}
for (const row of [
  ...scenePlaces.schoolPlacesByAge.flatMap((band) => band.places),
  ...Object.values(scenePlaces.electionNight),
])
  if (hasBackdrop(row))
    check(`mapped ${row}`, row, backdropFile(row, 12 * 60).file, [], 0);

const painted = [...new Set(manifest.backdrops.map((row) => row.place))];
const unused = painted.filter((place) => !reached.has(place)).sort();
console.log(
  `art-check ${seed} ${coreAPI(core).state.placeMetadata.placeKey ?? ""}: ${scenes} scenes, ${figures} figures, ${failures.length} failures, ${reached.size} of ${painted.length} painted places reached`,
);
for (const line of failures) console.log(`  FAIL ${line}`);
console.log(`  not reached here: ${unused.join(", ")}`);
process.exitCode = failures.length ? 1 : 0;
