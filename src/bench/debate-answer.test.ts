/**
 * A debate the outlet invited the player to: the campaign view lists it with
 * its questions, the player answers by position or passes, and the engine holds
 * it with both candidates' answers. A random place from all 56.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { coreAPI } from "../core2/state";
import { addDays, makeIsoDate, spokenDate } from "../core2/kernel/dates";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { debatesIn } from "../core2/modules/meetings";
import { lawChain } from "../core2/modules/laws";
import { campaignView, debateAnswer } from "./campaign";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`debate-answer:${Date.now()}`).digest("hex");

/**
 * How many weeks a place's world runs, a week at a time, until a race takes
 * two filings. Every race opens its filing on a real day (since Nov 4), so on
 * the start day most places have none open.
 */
const WEEKS = 60;

it("lists the invited debate for the player, who answers it, and it is held with both candidates", () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const place = drawPlace(`${runSeed}:${attempt}`, "debate-answer");
    const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}:${attempt}, place seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    // Filing refuses a resident of another town (residency), so the
    // candidates are the town's own people.
    const town = lawChain(api).townPlaceId;
    const adults = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.placeId === town &&
          Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
      )
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      );
    let pair: { you: FilingRow; rival: FilingRow } | undefined;
    // The world runs a week at a time until a race on the clerk's list takes
    // two of them; a race that refuses them does not end the wait.
    const refused = new Map<string, string>();
    let weeksWaited = 0;
    for (;;) {
      for (const contest of openContests(api)) {
        const filed: FilingRow[] = [];
        for (const p of adults.slice(0, 6)) {
          if (filed.length >= 2) break;
          const result = fileCandidacy(api, {
            personId: p.id,
            contestId: contest.id,
            platform: [],
          });
          if (
            result.status !== "refused" &&
            ["petitioning", "on-ballot"].includes(result.filing.status ?? "")
          )
            filed.push(result.filing);
          else
            refused.set(
              contest.id,
              result.status === "refused"
                ? result.unmet.map((check) => check.rule).join("+") || "refused"
                : String(result.filing.status),
            );
        }
        if (filed.length >= 2) {
          pair = { you: filed[0]!, rival: filed[1]! };
          break;
        }
      }
      if (pair || weeksWaited >= WEEKS) break;
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      weeksWaited += 1;
    }
    if (!pair) {
      tried.push(
        `${where}: no race took two filings after ${weeksWaited} weeks (reached ${core.date}); refused: ${
          [...refused].map(([id, rule]) => `${id} (${rule})`).join(", ") ||
          "none open"
        }`,
      );
      continue;
    }
    core.playerId = pair.you.personId;
    const contest = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .get(pair.you.contestId) as unknown as ContestRow;
    // Filing is a petition: the player gathers signatures, and the rival's
    // campaign gathers theirs, until the clerk's check.
    gatherSignatures(core, pair.you.id);
    const standing = (id: string) =>
      (
        api.moduleState(ELECTIONS_MODULE_ID).table("filings").get(id) as
          FilingRow | undefined
      )?.status === "on-ballot";
    if (!standing(pair.you.id) || !standing(pair.rival.id)) {
      tried.push(
        `${where}: ${pair.you.contestId} filed after ${weeksWaited} weeks, but the clerk's check left the player or the rival off the ballot`,
      );
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(contest.electionDate), -3));
    const view = campaignView(core, pair.you.personId).campaigns.find(
      (c) => c.filing.id === pair!.you.id,
    );
    const invited = view?.debates[0];
    if (!invited || !invited.questions.length) {
      tried.push(
        `${where}: ${contest.id} on the ballot after ${weeksWaited} weeks, but no outlet invited the player to a debate by ${core.date}`,
      );
      continue;
    }
    console.log(
      `debate-answer: ${where}, waited ${weeksWaited} weeks, race ${contest.id}`,
    );
    expect(debatesIn(api, contest.id)[0]!.status, where).toBe("invited");
    // The invitation's date reads in words, not as the record's ISO string.
    expect(invited.date, where).not.toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(invited.date, where).toBe(
      spokenDate(debatesIn(api, contest.id)[0]!.date),
    );

    // The player takes a position on the first question and passes on the rest.
    const answers = invited.questions.map((question, index) => ({
      question,
      position: index === 0 ? 1 : null,
    }));
    const held = debateAnswer(core, pair.you.personId, invited.id, answers);
    expect(held.status, where).toBe("held");
    // Everyone on the race's ballot answered, the player and the rival among them.
    const onBallot = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .query("byContest", [contest.id]) as unknown as FilingRow[]
    )
      .filter(
        (row) =>
          row.status === "on-ballot" &&
          core.people.get(row.personId)?.alive !== false,
      )
      .map((row) => row.personId)
      .sort();
    expect(Object.keys(held.answers).sort(), where).toEqual(onBallot);
    expect(onBallot, where).toContain(pair.you.personId);
    expect(onBallot, where).toContain(pair.rival.personId);
    expect(
      held.answers[pair.you.personId]!.map((a) => a.position),
      where,
    ).toEqual(answers.map((a) => a.position));
    // It is no longer waiting on the player's sheet.
    expect(
      campaignView(core, pair.you.personId)
        .campaigns.find((c) => c.filing.id === pair!.you.id)!
        .debates.some((d) => d.id === invited.id),
      where,
    ).toBe(false);
    // Someone else cannot answer it.
    expect(() =>
      debateAnswer(core, "someone-else", invited.id, answers),
    ).toThrow();
    return;
  }
  throw new Error(
    `No drawn place invited the player to a debate in 6 draws; ${runSeed}: ${tried.join(" | ")}`,
  );
}, 1_800_000);
