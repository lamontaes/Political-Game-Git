/**
 * Plays a new adult who files for the race a rival filed in first, gives no
 * speech and holds no rally, and writes every scene a rival's paid message
 * opens for them (circumstances.json, rival-message; scene type
 * rally-opponent) into a played file headed with the sha. Development tooling;
 * shipped play never imports it.
 *
 *   node --import tsx scripts/words/rival-message-played.ts <out-file> [seed ...]
 *
 * With no seed it draws places from all 56 by `nice:<n>` until one plays a
 * rival's message (one hour at most) and names the pick and what it passed
 * over; with seeds it plays exactly those, so the same world can be played at
 * a commit before a change and at the one after.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";
import { campaignDay } from "../../src/bench/campaign";
import { fileForOffice } from "../../src/bench/government";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gatherSignatures } from "../../src/core2/campaign-petition-kit";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  ELECTIONS_MODULE_ID,
  playerContests,
  standing,
  type FilingRow,
} from "../../src/core2/modules/elections";
import { advancePlayerV1, resumePlayerV1 } from "../../src/core2/player-v1";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import { drawPlace } from "../core2-year/place";

const [out, ...given] = process.argv.slice(2);
if (!out)
  throw new Error("usage: rival-message-played.ts <out-file> [seed ...]");
const sha = execFileSync("git", ["rev-parse", "HEAD"]).toString().trim();
writeFileSync(out, `# A rival's message, played (head ${sha})\n\n`);
const deadline = Date.now() + 55 * 60_000;

/** One year as a new adult filed for a rival's race; the scenes a rival's message opened. */
function play(seed: string): { where: string; scenes: string[]; note: string } {
  const place = drawPlace(seed, "rival-message-played");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  setBookkeeping(false);
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const me = playerId as PersonId;
  const born = core.people.get(me)!.birthDate;
  const md = born.slice(5) === "02-29" ? "03-01" : born.slice(5);
  const eighteen = makeIsoDate(`${Number(born.slice(0, 4)) + 18}-${md}`);
  if (eighteen > core.date) advanceCore(core, eighteen);
  const api = coreAPI(core);
  const rivals = new Map<string, number>();
  for (const row of api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .rows() as unknown as FilingRow[])
    if (row.personId !== me)
      rivals.set(row.contestId, (rivals.get(row.contestId) ?? 0) + 1);
  const filed = [...playerContests(api)]
    .sort(
      (a, b) =>
        Number(rivals.has(b.id)) - Number(rivals.has(a.id)) ||
        a.electionDate.localeCompare(b.electionDate) ||
        a.id.localeCompare(b.id),
    )
    .find((contest) =>
      ["petitioning", "on-ballot"].includes(
        (
          fileForOffice(core, me, contest.id) as {
            filing?: { status?: string };
          }
        ).filing?.status ?? "",
      ),
    );
  if (!filed) return { where, scenes: [], note: "no race to file for" };
  gatherSignatures(core, `filing:${filed.id}:${me}`);
  core.focusPersonIds.add(me);
  director.watch(core, me);
  const book = director.ledger.people.get(me)!;
  const scenes: string[] = [];
  let canvassedOn: string | undefined;
  let packet: ReturnType<typeof advancePlayerV1> | undefined = advancePlayerV1(
    core,
    {
      controlledPersonId: me,
      through: { date: addDays(makeIsoDate(core.date), 365), minuteOfDay: 0 },
    },
  );
  while (packet && packet.kind !== "complete") {
    if (packet.kind === "stop") {
      if (!canvassedOn || addDays(makeIsoDate(canvassedOn), 7) <= core.date) {
        const filing = (
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("filings")
            .query("byPerson", [me]) as unknown as FilingRow[]
        ).find(
          (row) =>
            standing(row) &&
            (
              api
                .moduleState(ELECTIONS_MODULE_ID)
                .table("contests")
                .get(row.contestId) as unknown as { electionDate: string }
            )?.electionDate > core.date,
        );
        if (filing) {
          campaignDay(core, me, { filingId: filing.id, kind: "canvass" });
          canvassedOn = core.date;
        }
      }
      for (const stop of packet.stop.modules) {
        const entry = book.schedule.find(
          (row) => row.momentId === stop.recordId,
        );
        const moment = book.momentsById.get(stop.recordId);
        if (!entry || moment?.label !== "circumstance:rival-message") continue;
        const scene = purposeScene(core, director, me, entry, {
          includeHeld: true,
        });
        if (scene?.kind === "composed")
          scenes.push(
            `${moment.date}, record ${moment.causeId}: ${[...scene.scene.talk.narration, scene.scene.talk.state].map((line) => line.text).join(" / ")}`,
          );
      }
      packet = resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId });
    } else
      packet = resumePlayerV1(core, {
        kind: "choice",
        pauseId: packet.pauseId,
        offerId: packet.offers[0]!.offerId,
      });
  }
  return { where, scenes, note: "" };
}

const passed: string[] = [];
const seeds = given.length
  ? given
  : Array.from({ length: 400 }, (_, i) => `nice:${i + 1}`);
for (const seed of seeds) {
  if (Date.now() > deadline) break;
  const result = play(seed);
  if (!result.scenes.length) {
    passed.push(
      `${result.where}: ${result.note || "no rival message reached the player"}`,
    );
    continue;
  }
  appendFileSync(
    out,
    [
      `### ${result.where}: ${result.scenes.length} scene(s) from a rival's message; the player gave no speech and held no rally`,
      ...result.scenes.map((line) => `- ${line}`),
      "",
      `Passed over before this pick: ${passed.length ? passed.join("; ") : "none"}`,
      "",
    ].join("\n"),
  );
  process.stdout.write(`PICK ${seed}\n`);
  if (!given.length) break;
}
