/**
 * The press in one year of the played world (OPUS-PEOPLE, Oct 14): builds the
 * town as the player gets it (buildBenchWorld, two-level, every module), runs
 * a game year, and prints the record ids the press PR's proof names: a named
 * reporter and the stories they chose with why, a law printed and known to
 * someone in the player's circle as bring-it-up reads it, an interview two
 * outlets printed differently, and the views the print moved.
 *
 * The seed is random unless PRESS_PROOF_SEED is set; draws that open with
 * fewer than two outlets are skipped and counted.
 * Run: node --max-old-space-size=8192 --import tsx scripts/press/proof.ts
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { drawPlace } from "../core2-year/place";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/simulation/dates";
import {
  followersOf,
  interviewsFor,
  outletsHere,
  storiesPrinted,
  PRESS_MODULE_ID,
  type InterviewRow,
} from "../../src/core2/modules/press";
import type { PrintedStory } from "../../src/core2/press-desk";
import { stancesOf } from "../../src/core2/modules/views";
import { ELECTIONS_MODULE_ID } from "../../src/core2/modules/elections";
import {
  BRING_IT_UP_DATA,
  believedCause,
  changesKnownTo,
} from "../../src/director/bring-it-up";
import type { CoreState } from "../../src/core2/types";

setBookkeeping(false);
const start = gameStartDate();
const end = addDays(makeIsoDate(start), 365);
const name = (core: CoreState, id: string | null | undefined) => {
  const p = id ? core.people.get(id) : undefined;
  return p ? `${p.givenName} ${p.familyName}` : String(id);
};
/** The change row a printed story needs in bring-it-up's data (words session). */
const PRINTED_ROW = {
  eventKind: "news.read",
  institutionFact: { prefix: "printed:", suffix: ":story" },
  line: [],
};
const data = {
  ...BRING_IT_UP_DATA,
  changes: [PRINTED_ROW, ...BRING_IT_UP_DATA.changes],
};

let draws = 0;
for (;;) {
  draws += 1;
  const seed =
    (draws === 1 && process.env.PRESS_PROOF_SEED) ||
    randomBytes(20).toString("hex");
  const place = drawPlace(seed, "played-world");
  const t0 = Date.now();
  const world = buildBenchWorld(place.seed, start, {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  const outlets = outletsHere(api);
  const contests = (
    api.moduleState(ELECTIONS_MODULE_ID).table("contests").rows() as unknown as {
      id: string;
      electionDate: string;
    }[]
  ).filter((c) => c.electionDate <= end);
  console.log(
    `draw ${draws}: seed ${seed}, place ${place.key} (${world.place.displayName}), ${outlets.length} outlets, ${contests.length} contests on record at the opening`,
  );
  // Races are opened through the year, so only the outlets are checked here.
  if (outlets.length < 2) continue;
  const buildSeconds = (Date.now() - t0) / 1000;
  console.log(`\n## World\nseed ${seed}\nplace ${place.key}, ${world.place.displayName}`);
  for (const o of outlets) {
    const org = core.organizations.get(o.organizationId)!;
    console.log(
      `- ${org.name} (${o.kind}, ${o.id}): lean ${o.lean.toFixed(2)}, ${followersOf(api, o.id).length} full followers, revenue ${o.audienceRevenueMinor} minor a year`,
    );
    for (const id of [o.headId, ...o.reporterIds]) {
      const p = core.people.get(id!)!;
      const job = p.jobId ? core.jobs.get(p.jobId) : undefined;
      console.log(
        `  - ${name(core, id)} (${id}), born ${p.birthDate}, ${job?.title} at ${job?.hourlyMinor} minor an hour (${job?.id})`,
      );
    }
  }
  // Day by day: the first time someone in the player's circle knows a
  // printed law story as the newest change they would bring up.
  const playerId = world.playerId!;
  const circle = () => {
    const player = core.people.get(playerId)!;
    const home = core.households.get(player.householdId)?.memberIds ?? [];
    return [...new Set([...player.knownIds, ...home])].filter(
      (id) => id !== playerId && core.people.get(id)?.alive,
    );
  };
  let broughtUp: string | null = null;
  const t1 = Date.now();
  for (let day = core.date; day < end; ) {
    day = addDays(makeIsoDate(day), 1);
    advanceCore(core, day);
    if (broughtUp) continue;
    for (const id of circle()) {
      const change = changesKnownTo(core, id, data as never)[0];
      if (!change || change.kind !== "news.read") continue;
      const storyId = core.knowledgeByPerson
        .get(id)
        ?.get(`printed:${change.institutionId}:story`)?.value;
      const story = storyId
        ? (api.moduleState(PRESS_MODULE_ID).table("stories").get(storyId) as unknown as
            PrintedStory | undefined)
        : undefined;
      if (!story || !["law-took-effect", "legislative-vote", "vote-recorded"].includes(story.kind))
        continue;
      const cause = believedCause(core, id, change, data as never);
      broughtUp = `${core.date}: ${name(core, id)} (${id}), in the player's circle, would bring up ${story.id} (${story.kind}, topic ${story.topic}, ${story.ending ? "an ending" : "a change"} printed by ${core.organizations.get(story.organizationId)?.name}); learned from ${change.eventId}; belief ${cause.how}${cause.blamedId ? ` on ${cause.blamedId}` : ""}`;
      break;
    }
  }
  const runSeconds = (Date.now() - t1) / 1000;
  const all = outlets.flatMap((o) => storiesPrinted(api, o.id));
  console.log(`\n## Stories\n${all.length} printed in the year (build ${buildSeconds.toFixed(0)} s, year ${runSeconds.toFixed(0)} s)`);
  const byReporter = new Map<string, PrintedStory[]>();
  for (const s of all) byReporter.set(s.reporterId, [...(byReporter.get(s.reporterId) ?? []), s]);
  const [reporterId, theirs] = [...byReporter].sort((a, b) => b[1].length - a[1].length)[0]!;
  console.log(`Reporter ${name(core, reporterId)} (${reporterId}) filed ${theirs.length}. Three of them:`);
  const picks = theirs.filter((s) => s.pick).slice(0, 40);
  const varied = [...new Map(picks.map((s) => [s.kind, s])).values()].slice(0, 3);
  for (const s of varied.length >= 3 ? varied : picks.slice(0, 3))
    console.log(
      `- ${s.id}: ${s.kind} on ${s.topic}, ${s.date}; picked ${s.pick!.rank} of ${s.pick!.weighed} (score ${s.pick!.score.toFixed(2)}: proximity ${s.pick!.proximity}, readers' care ${s.pick!.readerCare.toFixed(2)}, people ${s.pick!.people.toFixed(2)}, own drives ${s.pick!.drive.toFixed(2)}); slant ${s.slant.toFixed(2)} (lean ${s.slantReasons.lean.toFixed(2)}, tie ${s.slantReasons.tie.toFixed(2)}, publisher ${s.slantReasons.publisher.toFixed(2)}, ads ${s.slantReasons.advertiser.toFixed(2)}); argued ${s.desiredChange}; ${s.readers} readers`,
    );
  const laws = all.filter((s) => s.kind === "law-took-effect");
  console.log(`\n## Laws\n${laws.length} law stories printed; ${laws.filter((s) => s.ending).length} were endings.`);
  for (const s of laws.slice(0, 3)) console.log(`- ${s.id}: topic ${s.topic}, ${s.ending ? "ending" : "enacted"}, slant ${s.slant.toFixed(2)}`);
  console.log(`Brought up: ${broughtUp ?? "no one in the player's circle had a printed law as their newest change"}`);
  // Interviews: a candidate two outlets printed.
  const interviews = (api.moduleState(PRESS_MODULE_ID).table("interviews").rows() as unknown as InterviewRow[]).filter((i) => i.status === "published" && i.storyId);
  const byCandidate = new Map<string, InterviewRow[]>();
  for (const i of interviews) byCandidate.set(i.candidateId, [...(byCandidate.get(i.candidateId) ?? []), i]);
  const pair = [...byCandidate].find(([, rows]) => new Set(rows.map((r) => r.outletId)).size >= 2);
  console.log(`\n## Interviews\n${interviews.length} printed; ${(api.moduleState(PRESS_MODULE_ID).table("interviews").rows() as unknown as InterviewRow[]).filter((i) => i.reason === "candidate-declined").length} refused.`);
  const stories = new Map(all.map((s) => [s.id, s]));
  const movedBy = (storyId: string) => {
    let n = 0;
    let sum = 0;
    for (const p of core.people.values())
      for (const st of stancesOf(api, p.id))
        for (const c of st.causes)
          if (c.eventId.startsWith(`news.read:${storyId}:`)) {
            n += 1;
            sum += c.change;
          }
    return { n, sum };
  };
  if (pair) {
    const [candidateId, rows] = pair;
    console.log(`Candidate ${name(core, candidateId)} (${candidateId}), interviews:`);
    for (const r of rows.slice(0, 3)) {
      const s = stories.get(r.storyId!)!;
      const moved = movedBy(s.id);
      console.log(
        `- ${r.id} by ${name(core, r.reporterId)} for ${core.organizations.get(s.organizationId)?.name} (lean ${outlets.find((o) => o.id === r.outletId)?.lean.toFixed(2)}): questions ${r.questions.join(", ")}; answered ${r.answers.map((a) => `${a.question}=${a.position}/${a.move}`).join(", ")}; story ${s.id} slant ${s.slant.toFixed(2)} (lean ${s.slantReasons.lean.toFixed(2)}, tie ${s.slantReasons.tie.toFixed(2)}, publisher ${s.slantReasons.publisher.toFixed(2)}, ads ${s.slantReasons.advertiser.toFixed(2)}) argued ${s.desiredChange} on ${s.topic}; ${r.audience} campaign causes; ${moved.n} stances moved by its reading`,
      );
    }
  } else console.log("No candidate was printed by two outlets.");
  // Views moved by print.
  let moved = 0;
  const people = new Set<string>();
  const examples: string[] = [];
  for (const p of core.people.values())
    for (const st of stancesOf(api, p.id))
      for (const c of st.causes)
        if (c.eventId.startsWith("news.read:")) {
          moved += 1;
          people.add(p.id);
          if (examples.length < 3)
            examples.push(`${name(core, p.id)} (${p.id}): ${st.topic} toward ${st.desiredChange} by ${c.change.toFixed(3)} from ${c.eventId}`);
        }
  console.log(`\n## Views\n${moved} stance changes in ${people.size} people came from reading a printed story.`);
  for (const e of examples) console.log(`- ${e}`);
  console.log(`\n## Money\n${outlets.map((o) => `${core.organizations.get(o.organizationId)?.name} holds ${core.organizations.get(o.organizationId)?.liquidMinor} minor`).join("; ")}`);
  console.log(`Staff: ${outlets.flatMap((o) => [o.headId, ...o.reporterIds]).map((id) => `${name(core, id)} ${core.people.get(id!)?.liquidMinor}`).join("; ")}`);
  console.log(`\n${draws} draw(s).`);
  break;
}
