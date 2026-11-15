import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { gameStartDate } from "../core2/game-start";
import { advanceToRaceFiling } from "../core2/gov-test-clock";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  type ContestRow,
} from "../core2/modules/elections";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";
import { raceTurnoutFacts } from "./race-turnout-facts";

// NOT IN THE REGULAR GATE. The part of town that turned needs two counts for
// one office, and a world opens with no result by precinct, so this plays the
// game's own days from the start date through two council counts (Nov 2025 and
// Nov 2027) at Bountiful, Utah, about 15 minutes. Run it once at a final head:
//   TURNED_PRECINCT_PLAYED=/path/to/played-file.md npx vitest run src/director/turned-precinct-played.test.ts
// It writes every line the two scenes say, with the facts and record ids.
const OUT = process.env.TURNED_PRECINCT_PLAYED;

// PLACE picks the draw ("probe:3" is Bountiful, Utah; "probe:5" Stoneham,
// Massachusetts; "probe:1" Marengo, Illinois): the office is the first with
// two election dates within two years, the player files in the first seat each
// time, and each result day and the day after are staged for the player.
const DRAW = process.env.TURNED_PRECINCT_DRAW ?? "probe:3";

it.skipIf(!OUT)(
  "the player's second race says the part of town that turned",
  () => {
    const place = drawPlace(DRAW, "step12");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const playerId = core.playerId as PersonId;
    const all = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[];
    const byOffice = new Map<string, string[]>();
    for (const c of all)
      byOffice.set(c.officeId, [
        ...new Set([...(byOffice.get(c.officeId) ?? []), c.electionDate]),
      ]);
    const office = [...byOffice.entries()]
      .map(([id, dates]) => ({ id, dates: dates.sort() }))
      .filter(
        (o) =>
          o.dates.length >= 2 &&
          /^office:gus2025:\d+:(council|board)/.test(o.id) &&
          Date.parse(o.dates[1]!) - Date.parse(o.dates[0]!) < 800 * 864e5,
      )
      .sort((a, b) => a.dates[0]!.localeCompare(b.dates[0]!))[0];
    expect(
      office,
      `${where}: no office with two counts within two years`,
    ).toBeTruthy();
    const lines: string[] = [`# Played: ${where}`, `office ${office!.id}`, ""];
    const stage = (contest: ContestRow, label: string) => {
      const causeId = `election-result:${contest.id}`;
      const types = ["race-lost", "victory-night", "race-won"];
      const entry = director.ledger.people
        .get(playerId)
        ?.schedule.find(
          (row) =>
            row.momentId.includes(causeId) &&
            row.bindings.some((b) => types.includes(b.typeKey)),
        );
      const facts = raceTurnoutFacts(core, contest.id, playerId);
      lines.push(
        `## ${label} ${core.date} ${contest.id}`,
        `facts: ${JSON.stringify(Object.fromEntries(Object.entries(facts).map(([k, v]) => [k, v.text])))}`,
      );
      if (!entry) return lines.push("no scene staged for the player", "");
      const typeKey = entry.bindings.find((b) =>
        types.includes(b.typeKey),
      )!.typeKey;
      const scene = purposeScene(core, director, playerId, entry, { typeKey });
      lines.push(`scene: ${typeKey}, ${scene?.kind}`);
      if (scene?.kind === "composed")
        for (const line of [
          ...scene.scene.talk.narration,
          ...(scene.scene.talk.open ? [scene.scene.talk.open] : []),
          scene.scene.talk.state,
        ])
          lines.push(
            `- ${line.speaker}: ${line.text}  [${line.parts.join(", ")}]`,
          );
      lines.push("");
    };
    for (const date of office!.dates.slice(0, 2)) {
      const contest = all
        .filter((c) => c.officeId === office!.id && c.electionDate === date)
        .sort((a, b) => a.id.localeCompare(b.id))[0]!;
      advanceToRaceFiling(core, contest);
      director.watch(core, playerId);
      const filed = fileCandidacy(api, {
        personId: playerId,
        contestId: contest.id,
        platform: [],
      });
      expect(filed.status, `${where} ${contest.id}: the filing`).not.toBe(
        "refused",
      );
      if ("filing" in filed) gatherSignatures(core, filed.filing.id);
      advanceCore(core, addDays(makeIsoDate(contest.electionDate), -1));
      advanceCore(core, makeIsoDate(contest.electionDate));
      stage(contest, "night");
      // The morning after, for the scene the player did not take that night.
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      stage(contest, "morning");
    }
    writeFileSync(OUT!, lines.join("\n"));
  },
  3_000_000,
);
