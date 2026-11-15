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

it.skipIf(!OUT)(
  "the player's second council race says the part of town that turned",
  () => {
    const place = drawPlace("probe:3", "step12");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const playerId = core.playerId as PersonId;
    const lines: string[] = [`# Played: ${where}`, ""];
    for (const date of ["2025-11-04", "2027-11-02"]) {
      const contest = (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("contests")
          .rows() as unknown as ContestRow[]
      )
        .filter((c) => c.electionDate === date && /council/.test(c.officeId))
        .sort((a, b) => a.id.localeCompare(b.id))[0];
      expect(contest, `${where}: no council contest on ${date}`).toBeTruthy();
      advanceToRaceFiling(core, contest!);
      director.watch(core, playerId);
      const filed = fileCandidacy(api, {
        personId: playerId,
        contestId: contest!.id,
        platform: [],
      });
      expect(
        filed.status,
        `${where} ${contest!.id}: the player's filing`,
      ).not.toBe("refused");
      if ("filing" in filed) gatherSignatures(core, filed.filing.id);
      advanceCore(core, addDays(makeIsoDate(contest!.electionDate), -1));
      advanceCore(core, makeIsoDate(contest!.electionDate));
      const causeId = `election-result:${contest!.id}`;
      const entry = director.ledger.people
        .get(playerId)
        ?.schedule.find(
          (row) =>
            row.momentId.includes(causeId) &&
            row.bindings.some((b) =>
              ["race-lost", "victory-night", "race-won"].includes(b.typeKey),
            ),
        );
      lines.push(`## ${date} ${contest!.id}`, "");
      const facts = raceTurnoutFacts(core, contest!.id, playerId);
      lines.push(
        `facts: ${JSON.stringify(Object.fromEntries(Object.entries(facts).map(([k, v]) => [k, v.text])))}`,
        "",
      );
      if (!entry) {
        lines.push("no scene staged for the player", "");
        continue;
      }
      const typeKey = entry.bindings.find((b) =>
        ["race-lost", "victory-night", "race-won"].includes(b.typeKey),
      )!.typeKey;
      const scene = purposeScene(core, director, playerId, entry, { typeKey });
      lines.push(`scene: ${typeKey}, ${scene?.kind}`, "");
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
    }
    writeFileSync(OUT!, lines.join("\n"));
  },
  3_000_000,
);
