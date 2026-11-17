/**
 * Plays the last day in drawn places and prints every talk whole (Story lead, Nov 17; development
 * tooling like door-walk.ts, shipped play never imports it).
 *
 *   node --import tsx scripts/words/last-day-walk.ts --seed <word> --mode school|job|quit
 *     [--labels a,b,c,d,e,f] [--tenure-days 60] [--want 1]
 *
 * Each label draws one place from all 56 (seed and label); a place that cannot show the mode is
 * named and passed over, and the next label is tried until `--want` talks are printed.
 *
 * `--mode school`: a school year ends. The opening player is an adult out of school, and a player's
 * own school days are their own pick, so the senior is a town student of senior age that the same
 * engines carry: watched like the player (`director.watch`), staged from the school engine's own
 * graduation result on the last school day (the senior is played through the game's own day
 * packets, own choice, which is what makes the director stage a controlled person's scenes), with a classmate who says goodbye
 * (`school-goodbye`). A place with no such student is passed over.
 *
 * `--mode job`: the player leaves a job by the game's own press (`quitJob`, behind Leave this job):
 * a player who holds a job the press can end leaves it at once; a player with none takes the job
 * the game offers, holds it for `--tenure-days`, then leaves it. The departure (`departure`, a
 * left-work end) is composed. A player who holds a post (a public job) is passed over.
 *
 * `--mode quit`: the player's own job is never a quit for another job (the jobs engine's monthly
 * review skips the controlled person), so this watches the town's workers for up to 36 months and
 * composes the departure of the first whose job the jobs engine ended as a quit (hired elsewhere).
 *
 * `--mode worker`: the same watch of the town's workers, printing the first job-left of any kind the
 * jobs engine wrote (a retirement, a leaving of work), for the reasons the player's own press never
 * writes.
 *
 * Every scene is printed with every reply pressed, the facts each line leans on with the record
 * ids behind them, and the piece keys said.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { P } from "../../src/core2/parameters";
import { advancePlayerV1, resumePlayerV1 } from "../../src/core2/player-v1";
import {
  acceptJobOffer,
  jobLeaveBlock,
  jobLeaveRecord,
  jobOffersFor,
  quitJob,
} from "../../src/core2/modules/jobs";
import { attendedSchool } from "../../src/core2/past";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";
import type { ScheduleEntry } from "../../src/director/scheduling";
import type { Moment } from "../../src/director/types";
import { drawPlace } from "../core2-year/place";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "");
if (!seed) throw new Error("--seed <word> is required");
const mode = option("mode", "");
if (!["school", "job", "quit", "worker"].includes(mode))
  throw new Error("--mode school|job|quit|worker is required");
const labels = option("labels", "a,b,c,d,e,f").split(",");
const tenureDays = Number(option("tenure-days", "60"));
const want = Number(option("want", "1"));
const SCHOOL_DAYS = 140;
const SCHOOL_CHECK_DAYS = 14;
const SENIOR_AGE = 17;
const SCHOOL_YEAR_BEGINS = "09-01";
const WATCHED_SENIORS = 12;
const LABEL = {
  school: "circumstance:school-last-day",
  job: "money:job-left",
  quit: "money:job-left",
  worker: "money:job-left",
}[mode as "school" | "job" | "quit" | "worker"];

setBookkeeping(false);

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

function trial(label: string): number {
  const place = drawPlace(seed, `last-day-walk:${label}`);
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  console.log(`# PLACE ${label}: ${where} (mode ${mode})`);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const me = core.playerId as PersonId;
  const show = (
    personId: PersonId,
    entry: ScheduleEntry,
    moment: Moment,
  ): boolean => {
    const result = purposeScene(core, director, personId, entry, {
      typeKey: "last-day",
    });
    if (result?.kind !== "composed") {
      const left = core.jobs.get(moment.causeId as never);
      console.log(
        `## not composed (cause ${moment.causeId}, job held by ${left?.personId ?? "no job"}, scene for ${personId}): ${JSON.stringify(result)}`,
      );
      return false;
    }
    const { scene } = result;
    console.log(
      `\n## ${scene.talk.lines[0]?.key} for ${personId} on ${core.date} (${moment.label}, cause ${moment.causeId}); facts: ${scene.facts.map((f) => f.key).join(", ")}`,
    );
    for (const f of scene.facts.filter((row) => row.key !== "name"))
      console.log(`   fact ${f.key} = ${f.text}  [${f.recordIds.join(" ")}]`);
    for (const n of scene.talk.narration) console.log(`Narrator: ${n.text}`);
    const open = scene.talk.open;
    if (open)
      console.log(
        `${open.speaker}: ${open.text}   <${open.parts.join(" + ")}>`,
      );
    else
      console.log("(no opening line: the one who speaks goes straight to it)");
    console.log(
      `${scene.talk.state.speaker}: ${scene.talk.state.text}   <${scene.talk.state.parts.join(" + ")}>`,
    );
    printTree(scene.talk.tree, "  ");
    return true;
  };
  const seen = new Set<string>();
  const sweep = (personId: PersonId, onlyQuit = false): number => {
    const book = director.ledger.people.get(personId);
    let shown = 0;
    for (const entry of book?.schedule ?? []) {
      const moment = book!.momentsById.get(entry.momentId);
      const key = `${personId}|${entry.momentId}`;
      if (
        !moment ||
        moment.label !== LABEL ||
        seen.has(key) ||
        !entry.bindings.some((row) => row.typeKey === "last-day")
      )
        continue;
      if (onlyQuit) {
        const job = core.jobs.get(moment.causeId as never);
        if (!job || jobLeaveRecord(api, job)?.kind !== "quit") continue;
      }
      seen.add(key);
      if (show(personId, entry, moment)) shown += 1;
    }
    return shown;
  };
  const next = () => advanceCore(core, addDays(makeIsoDate(core.date), 1));

  if (mode === "quit" || mode === "worker") {
    const town = core.people.get(me)!.placeId;
    const workers = [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.id !== me &&
          row.placeId === town &&
          row.jobId &&
          !row.jobId.startsWith("job:public:") &&
          !row.jobId.startsWith("job:office:"),
      )
      .map((row) => row.id)
      .sort()
      .slice(0, 80);
    for (const id of workers) {
      core.focusPersonIds.add(id);
      director.watch(core, id);
    }
    console.log(`# watching ${workers.length} workers`);
    let shown = 0;
    for (let month = 0; month < 36 && shown < want; month += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      for (const id of workers) shown += sweep(id, mode === "quit");
    }
    if (!shown)
      console.log(`# PASSED OVER ${where}: no ${mode} end in 36 months`);
    return shown;
  }

  if (mode === "school") {
    // The player's own school attendance is their own pick each day and the opening player is an
    // adult already out of school, so the senior is a town student the same engines carry: watched
    // like the player (`director.watch`), their year's end is staged from the school engine's own
    // graduation result, and a classmate says goodbye.
    for (let day = 0; day < SCHOOL_CHECK_DAYS; day += 1) next();
    // A senior is 17 when the school year begins (the school engine's own `gradeAgeFirst` plus the
    // twelfth grade); the attended row names the year.
    const seniors = [...core.people.values()]
      .filter((row) => {
        const attended = row.alive ? attendedSchool(core, row.id) : undefined;
        return (
          !!attended &&
          row.id !== me &&
          ageOnDate(
            makeIsoDate(row.birthDate),
            makeIsoDate(`${attended.year}-${SCHOOL_YEAR_BEGINS}`),
          ) === SENIOR_AGE
        );
      })
      .map((row) => row.id)
      .sort()
      .slice(0, WATCHED_SENIORS);
    // The director stages a year's end for a controlled person only: a senior steps in as the
    // player from here on, as door-walk.ts does for the resident who files.
    const [chosen] = seniors;
    if (!chosen) {
      console.log(`# PASSED OVER ${where}: no student of senior age`);
      return 0;
    }
    core.playerId = chosen;
    core.focusPersonIds.add(chosen);
    director.watch(core, chosen);
    console.log(
      `# ${chosen} steps in as the player, a senior of ${seniors.length} students of senior age`,
    );
    let packet = advancePlayerV1(core, {
      controlledPersonId: chosen,
      through: {
        date: addDays(makeIsoDate(core.date), SCHOOL_DAYS),
        minuteOfDay: P.zero,
      },
    });
    let shown = 0;
    while (packet.kind !== "complete" && !shown) {
      shown += sweep(chosen);
      if (shown) break;
      packet = resumePlayerV1(core, {
        kind: packet.kind === "stop" ? "stop" : "own-choice",
        pauseId: packet.pauseId,
      } as never);
    }
    if (!shown) shown += sweep(chosen);
    if (!shown)
      console.log(
        `# PASSED OVER ${where}: no last school day in ${SCHOOL_DAYS} days`,
      );
    return shown;
  }

  core.focusPersonIds.add(me);
  director.watch(core, me);
  // job
  const held = core.people.get(me)!.jobId;
  console.log(`# player holds ${held ?? "no job"}`);
  if (held && jobLeaveBlock(api, me)) {
    console.log(
      `# PASSED OVER ${where}: the player's job cannot be left by the press (${jobLeaveBlock(api, me)})`,
    );
    return 0;
  }
  let hiredOn: string | null = null;
  let left: ReturnType<typeof quitJob> | null = held ? quitJob(api, me) : null;
  if (left)
    console.log(`# left ${held} on ${core.date}: ${JSON.stringify(left)}`);
  for (let day = 0; day < 200 + tenureDays && !left?.left; day += 1) {
    next();
    if (!core.people.get(me)!.jobId && !hiredOn)
      for (const offer of jobOffersFor(api, me))
        if (acceptJobOffer(api, offer.id)) {
          hiredOn = core.date;
          console.log(`# hired on ${core.date}: ${offer.id}`);
          break;
        }
    if (
      hiredOn &&
      core.people.get(me)!.jobId &&
      Date.parse(core.date) - Date.parse(hiredOn) >= tenureDays * 86400000
    ) {
      left = quitJob(api, me);
      console.log(`# left on ${core.date}: ${JSON.stringify(left)}`);
    }
  }
  if (!left?.left) {
    console.log(
      `# PASSED OVER ${where}: the player took no job in ${200 + tenureDays} days`,
    );
    return 0;
  }
  let shown = sweep(me);
  for (let day = 0; day < 3 && !shown; day += 1) {
    next();
    shown += sweep(me);
  }
  if (!shown) console.log(`# PASSED OVER ${where}: no departure scene staged`);
  return shown;
}

let got = 0;
for (const label of labels) {
  got += trial(label);
  if (got >= want) break;
}
console.log(
  `\n# DONE ${mode}: ${got} talks printed from labels ${labels.join(",")}`,
);
process.exit(0);
