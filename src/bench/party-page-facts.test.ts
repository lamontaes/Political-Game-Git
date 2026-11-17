/**
 * The Parties page tells what the records hold about each party here: its
 * chair, its members, the town's next party meeting and the questions it
 * takes the strongest side on (owner, Nov 16: "I can't learn about these
 * parties"). In played worlds at drawn places from all 56; place and seed
 * printed (PARTY_PAGE_SEED fixes the seed).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { setBookkeeping } from "../core2/bookkeeping";
import { coreAPI } from "../core2/state";
import { governmentView } from "./government";
import {
  nextPartyMeeting,
  partiesHere,
  partyMemberIds,
} from "../core2/modules/parties";
import { partyPosition } from "../core2/campaign-stances";
import { policyNames } from "./words";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.PARTY_PAGE_SEED || randomBytes(8).toString("hex");
const DRAWS = 3;

describe(`the Parties page holds each party's records (seed ${seed})`, () => {
  it("lists chair, members, next meeting and positions from the records", () => {
    setBookkeeping(false);
    const named = policyNames();
    const report: string[] = [];
    for (let at = 0; at < DRAWS; at += 1) {
      const place = drawPlace(at ? `${seed}:${at}` : seed, "party-page");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const facts = governmentView(core, core.playerId!).partyFacts as Record<
        string,
        {
          chair: { name: string; cardId: string } | null;
          members: number;
          nextMeeting: string | null;
          standsFor: { question: string; favors: boolean }[];
        }
      >;
      const parties = partiesHere(api);
      expect(parties.length, `${where}: parties here`).toBeGreaterThan(0);
      for (const party of parties) {
        const row = facts[party.name.trim().toLowerCase()];
        expect(row, `${where}: ${party.name} has a page`).toBeDefined();
        expect(row!.members, `${where}: ${party.name} members`).toBe(
          partyMemberIds(api, party.id).length,
        );
        expect(row!.nextMeeting, `${where}: next meeting`).toBe(
          nextPartyMeeting(api),
        );
        expect(
          row!.chair?.cardId ?? null,
          `${where}: ${party.name} chair is its leader record`,
        ).toBe(core.people.has(party.leaderId ?? "") ? party.leaderId : null);
        expect(row!.standsFor.length, `${where}: positions`).toBeGreaterThan(0);
        for (const stand of row!.standsFor) {
          expect(
            named[stand.question],
            `${where}: a worded question`,
          ).toBeTruthy();
          const position = partyPosition(api, party.name, stand.question)!;
          expect(stand.favors, `${where}: ${stand.question} side`).toBe(
            position > 0,
          );
        }
      }
      report.push(
        `${where}: ${parties.length} parties, next meeting ${nextPartyMeeting(api)}`,
      );
    }
    console.log(report.join("\n"));
  }, 600_000);
});
