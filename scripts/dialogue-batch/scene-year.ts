/**
 * A year of the player's household in the played world, with every scene the
 * director fired and the record that caused it (owner, Oct 14, 2026, night:
 * scenes fire from the household's and the player's records; a quiet day
 * fires nothing). Development tooling for the PR's proof; shipped play never
 * imports it.
 *
 *   node --import tsx scripts/dialogue-batch/scene-year.ts --seed <seed> [--days 365] [--out file.json]
 *
 * The place is drawn from all 56 by the seed; the world is the bench's
 * (`buildBenchWorld`, two-level). Each day the core advances; each new entry
 * on the player's schedule that stages a scene is composed on its own day
 * (`composeScene`), with the talk it hands off to (`openConversation`, with
 * the director's ledger). Nothing here words anything: it records what the
 * director returned.
 */
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import type { CoreState, PersonId } from "../../src/core2/types";
import {
  CONVERSATION_DATA,
  openConversation,
  say,
} from "../../src/director/conversation";
import { composeScene } from "../../src/director/scene";
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";
import { reachReport } from "../../src/director/reach";
import { SITUATION_LIBRARY } from "../../src/director/scheduling";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { drawPlace } from "../core2-year/place";
import { OPENING_DATE } from "./play-lives";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "scene-year");
const days = Number(option("days", "365"));
const out = option("out", "");

const nameOf = (core: CoreState, id: string) => {
  const row = core.people.get(id as PersonId);
  return row ? `${row.givenName} ${row.familyName}` : id;
};

const place = drawPlace(seed, "scene-year");
setBookkeeping(false); // play runs without the debug checks (AGENTS.md)
const world = buildBenchWorld(place.seed, OPENING_DATE, {
  twoLevel: true,
  placeKey: place.key,
});
const { core, director } = world;
const playerId = world.playerId!;
const player = core.people.get(playerId)!;
const household = core.households.get(player.householdId);
const membersAt = () =>
  (core.households.get(player.householdId)?.memberIds ?? []).map((id) => {
    const row = core.people.get(id)!;
    const job = row.jobId ? core.jobs.get(row.jobId) : undefined;
    const org = job ? core.organizations.get(job.organizationId) : undefined;
    return {
      id,
      name: nameOf(core, id),
      age: ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(core.date)),
      alive: row.alive,
      job: org ? `${org.name} (${job!.id})` : null,
      liquidMinor: row.liquidMinor,
    };
  });
const report = {
  seed,
  place: { name: place.name, key: place.key, seed: place.seed },
  playerId,
  player: nameOf(core, playerId),
  householdId: player.householdId,
  householdAtStart: membersAt(),
  householdAtEnd: [] as ReturnType<typeof membersAt>,
  days,
  quietDays: 0,
  scenes: [] as unknown[],
  /** Every moment the year recorded for the player, and what it became. */
  moments: [] as unknown[],
  /** Every situation type: the scenes it fired from a cause record, or why not. */
  reach: [] as ReturnType<typeof reachReport>,
};
// Watched as the bench watches a chosen resident: the player and their
// household (src/bench/player.ts, select).
for (const id of household?.memberIds ?? [playerId])
  if (core.people.get(id)?.alive) director.watch(core, id);
const book = () => director.ledger.people.get(playerId);
let seen = book()?.schedule.length ?? 0;
for (let day = 0; day < days; day += 1) {
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const schedule = book()?.schedule ?? [];
  const fresh = schedule.slice(seen);
  seen = schedule.length;
  for (const entry of fresh) {
    const moment = book()!.momentsById.get(entry.momentId)!;
    report.moments.push({
      date: moment.date,
      label: moment.label,
      impact: Number(moment.impact.toFixed(3)),
      causeId: moment.causeId,
      outcome: entry.outcome,
      counterparts: moment.counterpartIds.map((id) => nameOf(core, id)),
    });
  }
  const staged = fresh.filter((entry) => entry.outcome !== "journal-line");
  if (!staged.length) report.quietDays += 1;
  for (const entry of staged) {
    const moment = book()!.momentsById.get(entry.momentId)!;
    const scene = composeScene(core, director, playerId, entry);
    // A scene with a purpose: its narration, open and statement, and every
    // line of its tree, each reply followed by what the asker says back.
    const purpose = purposeScene(core, director, playerId, entry);
    const exchange =
      purpose?.kind === "composed"
        ? (() => {
            const talk = purpose.scene.talk;
            const lines: { role: string; text: string }[] = [
              ...talk.narration.map((l) => ({
                role: "narrator",
                text: l.text,
              })),
              ...(talk.open ? [{ role: "asker", text: talk.open.text }] : []),
              { role: "asker", text: talk.state.text },
            ];
            const unanswered: string[] = [];
            const walk = (node: TreeNode) => {
              for (const l of node.lines)
                lines.push({ role: "asker", text: l.text });
              if (node.end?.close)
                lines.push({ role: "asker", text: node.end.close.text });
              for (const reply of node.replies) {
                lines.push({ role: "player", text: reply.line.text });
                if (!reply.next) unanswered.push(reply.line.text);
                else walk(reply.next);
              }
            };
            walk(talk.tree);
            return {
              typeKey: purpose.scene.typeKey,
              askerId: purpose.scene.askerId,
              lines,
              unanswered,
            };
          })()
        : null;
    const talk = scene?.talkToId
      ? openConversation(core, playerId, scene.talkToId, {
          presentIds: scene.presentIds,
          director,
          occasionId: entry.momentId,
        })
      : null;
    // Played through as a curious player would: asking for more when a
    // choice does, else the first offered reply, until the other person
    // closes the talk.
    const offered: string[][] = [];
    for (let turn = 0; talk && turn < 8 && talk.choices.length; turn += 1) {
      offered.push(talk.choices.map((choice) => choice.text));
      const kind = talk.lines.at(-1)?.kind ?? "";
      const asks = CONVERSATION_DATA.tells?.[kind] ?? {};
      const pick =
        talk.choices.find((choice) => asks[choice.move]) ?? talk.choices[0]!;
      say(core, talk, pick.key);
    }
    report.scenes.push({
      date: core.date,
      outcome: entry.outcome,
      interrupt: entry.interrupt,
      type: entry.bindings[0]?.typeKey ?? "unbound",
      moment: {
        id: moment.id,
        label: moment.label,
        impact: Number(moment.impact.toFixed(3)),
        causeId: moment.causeId,
        counterparts: moment.counterpartIds.map((id) => ({
          id,
          name: nameOf(core, id),
        })),
      },
      setting: scene?.setting,
      present: (scene?.presentIds ?? []).map((id) => nameOf(core, id)),
      exchange,
      narration: (scene?.narration ?? []).map((line) => ({
        text: line.text,
        sourceRecordIds: line.sourceRecordIds,
      })),
      talk: talk
        ? {
            with: nameOf(core, talk.otherId),
            topics: talk.topics,
            lines: talk.lines.map((line) => ({
              speaker: nameOf(core, line.speakerId),
              text: line.text,
              sourceRecordIds: line.sourceRecordIds,
            })),
            offered,
          }
        : null,
    });
  }
}
report.householdAtEnd = membersAt();
report.reach = reachReport(
  SITUATION_LIBRARY,
  (household?.memberIds ?? [playerId]).flatMap((id) => {
    const found = director.ledger.people.get(id);
    return found ? [found] : [];
  }),
  core,
);
const summary = `${report.scenes.length} scenes in ${days} days (${report.quietDays} quiet days) for ${report.player} in ${place.name} (seed ${seed}, household ${household?.id})`;
console.log(summary);
console.log(
  `moments: ${report.moments.length}; by label: ${JSON.stringify(
    (report.moments as { label: string }[]).reduce<Record<string, number>>(
      (all, row) => ({ ...all, [row.label]: (all[row.label] ?? 0) + 1 }),
      {},
    ),
  )}`,
);
for (const row of report.scenes as {
  date: string;
  outcome: string;
  type: string;
  moment: { label: string; causeId: string; counterparts: { name: string }[] };
  narration: { text: string }[];
  talk: { lines: { speaker: string; text: string }[] } | null;
}[]) {
  console.log(
    `- ${row.date} ${row.outcome} ${row.type}: ${row.moment.label} (${row.moment.causeId}) ${row.moment.counterparts.map((c) => c.name).join(", ")}`,
  );
  for (const line of row.narration) console.log(`    ${line.text}`);
  for (const line of row.talk?.lines ?? [])
    console.log(`    ${line.speaker}: ${line.text}`);
}
console.log("\nReach: each situation type, fired or why not");
for (const row of report.reach)
  console.log(
    row.fired.length
      ? `- ${row.typeKey}: fired ${row.fired.length}, from ${[...new Set(row.fired.map((f) => f.causeId))].join(", ")}`
      : `- ${row.typeKey}: did not fire; ${row.reason}`,
  );
if (out) writeFileSync(out, JSON.stringify(report, null, 2));
