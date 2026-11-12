/**
 * Election day and night as scenes (words-election-day-and-night-scenes; the
 * owner's Oct 26 rulings), in a played world: a place drawn from all 56
 * (buildBenchWorld, every module), a player who files for the soonest race
 * they may enter and plays to election day through the bench player. The
 * morning offers a canvass and the choice to vote; staying home casts no
 * ballot; that night the returns come in place by place to the call, citing
 * the count's record; and the scene that follows (a concession call or the
 * victory night) writes the player's reply as a record the journal reads.
 * Seed from GOLDEN_PATH_SEED (random when unset), printed with the place.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { EntityId } from "../core2/kernel/brands";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import {
  ELECTIONS_MODULE_ID,
  playerContests,
} from "../core2/modules/elections";
import { ballotOf, pollingPlaceOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { composeJournal } from "../director/journal";
import { campaignDay } from "./campaign";
import {
  canvassedLine,
  electionDay,
  electionNight,
  stayedHomeLine,
} from "./election-night";
import { fileForOffice } from "./government";
import { BenchPlayer } from "./player";
import { storyReply } from "./story";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(8).toString("hex");

it("election morning offers a canvass and the vote, staying home casts nothing, and the night's returns end in a scene that writes back", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 8; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "election-day");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director, playerId } = world;
    const api = coreAPI(core);
    const born = core.people.get(playerId!)!.birthDate;
    const md = born.slice(5) === "02-29" ? "03-01" : born.slice(5);
    const eighteen = makeIsoDate(`${Number(born.slice(0, 4)) + 18}-${md}`);
    if (eighteen > core.date) advanceCore(core, eighteen);
    // Every race opens its filing on a real day, so on the birthday most
    // places have none open yet, and the first to open may refuse an
    // 18-year-old (age for governor or Congress). The world runs a week at a
    // time, at most 60 weeks, until a race on the clerk's list takes the
    // player's filing, as the game offers it then.
    let weeksWaited = 0;
    const refused = new Map<string, string>();
    let filed: ReturnType<typeof playerContests>[number] | undefined;
    for (;;) {
      for (const contest of [...playerContests(api)].sort(
        (a, b) =>
          a.electionDate.localeCompare(b.electionDate) ||
          a.id.localeCompare(b.id),
      )) {
        const result = fileForOffice(core, playerId!, contest.id) as {
          status?: string;
          filing?: { status?: string };
          unmet?: readonly { rule: string }[];
        };
        if (
          ["petitioning", "on-ballot"].includes(result.filing?.status ?? "")
        ) {
          filed = contest;
          break;
        }
        refused.set(
          contest.id,
          (result.unmet ?? []).map((check) => check.rule).join("+") ||
            String(result.status),
        );
      }
      if (filed || weeksWaited >= 60) break;
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      weeksWaited += 1;
    }
    if (!filed) {
      tried.push(
        `${where}: no race took the player's filing after ${weeksWaited} weeks (reached ${core.date}); refused: ${
          [...refused].map(([id, rule]) => `${id} (${rule})`).join(", ") ||
          "none open"
        }`,
      );
      continue;
    }
    // Filing is a petition: the player canvasses for signatures until it
    // holds what the clerk counts, and the clerk checks it.
    const filingId = `filing:${filed.id}:${playerId}`;
    gatherSignatures(core, filingId);
    const status = (
      api.moduleState(ELECTIONS_MODULE_ID).table("filings").get(filingId) as
        { status?: string } | undefined
    )?.status;
    if (status !== "on-ballot") {
      tried.push(`${where}: the petition for ${filed.id} came up ${status}`);
      continue;
    }
    // The world runs to the week before; the player lives the last days.
    const eve = addDays(makeIsoDate(filed.electionDate), -1);
    const before = addDays(eve, -6);
    if (before > core.date) advanceCore(core, before);
    const player = new BenchPlayer(core, director!);
    director!.watch(core, playerId!);
    player.select(playerId!);
    for (let step = 0; step < 40 && !player.pollingPlace; step += 1) {
      player.advance("day");
      while (player.packet?.kind === "stop")
        player.resume({ kind: "stop", pauseId: player.packet.pauseId });
    }
    const visit = player.pollingPlace;
    if (!visit) {
      tried.push(`${where}: election morning never came for ${filed.id}`);
      continue;
    }
    console.log(
      `election-day: ${where}, waited ${weeksWaited} weeks (to ${core.date}), race ${filed.id}`,
    );

    // Election morning: the narrator, the canvass for a candidate, the ask.
    const day = electionDay(core, playerId!, visit, false);
    expect(day.lines.length, where).toBeGreaterThan(0);
    expect(
      day.lines.some((line) => line.sourceRecordIds.includes(filed.id)),
      `${where}: the morning cites ${filed.id}`,
    ).toBe(true);
    // The morning says where the voter votes, from the voting engine's
    // polling place record: its building by name, the precinct where the town
    // has several, and one of the people working it.
    expect(visit.pollingPlaceId, `${where}: a polling place`).toBeTruthy();
    const polls = pollingPlaceOf(api, playerId!, visit.record.electionDate)!;
    const building = core.organizations.get(polls.buildingId as EntityId);
    if (building) {
      const where_ = day.lines.find((line) =>
        line.text.includes(building.name),
      );
      expect(
        where_,
        `${where}: the morning names ${building.name}`,
      ).toBeTruthy();
      expect(where_!.sourceRecordIds, where).toContain(polls.id);
    }
    if (polls.precincts > 1)
      expect(
        day.lines.some((line) =>
          line.text.includes(`precinct ${polls.precinct}`),
        ),
        `${where}: the morning names precinct ${polls.precinct}`,
      ).toBe(true);
    console.log(
      `election-day: polling place ${polls.id} (precinct ${polls.precinct} of ${polls.precincts}), "${day.lines.map((l) => l.text).join(" ")}"`,
    );
    expect(day.canvass, `${where}: a candidate canvasses`).not.toBeNull();
    expect(day.ask.length, where).toBeGreaterThan(0);
    // The same morning for the same person with no polling visit (they live outside the town
    // the count reads): nothing is asked, and the day goes on to the count.
    const away = electionDay(
      core,
      playerId!,
      null,
      false,
      visit.record.electionDate,
    );
    expect(away.away, where).toBe(true);
    expect(
      away.ask,
      `${where}: a vote is offered to someone who cannot vote`,
    ).toEqual([]);
    const canvass = campaignDay(core, playerId!, {
      filingId: day.canvass!.filingId,
      kind: "canvass",
    });
    const canvassed = canvassedLine(
      core,
      playerId!,
      visit.record.electionDate,
      day.canvass!.filingId,
      canvass,
    );
    expect(canvassed?.text, where).toBeTruthy();
    console.log(
      `election-day: morning "${day.lines.map((l) => l.text).join(" ")}" / canvass "${canvassed?.text}" (${canvass.doorsKnocked} doors) / ask "${day.ask[0]?.text}"`,
    );

    // Staying home: no ballot cast for the player.
    const home = stayedHomeLine(
      core,
      playerId!,
      visit.record.electionDate,
      visit.record.contestIds,
    );
    player.leavePolls();
    expect(home?.text, where).toBeTruthy();
    // Day lands on election morning (days start in the morning, owner Oct
    // 27); the count runs when the polls close, at the day's end on the
    // player's clock, so the player lives election day through to the next
    // morning before the returns exist.
    player.advance("day");
    while (player.packet?.kind === "stop")
      player.resume({ kind: "stop", pauseId: player.packet.pauseId });
    expect(core.date, `${where}: election morning`).toBe(filed.electionDate);
    player.advance("day");
    while (player.packet?.kind === "stop")
      player.resume({ kind: "stop", pauseId: player.packet.pauseId });
    // The voting engine's own ballot record for the player: kept at the
    // count, not cast.
    const ballot = ballotOf(api, filed.id, playerId!);
    expect(
      ballot,
      `${where}: the count kept the player's ballot`,
    ).not.toBeNull();
    expect(ballot!.voted, `${where}: stayed home`).toBe(false);

    // Election night: the returns place by place to the call.
    const night = electionNight(core, playerId!);
    expect(night, `${where}: the night is the player's`).not.toBeNull();
    expect(night!.contestId, where).toBe(filed.id);
    expect(night!.date, `${where}: the night of the count`).toBe(
      filed.electionDate,
    );
    console.log(
      `election-day: night read ${night!.recordId} and ballot ${ballot!.id}`,
    );
    expect(core.durableLog.has(night!.recordId as EntityId), where).toBe(true);
    expect(night!.steps.length, where).toBeGreaterThanOrEqual(2);
    const call = night!.steps.at(-1)!;
    expect(
      call.lines.some((line) => line.sourceRecordIds.includes(night!.recordId)),
      `${where}: the call cites ${night!.recordId}`,
    ).toBe(true);
    console.log(
      `election-day: night ${night!.steps.length} steps; ${night!.steps
        .flatMap((s) => s.lines.map((l) => l.text))
        .slice(0, 4)
        .join(" / ")} … ${call.lines.map((l) => l.text).join(" ")}`,
    );

    // The scene after the call: a concession call or the victory night.
    const scene = director!.ledger.people
      .get(playerId!)
      ?.schedule.find((entry) =>
        entry.bindings.some(
          (binding) =>
            (binding.typeKey === "race-lost" ||
              binding.typeKey === "race-won") &&
            binding.setting.recordId !== undefined,
        ),
      );
    expect(scene, `${where}: a concession or victory scene`).toBeDefined();
    const reply = storyReply(core, director!, playerId!, scene!.momentId, [0]);
    expect(core.durableLog.has(reply.recordId as EntityId), where).toBe(true);
    const journal = composeJournal(
      core,
      director!,
      playerId! as PersonId,
    ).flatMap((chapter) => chapter.lines);
    expect(
      journal.some((line) =>
        (line.sourceRecordIds ?? []).includes(night!.recordId),
      ),
      `${where}: the journal tells the race`,
    ).toBe(true);
    console.log(
      `election-day: ${night!.mine?.won ? "won" : "lost"}; scene ${scene!.bindings[0]!.typeKey} reply ${reply.recordId}`,
    );
    return;
  }
  throw new Error(`No draw reached election day:\n${tried.join("\n")}`);
}, 1_800_000);
