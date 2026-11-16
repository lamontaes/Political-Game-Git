/**
 * One played life for the talk after a lost race (development tooling and the
 * pinned test; shipped play never imports it). A new adult is the player,
 * files for a race through the bench's own `fileForOffice`, and every act is
 * what a player presses on the campaign page (`campaignAct`, whole dollars the
 * page's box takes). The year then plays through the player's own pauses to
 * the count; the scenes are read for that player from the world's own result.
 * Nothing is written for anyone else.
 */
import { campaignAct } from "../../src/bench/campaign";
import { applyChosenPerson } from "../../src/bench/creator";
import { fileForOffice } from "../../src/bench/government";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gatherSignatures } from "../../src/core2/campaign-petition-kit";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { campaignFor } from "../../src/core2/modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  playerContests,
  type ContestRow,
  type FilingRow,
} from "../../src/core2/modules/elections";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { drawPlace } from "../core2-year/place";

/** What the player presses on the campaign page, in whole dollars. */
export interface Presses {
  /** Ask everyone the player knows to volunteer. */
  readonly volunteer: boolean;
  /** Whole dollars of the player's own money, or a quarter of the cash they hold. */
  readonly give: number | "quarter";
}

export interface Life {
  readonly where: string;
  readonly core: ReturnType<typeof buildBenchWorld>["core"];
  readonly director: ReturnType<typeof buildBenchWorld>["director"];
  readonly me: PersonId;
  readonly contest: ContestRow;
  readonly filing: FilingRow;
  readonly gaveMinor: number;
}

/** Plays one life to the count, or says why it could not. */
export function playLife(
  seed: string,
  presses: Presses,
): Life | { where: string; note: string } {
  const place = drawPlace(seed, "family-loss-life");
  const where = `${place.name} (${place.key}), seed ${seed}`;
  setBookkeeping(false);
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const me = playerId as PersonId;
  // A player who starts a life as an adult (the new-life screen's own choice).
  applyChosenPerson(core, me, {
    givenName: "Pat",
    familyName: core.people.get(me)!.familyName,
    gender: "female",
    birthYear: 1985,
    birthMonth: 6,
    birthDay: 1,
  });
  const api = coreAPI(core);
  // The year runs until a race the player may file for is open.
  for (let day = 0; !playerContests(api).length && day < 365; day += 7)
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  const rivals = new Map<string, number>();
  for (const row of api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .rows() as unknown as FilingRow[])
    if (row.personId !== me)
      rivals.set(row.contestId, (rivals.get(row.contestId) ?? 0) + 1);
  const refusals: string[] = [];
  let contest: ContestRow | undefined;
  let filing: FilingRow | undefined;
  for (const race of [...playerContests(api)].sort(
    (a, b) =>
      Number(rivals.has(b.id)) - Number(rivals.has(a.id)) ||
      a.electionDate.localeCompare(b.electionDate) ||
      a.id.localeCompare(b.id),
  )) {
    const result = fileForOffice(core, me, race.id) as {
      filing?: FilingRow;
      status?: string;
      unmet?: { rule: string }[];
    };
    if (!result.filing)
      refusals.push(
        `${result.status}: ${(result.unmet ?? []).map((u) => u.rule).join(",")}`,
      );
    if (
      ["petitioning", "on-ballot"].includes(result.filing?.status ?? "") &&
      result.filing
    ) {
      contest = race;
      filing = result.filing;
      break;
    }
  }
  if (!contest || !filing)
    return {
      where,
      note: `no race to file for (${playerContests(api).length} open, refused: ${refusals.join("; ")})`,
    };
  gatherSignatures(core, filing.id);
  core.focusPersonIds.add(me);
  director.watch(core, me);
  campaignFor(api, filing.id);
  if (presses.volunteer)
    campaignAct(core, me, { filingId: filing.id, kind: "volunteer" });
  const dollars =
    presses.give === "quarter"
      ? Math.floor(core.people.get(me)!.liquidMinor / 400)
      : presses.give;
  let gaveMinor = 0;
  if (dollars > 0) {
    const out = campaignAct(core, me, {
      filingId: filing.id,
      kind: "contribute",
      amountMinor: dollars * 100,
    }) as { answers?: { givenMinor?: number }[] };
    gaveMinor = Number(out.answers?.[0]?.givenMinor ?? 0);
  }
  // The days pass to the count; the player presses nothing else.
  advanceCore(core, addDays(makeIsoDate(contest.electionDate), 2));
  return { where, core, director, me, contest, filing, gaveMinor };
}
