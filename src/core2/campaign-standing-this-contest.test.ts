/**
 * A contest's standing reads only its own campaign's causes (pool item
 * campaign-standing-reads-only-this-contest), in a played world: a place drawn
 * from all 56 and a seed (printed, and set with STANDING_SEED to replay a
 * failure). A candidate on a ballot who also has a cause row from a race
 * before this campaign (hand-inserted: an edge case, not the route) is read
 * for this contest without it; a cause row dated within the campaign counts.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { contestStanding } from "./campaign-day";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { CAMPAIGNS_MODULE_ID, type CauseRow } from "./modules/campaigns";
import { ELECTIONS_MODULE_ID, type FilingRow } from "./modules/elections";
import { coreAPI } from "./state";
import type { ModuleRow } from "./module-data";

const seed = process.env.STANDING_SEED ?? randomBytes(8).toString("hex");

describe(`a contest's standing reads only its own campaign (seed ${seed})`, () => {
  it("a cause from a race before this campaign is not this race's standing; one within it is", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (let draw = 0; draw < 6; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "standing-this-contest");
      const where = `${place.name} (${place.key}), run seed ${seed} draw ${draw}, world seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const contests = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as { id: string; electionDate: string }[];
      const first = contests
        .map((c) => c.electionDate)
        .filter((d) => d > core.date)
        .sort()[0];
      if (!first) {
        tried.push(`${where}: no coming election`);
        continue;
      }
      advanceCore(core, addDays(makeIsoDate(first), -1));
      const filings = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .rows() as unknown as FilingRow[];
      const filing = filings.find(
        (f) =>
          f.status === "on-ballot" &&
          contests.some((c) => c.id === f.contestId),
      );
      if (!filing) {
        tried.push(`${where}: no candidate on a ballot`);
        continue;
      }
      const voter = [...core.people.values()].find(
        (p) => p.id !== filing.personId,
      )!;
      const causes = api.moduleState(CAMPAIGNS_MODULE_ID).table("causes");
      const reachedBy = (act: string) =>
        contestStanding(api, filing.contestId, "")
          .find((c) => c.candidateId === filing.personId)!
          .acts.find((a) => a.act === act)?.reached ?? 0;
      const row = (id: string, date: string): CauseRow => ({
        id,
        voterId: voter.id,
        candidateId: filing.personId,
        date,
        act: "door",
        actorId: filing.personId,
        warmthBefore: 0,
        warmthAfter: 0.1,
        agreement: null,
        rapport: 0,
        weight: 1,
      });
      const base = reachedBy("door");
      // A door knocked in a race four hundred days before they filed here.
      causes.put(
        row(
          `cause:old-race:${filing.id}`,
          addDays(makeIsoDate(filing.filedOn), -400),
        ) as unknown as ModuleRow,
      );
      expect(
        reachedBy("door"),
        `${where}: ${filing.personId} cause:old-race:${filing.id} counted in ${filing.contestId}`,
      ).toBe(base);
      // A door knocked in this campaign.
      causes.put(
        row(
          `cause:this-race:${filing.id}`,
          addDays(makeIsoDate(filing.filedOn), 1),
        ) as unknown as ModuleRow,
      );
      expect(
        reachedBy("door"),
        `${where}: cause:this-race:${filing.id} not counted in ${filing.contestId}`,
      ).toBe(base + 1);
      console.log(
        `standing of ${filing.contestId}: ${where}; door reached ${base} then ${base + 1}`,
      );
      return;
    }
    throw new Error(
      `no drawn place had a candidate on a coming ballot (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 600_000);
});
