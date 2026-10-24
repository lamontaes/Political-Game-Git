/**
 * Local races against Ballotpedia's counts: across places drawn from all 56
 * and played 400 days from the opening (`buildBenchWorld`, every module), the
 * share of local contests whose filing closed with no more candidates than
 * seats. Ballotpedia counts 71 percent of the 4,500-plus local elections it
 * covered in April 2024 as uncontested
 * (https://news.ballotpedia.org/2024/05/03/71-of-the-more-than-4500-local-elections-ballotpedia-covered-in-april-were-uncontested/)
 * and about 58 percent for local races from 2018 to 2023. Each seat is its own
 * contest here, so one candidate or none is uncontested. A check on the total
 * only: who files is each resident's own decision (candidacy.ts), never a
 * share. Places and seeds print.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  type ContestRow,
} from "./modules/elections";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const LOCAL = ["city", "county", "township"];
const SEATS_WANTED = 60;
const MOST_PLACES = 10;

describe(
  "local races against Ballotpedia's counts",
  { timeout: 3_600_000 },
  () => {
    it("the share of local contests with no more candidates than seats sits near Ballotpedia's band", () => {
      setBookkeeping(false);
      const report: string[] = [];
      let contests = 0;
      let uncontested = 0;
      for (
        let attempt = 0;
        attempt < MOST_PLACES && contests < SEATS_WANTED;
        attempt += 1
      ) {
        const place = drawPlace(`${seed}:${attempt}`, "local-races-contested");
        const { core } = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        const api = coreAPI(core);
        advanceCore(core, addDays(makeIsoDate(core.date), 400));
        const rows = (
          api
            .moduleState(ELECTIONS_MODULE_ID)
            .table("contests")
            .rows() as unknown as ContestRow[]
        ).filter(
          (c) =>
            LOCAL.includes(c.level) &&
            !c.special &&
            c.filingDeadline <= core.date,
        );
        let here = 0;
        for (const c of rows) {
          contests += 1;
          if (ballot(api, c.id).length <= 1) {
            uncontested += 1;
            here += 1;
          }
        }
        report.push(
          `${place.name} (${place.key}, seed ${place.seed.slice(0, 12)}): ${rows.length} contests, ${here} uncontested`,
        );
      }
      console.log(
        `local-races-contested: base seed ${seed}; ${uncontested} of ${contests} uncontested\n${report.join("\n")}`,
      );
      expect(
        contests,
        `no local contest closed in ${MOST_PLACES} places (seed ${seed})`,
      ).toBeGreaterThan(0);
      const share = uncontested / contests;
      // A pooled point estimate with ~60 seats moves a few points between
      // seeds; the band is Ballotpedia's 58 to 75 percent with room for that.
      expect(share, report.join("; ")).toBeGreaterThanOrEqual(0.5);
      expect(share, report.join("; ")).toBeLessThanOrEqual(0.85);
    });
  },
);
