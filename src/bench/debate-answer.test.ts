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
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  type ContestRow,
  type FilingRow,
} from "../core2/modules/elections";
import { debatesIn } from "../core2/modules/meetings";
import { campaignView, debateAnswer } from "./campaign";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`debate-answer:${Date.now()}`).digest("hex");

it("lists the invited debate for the player, who answers it, and it is held with both candidates", () => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const place = drawPlace(`${runSeed}:${attempt}`, "debate-answer");
    const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}:${attempt}, place seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const adults = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
      )
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      );
    let pair: { you: FilingRow; rival: FilingRow } | undefined;
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
      }
      if (filed.length >= 2) {
        pair = { you: filed[0]!, rival: filed[1]! };
        break;
      }
    }
    if (!pair) continue;
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
    if (!standing(pair.you.id) || !standing(pair.rival.id)) continue;
    advanceCore(core, addDays(makeIsoDate(contest.electionDate), -3));
    const view = campaignView(core, pair.you.personId).campaigns.find(
      (c) => c.filing.id === pair!.you.id,
    );
    const invited = view?.debates[0];
    if (!invited || !invited.questions.length) continue;
    expect(debatesIn(api, contest.id)[0]!.status, where).toBe("invited");

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
    `No drawn place invited the player to a debate in 6 draws; ${runSeed}`,
  );
}, 1_800_000);
