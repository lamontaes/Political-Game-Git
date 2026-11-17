/**
 * Plays the filing at home in a drawn place and prints every talk whole (Story
 * lead, Nov 17; development tooling like door-walk.ts, shipped play never
 * imports it).
 *
 *   node --import tsx scripts/words/family-filing-walk.ts --seed <word> [--label a]
 *     [--said <file>] [--per 1]
 *
 * The place is drawn from all 56 by seed and label. The world waits, a week at
 * a time, for a local race open to filing, then residents of four kinds of
 * household (up to `--per` of each) file for it through the elections engine (`fileCandidacy`, the
 * call the filing screen makes), each in a home of their own:
 *
 * - money, own: the filer puts their own money into the campaign the day they
 *   file (`contributeOwnMoney`, the campaign screen's call), enough that what
 *   is left carries the household's costs for under the race;
 * - money, job: a filer whose household the race strains once they leave
 *   their job to run (`quitJob`, the job screen's call);
 * - time: a working filer with a young child at home;
 * - news: a filer the race costs nothing at home, whose household hears it
 *   as the player's news in the evening talk instead of a stake scene.
 *
 * For each filing the day closes, the stake's facts are printed with their
 * record ids, and a staged talk is composed with `purposeScene` and its whole
 * tree printed, every reply pressed. A request answered with a yes is written
 * back with `replyInScene`, printing the volunteer it enlists; a put-off is
 * written back, printing the tie before and after. `--said` writes every piece
 * key said, one per line, so a reader can count which new lines came out.
 */
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { closenessBetween } from "../../src/core2/closeness";
import { gameStartDate } from "../../src/core2/game-start";
import {
  addDays,
  ageOnDate,
  daysBetweenText,
  makeIsoDate,
} from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  campaignFor,
  contributeOwnMoney,
} from "../../src/core2/modules/campaigns";
import {
  fileCandidacy,
  openContests,
  type ContestRow,
} from "../../src/core2/modules/elections";
import { filingClerkFor } from "../../src/core2/modules/filing-clerk";
import { quitJob } from "../../src/core2/modules/jobs";
import { P } from "../../src/core2/parameters";
import { coreAPI } from "../../src/core2/state";
import type { PersonId, PersonState } from "../../src/core2/types";
import { openConversation, say } from "../../src/director/conversation";
import rulesFile from "../../src/director/data/scene-talk-rules.json" with { type: "json" };
import { stakeOf } from "../../src/director/family-stake";
import { purposeScene, replyInScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";
import { drawPlace } from "../core2-year/place";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "");
if (!seed) throw new Error("--seed <word> is required");
const label = option("label", "a");
const saidFile = option("said", "");
const per = Number(option("per", "1"));
const RULES = rulesFile.familyStakes;
const EVENING = 20 * 60 + 30;

setBookkeeping(false);
const place = drawPlace(seed, `family-filing-walk:${label}`);
const where = `${place.name} (${place.key}), seed ${place.seed}`;
console.log(`# PLACE ${where} (drawn from --seed ${seed} --label ${label})`);
const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const api = coreAPI(core);
const said = new Set<string>();

const local = () =>
  openContests(api).filter(
    (row) =>
      row.level !== "federal" &&
      row.level !== "state" &&
      daysBetweenText(core.date, row.electionDate) > 30,
  );
for (let week = 0; week < 60 && !local().length; week += 1)
  advanceCore(core, addDays(makeIsoDate(core.date), 7));
const races = local().sort((a, b) => a.id.localeCompare(b.id));
if (!races.length) {
  console.log(`SKIP ${where}: no local race open in 60 weeks`);
  process.exit(0);
}
console.log(`# ${core.date}: races open ${races.map((r) => r.id).join(", ")}`);

const age = (p: PersonState) =>
  ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(core.date));
const membersOf = (p: PersonState) =>
  [...(core.households.get(p.householdId)?.memberIds ?? [])]
    .map((id) => core.people.get(id))
    .filter((row): row is PersonState => !!row?.alive);
const books = (p: PersonState) => {
  const members = membersOf(p);
  const liquid = members.reduce((sum, row) => sum + row.liquidMinor, 0);
  const pay = members.reduce((sum, row) => {
    const job = row.jobId ? core.jobs.get(row.jobId) : undefined;
    return sum + (job && !job.endsAt ? job.wageDailyMinor : 0);
  }, 0);
  const gap =
    members.reduce((sum, row) => sum + row.livingCostDailyMinor, 0) - pay;
  return { liquid, gap };
};
const youngChild = (p: PersonState) =>
  membersOf(p).some((row) => age(row) < RULES.youngChildAge.value);
const others = (p: PersonState) =>
  membersOf(p).filter((row) => row.id !== p.id && age(row) >= P.votingAge);

const clerks = new Set(races.map((r) => filingClerkFor(api, r.id)?.personId));
const residents = [...core.people.values()]
  .filter(
    (p) =>
      p.alive &&
      age(p) >= P.votingAge &&
      !clerks.has(p.id) &&
      others(p).length > 0,
  )
  .sort((a, b) => a.id.localeCompare(b.id));
const gate = RULES.runwayShortfall.value;
const raceDays = (race: ContestRow) =>
  daysBetweenText(core.date, race.electionDate);
type Kind = "money-own" | "money-job" | "time" | "news";
const kindOf = (p: PersonState, race: ContestRow): Kind | null => {
  const child = youngChild(p);
  const { liquid, gap } = books(p);
  const days = raceDays(race);
  const under = Math.floor(days * (1 - gate)) - 1;
  if (!child && gap > 0 && liquid / gap >= days) {
    const give = liquid - Math.max(0, under) * gap;
    if (give > 0 && give <= p.liquidMinor) return "money-own";
  }
  const job = p.jobId ? core.jobs.get(p.jobId) : undefined;
  // A post held by appointment or office is left by resigning, not by a quit.
  if (
    !child &&
    job &&
    !job.endsAt &&
    !/^job:(?:public|office):/.test(job.id) &&
    (gap <= 0 || liquid / gap >= days * (1 - gate)) &&
    gap + job.wageDailyMinor > 0 &&
    liquid / (gap + job.wageDailyMinor) < days * (1 - gate)
  )
    return "money-job";
  if (child && p.jobId) return "time";
  if (!child && (gap <= 0 || liquid / gap >= days)) return "news";
  return null;
};

const cases: { kind: Kind; person: PersonState; filingId: string }[] = [];
const homes = new Set<string>();
for (const person of residents) {
  if (cases.length === 4 * per) break;
  if (homes.has(person.householdId)) continue;
  for (const race of races) {
    const kind = kindOf(person, race);
    if (!kind || cases.filter((row) => row.kind === kind).length >= per) break;
    director.watch(core, person.id);
    core.focusPersonIds.add(person.id);
    const result = fileCandidacy(api, {
      personId: person.id,
      contestId: race.id,
      platform: [],
    });
    if (!["petitioning", "on-ballot"].includes(result.status ?? "")) continue;
    homes.add(person.householdId);
    const filingId = result.filing.id;
    if (kind === "money-own") {
      const { liquid, gap } = books(person);
      const under = Math.floor(raceDays(race) * (1 - gate)) - 1;
      const given = contributeOwnMoney(
        api,
        filingId,
        liquid - Math.max(0, under) * gap,
      );
      console.log(`# ${person.id} put ${given} (minor) into ${filingId}`);
    }
    if (kind === "money-job")
      console.log(
        `# ${person.id} left work: ${JSON.stringify(quitJob(api, person.id))}`,
      );
    console.log(`# ${kind}: ${person.id} filed ${filingId} on ${core.date}`);
    cases.push({ kind, person, filingId });
    break;
  }
}
for (const kind of ["money-own", "money-job", "time", "news"])
  if (!cases.some((row) => row.kind === kind))
    console.log(`# PASSED OVER ${where}: no ${kind} household could file`);

// The day closes: the director stores each filing's moment.
advanceCore(core, addDays(makeIsoDate(core.date), 1));

const printTree = (node: TreeNode, ind: string) => {
  for (const l of node.lines) {
    l.parts.forEach((key) => said.add(key));
    console.log(`${ind}${l.speaker}: ${l.text}   <${l.parts.join(" + ")}>`);
  }
  for (const r of node.replies) {
    r.line.parts.forEach((key) => said.add(key));
    console.log(
      `${ind}> YOU press [${r.line.move}]: ${r.line.text}   <${r.line.parts.join(" + ")}>`,
    );
    if (r.next) printTree(r.next, ind + "    ");
  }
  if (node.end) {
    node.end.close?.parts.forEach((key) => said.add(key));
    console.log(
      `${ind}[END ${node.end.ending?.id}]${node.end.close ? ` close: ${node.end.close.text} <${node.end.close.parts.join(" + ")}>` : ""}`,
    );
  }
};
/** Every path to an end, as reply indexes. */
const paths = (node: TreeNode, prefix: number[] = []): number[][] =>
  node.replies.flatMap((reply, index) =>
    reply.next?.replies.length
      ? paths(reply.next, [...prefix, index])
      : [[...prefix, index]],
  );
const reach = (tree: TreeNode, path: number[]) => {
  let node: TreeNode | null = tree;
  for (const i of path) node = node?.replies[i]?.next ?? null;
  return node;
};

for (const { kind, person, filingId } of cases) {
  const causeId = `candidate-filed:${filingId}`;
  console.log(`\n## ${kind}: ${person.givenName} (${person.id}), ${causeId}`);

  for (const other of others(person)) {
    const stake = stakeOf(core, person.id, causeId, other.id);
    console.log(
      `   ${other.givenName} (${other.id}): ${stake ? `stake ${stake.kind}` : "no stake"}`,
    );
    for (const [key, fact] of Object.entries(stake?.facts ?? {}))
      console.log(
        `      fact ${key} = ${fact.text}  [${fact.recordIds.join(" ")}]`,
      );
  }
  const entry = director.ledger.people
    .get(person.id)
    ?.schedule.find((row) => row.momentId.includes(causeId));
  const staged = entry?.bindings.find((row) => row.typeKey === "family-filing");
  if (!entry || !staged) {
    console.log(
      `   no family-filing scene staged (moment ${entry?.momentId ?? "none"})`,
    );
    // The filing told at home as news, in the evening talk.
    for (const other of others(person)) {
      const talk = openConversation(core, person.id, other.id, {
        director,
        presentIds: others(person).map((row) => row.id),
        minuteOfDay: EVENING,
      });
      for (let turn = 0; turn < 3 && talk.choices.length; turn += 1)
        say(core, talk, talk.choices[0]!.key);
      console.log(`   -- the evening talk with ${other.givenName}`);
      for (const line of talk.lines)
        console.log(
          `   ${line.speakerId === person.id ? "You" : core.people.get(line.speakerId)?.givenName}: ${line.text}`,
        );
    }
    continue;
  }
  (core as { playerId?: string }).playerId = person.id;
  const result = purposeScene(core, director, person.id as PersonId, entry, {
    typeKey: "family-filing",
  });
  if (result?.kind !== "composed") {
    console.log(`   NOT COMPOSED: ${JSON.stringify(result)}`);
    continue;
  }
  const { scene } = result;
  console.log(`   facts: ${scene.facts.map((f) => f.key).join(", ")}`);
  for (const n of scene.talk.narration) {
    n.parts?.forEach((key: string) => said.add(key));
    console.log(`Narrator: ${n.text}`);
  }
  scene.talk.state.parts.forEach((key) => said.add(key));
  console.log(
    `${scene.talk.state.speaker}: ${scene.talk.state.text}   <${scene.talk.state.parts.join(" + ")}>`,
  );
  printTree(scene.talk.tree, "  ");
  // Written back: a request answered with a yes enlists the relative; a
  // put-off strains the tie.
  const all = paths(scene.talk.tree);
  const yes = all.find(
    (path) =>
      scene.talk.tree.replies[path[0]!]?.line.move === "request" &&
      reach(scene.talk.tree, path.slice(0, 1))?.lines.some(
        (row) => row.role === "asker" && row.move === "promise",
      ),
  );
  if (yes) {
    const id = replyInScene(
      core,
      director,
      person.id as PersonId,
      entry,
      yes.slice(0, 1),
      {
        typeKey: "family-filing",
      },
    );
    const volunteers = campaignFor(api, filingId).volunteerIds;
    console.log(
      `   WRITTEN request answered yes: ${id}; ${scene.askerId} a volunteer on ${filingId}: ${volunteers.includes(scene.askerId)}`,
    );
  }
  const putOff = all.find(
    (path) =>
      scene.talk.tree.replies[path[0]!]?.line.move === "deflect" &&
      reach(scene.talk.tree, path)?.end?.ending?.keeps ===
        "relationship-strained",
  );
  if (putOff) {
    const before = closenessBetween(core, scene.askedId, scene.askerId);
    const id = replyInScene(
      core,
      director,
      person.id as PersonId,
      entry,
      putOff,
      {
        typeKey: "family-filing",
      },
    );
    console.log(
      `   WRITTEN put off: ${id}; tie ${before.toFixed(6)} to ${closenessBetween(core, scene.askedId, scene.askerId).toFixed(6)}`,
    );
  }
}
if (saidFile) writeFileSync(saidFile, [...said].sort().join("\n") + "\n");
console.log(`\n# DONE ${where}: ${cases.map((row) => row.kind).join(", ")}`);
