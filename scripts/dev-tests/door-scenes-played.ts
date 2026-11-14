/**
 * Door scenes as played (brief G): draws a place, files the player for a local
 * race, knocks doors for some days while the petition circulates and some
 * days after it closes, and plays every door the canvass reached through the
 * one scene builder (purposeScene), whole, with who speaks. The director
 * stages at most one porch scene in a few outings; to read every scene type,
 * each door the day opened is given the door moment and binding the director
 * would give it (cause campaign.door, the resident and the player, at the
 * resident's home), so each resident's own records pick the scene. Prints
 * markdown.
 *
 *   node --import tsx scripts/dev-tests/door-scenes-played.ts <seed> <places> [signDays] [voteDays]
 */
import { campaignDay } from "../../src/bench/campaign";
import { buildBenchWorld } from "../../src/bench/world";
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../../src/core2/campaign-data";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  fileCandidacy,
  openContests,
  petitionCirculating,
} from "../../src/core2/modules/elections";
import { townSeats } from "../../src/core2/modules/offices";
import { P } from "../../src/core2/parameters";
import { corePlaceByKey } from "../../src/core2/place-lookup";
import { advancePlayerV1, resumePlayerV1 } from "../../src/core2/player-v1";
import { coreAPI } from "../../src/core2/state";
import type { CoreState, PersonId } from "../../src/core2/types";
import { doorsKnocked, petitionAtDoor } from "../../src/director/doors";
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";
import type { ScheduleEntry } from "../../src/director/scheduling";

const [seed = "door-played", placesArg = "3", signArg = "4", voteArg = "4"] =
  process.argv.slice(2);

function fileLocal(core: CoreState, personId: string) {
  const api = coreAPI(core);
  if (townSeats(api).some((s) => s.holder?.personId === personId)) return null;
  for (const contest of openContests(api)) {
    if (contest.level === "federal" || contest.level === "state") continue;
    const filed = fileCandidacy(api, {
      personId,
      contestId: contest.id,
      platform: [`${PLATFORM_QUESTIONS[0]}=1`],
    });
    if (
      filed.status !== "refused" &&
      ["petitioning", "on-ballot"].includes(filed.filing.status ?? "")
    )
      return filed.filing;
  }
  return null;
}

function tree(node: TreeNode, depth: number, out: string[]) {
  for (const line of node.lines)
    out.push(`${"  ".repeat(depth)}- **${line.speaker}:** ${line.text}`);
  if (node.end?.close)
    out.push(
      `${"  ".repeat(depth)}- **${node.end.close.speaker}:** ${node.end.close.text}`,
    );
  if (node.end?.ending)
    out.push(
      `${"  ".repeat(depth)}- _ends: ${node.end.ending.label} (keeps ${node.end.ending.keeps})_`,
    );
  for (const reply of node.replies) {
    out.push(
      `${"  ".repeat(depth)}- choice **${reply.line.speaker}:** ${reply.line.text}`,
    );
    if (reply.next) tree(reply.next, depth + 1, out);
  }
}

setBookkeeping(false);
const out: string[] = [];
let drawn = 0;
for (let attempt = 0; drawn < Number(placesArg) && attempt < 12; attempt += 1) {
  const place = drawPlace(seed, `door-played:${attempt}`);
  const where = `${place.name} (${place.key}), place seed ${place.seed}`;
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const local = () =>
    openContests(coreAPI(core)).some(
      (row) => row.level !== "federal" && row.level !== "state",
    );
  for (let week = 0; week < 52 && !local(); week += 1)
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  const start = makeIsoDate(core.date);
  const town = corePlaceByKey(place.key)?.context.jurisdiction.id;
  const adults = [...core.people.values()]
    .filter(
      (row) =>
        row.alive &&
        row.placeId === town &&
        row.tier !== "husk" &&
        ageOnDate(makeIsoDate(row.birthDate), start) >= 35,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  let filing: ReturnType<typeof fileLocal> = null;
  let playerId: PersonId | undefined;
  for (const row of adults.slice(0, 60)) {
    core.playerId = row.id;
    filing = fileLocal(core, row.id);
    if (filing) {
      playerId = row.id;
      break;
    }
  }
  if (!filing || !playerId) {
    out.push(`Passed over ${where}: no local race to file for by ${start}.\n`);
    continue;
  }
  drawn += 1;
  core.focusPersonIds.add(playerId);
  director.watch(core, playerId);
  const book = director.ledger.people.get(playerId)!;
  const player = core.people.get(playerId)!;
  out.push(
    `## ${where}\n\nRun seed ${seed}. Player ${player.givenName} ${player.familyName} (${playerId}), filing ${filing.id}, filed ${start}.\n`,
  );
  const clockTo = (date: string) => {
    let packet = advancePlayerV1(core, {
      controlledPersonId: playerId!,
      through: { date: addDays(makeIsoDate(date), 1), minuteOfDay: P.zero },
    });
    let i = 0;
    for (; i < 400 && packet.kind !== "complete"; i += 1)
      packet = resumePlayerV1(core, {
        kind: packet.kind === "stop" ? "stop" : "own-choice",
        pauseId: packet.pauseId,
      } as never);
    process.stderr.write(
      `clock to ${date}: at ${core.date}, ${packet.kind} after ${i}\n`,
    );
  };
  const played = new Set<string>();
  const playDay = (kind: string) => {
    campaignDay(core, playerId!, { filingId: filing!.id, kind: "canvass" });
    const records = doorsKnocked(core, playerId!);
    const day = core.date;
    // Let the director see the day's doors (it schedules at most one).
    clockTo(addDays(makeIsoDate(core.date), 1));
    out.push(`### ${kind} day, ${day}: ${records.length} doors opened\n`);
    let scenes = 0;
    for (const record of records) {
      if (played.has(record.id)) continue;
      played.add(record.id);
      const residentId = record.personIds[0]!;
      const petition = petitionAtDoor(core, playerId!, residentId);
      const label = petition
        ? "circumstance:door-petition"
        : record.facts?.first === "false"
          ? "circumstance:door-again"
          : "circumstance:door-first";
      const momentId = `played:${record.id}`;
      const date = makeIsoDate(day);
      book.momentsById.set(momentId, {
        id: momentId,
        personId: playerId!,
        date,
        label,
        causeId: record.id,
        causeKind: "event:campaign.door",
        counterpartIds: [residentId],
        impact: 1,
        channels: [],
        hindsight: 1,
        hindsightAt: date,
        echoes: [],
      });
      const entry: ScheduleEntry = {
        momentId,
        date,
        outcome: "scene-now",
        mode: "scene",
        interrupt: false,
        stopsSkip: false,
        rank: 0,
        pace: 0,
        bindings: [
          {
            typeKey: petition ? "door-signature" : "door-ask",
            roles: [
              { role: "resident", personIds: [residentId] },
              { role: "you", personIds: [playerId!] },
            ],
            presentIds: [residentId, playerId!],
            presentReasons: {},
            setting: {
              kind: "other-home",
              recordId: core.people.get(residentId)!.householdId,
            },
            timing: "at-cause",
            opener: "you",
            reason: "canvass",
            openUntil: date,
          },
        ],
      };
      const result = purposeScene(core, director, playerId!, entry);
      if (result?.kind !== "composed") {
        out.push(
          `- door ${record.id}: skipped (${result && "reason" in result ? result.reason : "no scene"})\n`,
        );
        continue;
      }
      const { scene } = result;
      scenes += 1;
      const variant = scene.variant;
      out.push(
        `#### ${scene.purpose}${record.facts?.first === "false" ? ", second knock" : ""}\n\nResident ${residentId}; door ${record.id}; ${petition ? `signed ${petition.signed}` : "vote ask"}; variant ${variant?.variant ?? "none"}${
          variant
            ? `, reads ${JSON.stringify(
                Object.fromEntries(
                  Object.entries(variant.reads)
                    .filter(([, v]) => v > 0)
                    .map(([k, v]) => [k, Number(v.toFixed(2))]),
                ),
              )}, records ${variant.recordIds.join(", ")}`
            : ""
        }.\n`,
      );
      const lines: string[] = [];
      for (const line of scene.talk.narration) lines.push(`- _${line.text}_`);
      lines.push(`- **${scene.talk.state.speaker}:** ${scene.talk.state.text}`);
      tree(scene.talk.tree, 0, lines);
      out.push(lines.join("\n") + "\n");
    }
    if (!scenes) out.push("No scene this day.\n");
  };
  for (let day = 0; day < Number(signArg); day += 1) playDay("Signature");
  // Past the petition: the weeks go by until it no longer circulates.
  for (
    let week = 0;
    week < 30 && petitionCirculating(coreAPI(core), filing.id);
    week += 1
  )
    clockTo(addDays(makeIsoDate(core.date), 7));
  for (let day = 0; day < Number(voteArg); day += 1) playDay("Vote");
}
process.stdout.write(out.join("\n"));
