/**
 * Plays a local election in a drawn place and prints what a player is told: the morning of election day, the
 * night's returns and the call (src/bench/election-night.ts), and the director's scene of the win (race-won,
 * the victory-night purpose), every reply pressed, with the facts it leans on and the piece keys said. Development
 * tooling for the Story thread, shipped play never imports it; the shape of door-walk.ts.
 *
 *   node --import tsx scripts/words/election-walk.ts --seed <word> [--label a] [--attempts 12] [--seat mayor] [--want won|family|family-loss]
 *
 * The place is drawn from all 56 by seed and label. A local resident files for an open local seat that needs no
 * petition (a place with none is passed over by name and the next place is drawn, up to `--attempts`; the seed and
 * every place passed over are printed; with `--want won` a place where the filer lost is passed over too, so the win's
 * scene plays). The walk then lives to the day after the election, calling the bench's
 * election-day and election-night readers on the days they are told and sweeping the director's schedule for the
 * win's scene.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { electionDay, electionNight } from "../../src/bench/election-night";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../../src/core2/campaign-data";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  fileCandidacy,
  openContests,
  petitionOf,
} from "../../src/core2/modules/elections";
import { townSeats } from "../../src/core2/modules/offices";
import { P } from "../../src/core2/parameters";
import { corePlaceByKey } from "../../src/core2/place-lookup";
import { advancePlayerV1, resumePlayerV1 } from "../../src/core2/player-v1";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";
import { townResidentsByCash } from "../../tests/support/resident-adults-test-kit";
import { drawPlace } from "../core2-year/place";
import { walkPlaces } from "./walk-places";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "");
if (!seed) throw new Error("--seed <word> is required");
const label = option("label", "a");
const walk = walkPlaces(option, label);
/** A word the seat's title must match (for example `mayor`), to play a single-seat race; any local seat by default. */
const seatWanted = option("seat", "");

setBookkeeping(false);
const place = drawPlace(seed, `election-walk:${walk.drawLabel}`);
const where = `${place.name} (${place.key}), seed ${place.seed}`;
console.log(`# PLACE ${where}`);
/** A place whose adults all live in group quarters has no resident to play: passed over by name, not a crash. */
const built = (() => {
  try {
    return buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "NoPlayerHereError")
      return walk.passOver(where, error.message);
    throw error;
  }
})();
const { core, director } = built;
const api = coreAPI(core);

const printTree = (node: TreeNode, ind: string) => {
  for (const l of node.lines)
    console.log(`${ind}${l.speaker}: ${l.text}   <${l.parts.join(" + ")}>`);
  for (const r of node.replies) {
    console.log(
      `${ind}> YOU press [${r.line.move}]: ${r.line.text}   <${r.line.parts.join(" + ")}>`,
    );
    if (r.next) printTree(r.next, ind + "    ");
  }
  if (node.end)
    console.log(
      `${ind}[END ${node.end.ending?.id}]${node.end.close ? ` close: ${node.end.close.text} <${node.end.close.parts.join(" + ")}>` : ""}`,
    );
};
const show = (result: ReturnType<typeof purposeScene>, head: string) => {
  if (result?.kind !== "composed") return false;
  const { scene } = result;
  console.log(
    `\n## ${head}: ${scene.purpose}; facts: ${scene.facts.map((f) => f.key).join(", ")}`,
  );
  for (const f of scene.facts)
    console.log(`   fact ${f.key} = ${f.text}  [${f.recordIds.join(" ")}]`);
  for (const n of scene.talk.narration) console.log(`Narrator: ${n.text}`);
  console.log(
    `${scene.talk.state.speaker}: ${scene.talk.state.text}   <${scene.talk.state.parts.join(" + ")}>`,
  );
  printTree(scene.talk.tree, "  ");
  return true;
};

const open = () =>
  openContests(api).some(
    (c) => c.level !== "federal" && c.level !== "state" && !c.special,
  );
for (let w = 0; w < 52 && !open(); w += 1)
  advanceCore(core, addDays(makeIsoDate(core.date), 7));
const start = makeIsoDate(core.date);
const town = corePlaceByKey(place.key)?.context.jurisdiction.id;
const adults = townResidentsByCash(core, api).filter(
  (r) =>
    r.alive &&
    r.placeId === town &&
    r.tier !== "husk" &&
    ageOnDate(makeIsoDate(r.birthDate), start) >= 35,
);
let filingId: string | null = null;
let personId: PersonId | undefined;
let electionDate = "";
for (const row of adults.slice(0, 60)) {
  if (townSeats(api).some((s) => s.holder?.personId === row.id)) continue;
  for (const c of openContests(api)) {
    if (c.level === "federal" || c.level === "state" || c.special) continue;
    if (seatWanted && !new RegExp(seatWanted, "i").test(c.title)) continue;
    const f = fileCandidacy(api, {
      personId: row.id,
      contestId: c.id,
      platform: [`${PLATFORM_QUESTIONS[0]}=1`],
    });
    if (f.status === "refused" || f.filing.status !== "on-ballot") continue;
    const need = petitionOf(api, f.filing.id)?.needed ?? 0;
    console.log(`# filed ${row.id} in ${c.id}: petition needs ${need}`);
    filingId = f.filing.id;
    personId = row.id;
    electionDate = c.electionDate;
    core.playerId = row.id;
    break;
  }
  if (filingId) break;
}
if (!filingId || !personId) {
  walk.passOver(
    where,
    "no open local seat that puts a filer on the ballot with no petition",
  );
}
if (
  ["family", "family-loss"].includes(option("want", "")) &&
  !(
    core.households.get(core.people.get(personId!)!.householdId)?.memberIds ??
    []
  ).some((id) => id !== personId && core.people.get(id)?.alive)
)
  walk.passOver(
    where,
    "the filer lives with no one the director could book a loss for",
  );
console.log(
  `# PLAYER ${personId} filed ${filingId} on ${start}; the election is ${electionDate}`,
);
core.focusPersonIds.add(personId!);
director.watch(core, personId!);
const book = director.ledger.people.get(personId!)!;
const seen = new Set<string>();
let told = 0;
/** Everyone whose books the sweep reads: the filer and their household, whose loss the family-loss scene tells. */
const household = (
  core.households.get(core.people.get(personId!)!.householdId)?.memberIds ?? []
).filter((id) => id !== personId);
for (const id of household)
  if (core.people.get(id)?.alive) director.watch(core, id);
/** Every situation type the director bound to them on an election result, composed one by one (the win's scene, the
 * concession call, the family's loss), so a result that binds several plays each. */
const sweep = () => {
  for (const who of [personId!, ...household]) {
    const theirBook = director.ledger.people.get(who);
    if (!theirBook) continue;
    for (const entry of theirBook.schedule) {
      const m = theirBook.momentsById.get(entry.momentId);
      if (!m || m.label !== "cause:event:election-result") continue;
      for (const binding of entry.bindings) {
        const key = `${who}|${entry.momentId}|${binding.typeKey}`;
        if (seen.has(key)) continue;
        const result = purposeScene(core, director, who, entry, {
          typeKey: binding.typeKey,
        });
        if (result?.kind !== "composed") continue;
        seen.add(key);
        if (
          show(
            result,
            `${m.label} on ${core.date} (${binding.typeKey}, told to ${who === personId ? "the filer" : "a household member"})`,
          )
        )
          told += 1;
      }
    }
  }
};
const dayBefore = addDays(makeIsoDate(electionDate), -1);
const through = addDays(makeIsoDate(electionDate), 2);
let shownDay = false;
let shownNight = "";
let packet = advancePlayerV1(core, {
  controlledPersonId: personId!,
  through: { date: through, minuteOfDay: P.zero },
});
while (packet.kind !== "complete") {
  if (!shownDay && core.date >= electionDate) {
    shownDay = true;
    const day = electionDay(core, personId!, null, false, electionDate);
    console.log(`\n## election day ${core.date}`);
    for (const l of day.lines) console.log(`Narrator: ${l.text}`);
  }
  sweep();
  packet = resumePlayerV1(core, {
    kind: packet.kind === "stop" ? "stop" : "own-choice",
    pauseId: packet.pauseId,
  } as never);
}
sweep();
const night = electionNight(core, personId!);
if (night && shownNight !== core.date) {
  shownNight = core.date;
  console.log(`\n## election night ${core.date}`);
  for (const step of night.steps)
    for (const l of step.lines) console.log(`Narrator: ${l.text}`);
}
if (process.argv.includes("--labels"))
  for (const entry of book.schedule) {
    const m = book.momentsById.get(entry.momentId);
    console.log(
      `# moment ${m?.label} on ${entry.date ?? "?"} types ${entry.bindings.map((b) => b.typeKey).join(",")}`,
    );
  }
if (
  option("want", "") === "family-loss" &&
  night?.steps.some((step) =>
    step.lines.some((l) => /you (won|take)/i.test(l.text)),
  )
)
  walk.passOver(where, "the filer won, so no household member's loss is told");
if (
  option("want", "") === "won" &&
  !night?.steps.some((step) => step.lines.some((l) => /you won/i.test(l.text)))
)
  walk.passOver(where, "the filer did not win the race");
console.log(
  `\n# DONE ${where}: election ${electionDate}; election day ${shownDay ? "told" : "not told"}; election night ${night ? "told" : "not told"}; race-won scenes ${told}; last day ${core.date}; day before was ${dayBefore}`,
);
