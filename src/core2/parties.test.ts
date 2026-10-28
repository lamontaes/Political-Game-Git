/**
 * M2-08 parties, and a party primary, in a random place.
 *
 * Parties are organizations with members, a leader and the state's nomination
 * rules, read from data, never assumed to be two; each person's tie comes
 * from their views plus loyalty; "no party" and "independent" both exist; a
 * party with two candidates for a seat picks one in its primary.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openOffices } from "./modules/offices";
import {
  ballot,
  fileCandidacy,
  openContests,
  openElections,
  type FilingRow,
} from "./modules/elections";
import { knockDoors, openCampaigns } from "./modules/campaigns";
import { PLATFORM_QUESTIONS } from "./campaign-views";
import {
  PARTIES_MODULE_ID,
  openParties,
  partiesHere,
  partyTie,
  stateParties,
  type TieRow,
} from "./modules/parties";
import { holdPrimary, openVoting } from "./modules/voting";
import {
  corePlaceByKey,
  searchCorePlaces,
  corePlaceStateIdentities,
} from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`parties:${Date.now()}`).digest("hex");
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

describe("M2-08 parties", () => {
  it("parties are organizations from data; ties come from views; no party and independent both exist; a primary picks one nominee", () => {
    const state = pick(states, "state");
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const place =
      process.env.GOLDEN_PATH_PLACE_KEY ?? pick(places, "place").key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: place,
        startedAt: START,
        minimumPeople: 300,
      }),
    );
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openParties(core);
    openVoting(core);
    const api = coreAPI(core);
    const parties = partiesHere(api);
    const stateKey = corePlaceByKey(place)!.stateJurisdictionKey!;
    expect(parties.map((p) => p.name).sort()).toEqual(
      stateParties(stateKey)
        .map((p) => p.name)
        .sort(),
    );
    if (!parties.length) {
      // Nonpartisan elections (American Samoa): nobody is tied to a party.
      const all = api
        .moduleState(PARTIES_MODULE_ID)
        .table("ties")
        .rows() as unknown as TieRow[];
      expect(all.every((t) => t.tie !== "party")).toBe(true);
      return;
    }
    for (const party of parties) {
      expect(core.organizations.get(party.organizationId)?.kind).toBe(
        "political-party",
      );
      if (party.leaderId)
        expect(partyTie(api, party.leaderId)?.partyId).toBe(party.id);
    }
    const ties = api
      .moduleState(PARTIES_MODULE_ID)
      .table("ties")
      .rows() as unknown as TieRow[];
    const kinds = new Set(ties.map((t) => t.tie));
    expect(kinds.has("party")).toBe(true);
    expect(kinds.has("independent")).toBe(true);
    expect(kinds.has("no-party")).toBe(true);
    // Careful thinkers lean toward calling themselves independent: a scale on
    // deliberation and lean together, not a cut on either.
    const mean = (kind: string) => {
      const rows = ties.filter((t) => t.tie === kind);
      return (
        rows.reduce(
          (n, t) =>
            n +
            (core.people.get(t.personId)?.traits[
              "people-mind-v1:deliberation"
            ] ?? 0),
          0,
        ) / Math.max(1, rows.length)
      );
    };
    expect(mean("no-party"), `${place} seed ${seed}`).toBeLessThanOrEqual(
      mean("independent"),
    );
    const share = ties.filter((t) => t.tie === "party").length / ties.length;
    expect(share).toBeGreaterThan(0.4);
    expect(share).toBeLessThan(0.7);
    // Two members of the same party file for one seat; its primary picks one.
    const party = parties
      .filter((p) => p.side !== 0)
      .sort((a, b) => b.share - a.share)[0]!;
    const members = ties
      .filter((t) => t.partyId === party.id)
      .map((t) => core.people.get(t.personId)!)
      .filter(
        (p) =>
          Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
      )
      .sort((a, b) => b.liquidMinor - a.liquidMinor);
    let primaryContest: string | null = null;
    for (const contest of openContests(api).filter(
      (c) => c.primaryDate && c.primaryDate > START,
    )) {
      const filed: FilingRow[] = [];
      for (const m of members.slice(0, 2)) {
        const r = fileCandidacy(api, {
          personId: m.id,
          contestId: contest.id,
          platform: [
            `${pick(PLATFORM_QUESTIONS, "q")}=${party.side > 0 ? 1 : -1}`,
          ],
          party: party.name,
        });
        if (r.status === "refused") break;
        const f = r.filing;
        if (f.status === "on-ballot") filed.push(f);
      }
      if (filed.length === 2) {
        primaryContest = contest.id;
        break;
      }
    }
    if (primaryContest && party.nominationMethod === "party-primary") {
      const first = ballot(api, primaryContest).find(
        (f) => f.party === party.name,
      )!;
      knockDoors(api, {
        filingId: first.id,
        canvasserId: first.personId,
        hours: 6,
      });
      const { votes, namedVotes } = holdPrimary(api, primaryContest);
      const left = ballot(api, primaryContest).filter(
        (f) => f.party === party.name,
      );
      expect(left).toHaveLength(1);
      // The primary counts the party's wider electorate, not only the
      // town's named voters (audit 2, item 1).
      const total = Object.values(votes).reduce((a, b) => a + b, 0);
      expect(total).toBeGreaterThan(members.length);
      // Same-party candidates no platform tells apart are still told apart
      // by standing, reach and the ballot itself, so the party's voters
      // beyond the town vote in it too (CTO, Oct 14).
      expect(total).toBeGreaterThan(namedVotes);
      // Votes are whole numbers.
      for (const n of Object.values(votes))
        expect(Number.isInteger(n)).toBe(true);
      govReport(
        "parties",
        JSON.stringify({
          place,
          seed,
          primary: primaryContest,
          votes,
          total: Object.values(votes).reduce((a, b) => a + b, 0),
          named: members.length,
          nominee: left[0]!.personId,
        }),
      );
    }
    govReport(
      "parties",
      JSON.stringify({
        place,
        seed,
        parties: parties.map(
          (p) =>
            `${p.name} ${Math.round(p.share * 1000) / 10}% leader ${p.leaderId ?? "none"}`,
        ),
        ties: [...kinds].map(
          (k) => `${k}: ${ties.filter((t) => t.tie === k).length}`,
        ),
      }),
    );
  });
});
