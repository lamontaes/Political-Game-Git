/**
 * Filing under a party takes membership (CTO, player-path audit finding b,
 * Oct 14, 2026): a person with no tie to the party is refused its label and
 * may file as an independent; joining the party (their views read against
 * the party's positions) lets them file under it. In a random place.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openOffices } from "./modules/offices";
import {
  checkEligibility,
  openContests,
  openElections,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import {
  joinParty,
  openParties,
  partiesHere,
  partyTie,
} from "./modules/parties";
import { openVoting } from "./modules/voting";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`party-filing:${Date.now()}`).digest("hex");
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

describe(`filing under a party (seed ${seed})`, () => {
  it("refuses a party's label without membership, takes an independent, and takes the label after joining", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const state = pick(states, `state:${attempt}`);
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      const place = pick(places, `place:${attempt}`).key;
      const where = `${state} ${place} ${seed}`;
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
      const party = partiesHere(api)
        .filter((p) => p.side !== 0)
        .sort((a, b) => b.share - a.share)[0];
      // Nonpartisan places (American Samoa) have no party label to file under.
      if (!party) {
        tried.push(`${where}: no party`);
        continue;
      }
      const contest = openContests(api).find(
        (c) => c.filingDeadline >= START && c.level !== "federal",
      );
      if (!contest) {
        tried.push(`${where}: no open contest to file for`);
        continue;
      }
      const outsider = [...core.people.values()]
        .filter(
          (p) =>
            p.alive &&
            Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 30 &&
            partyTie(api, p.id)?.partyId !== party.id,
        )
        .sort((a, b) => a.id.localeCompare(b.id))[0];
      if (!outsider) {
        tried.push(`${where}: everyone belongs to the party`);
        continue;
      }
      const before = checkEligibility(api, outsider.id, contest.id, party.name);
      expect(before.find((c) => c.rule === "party-member")?.met, where).toBe(
        false,
      );
      const independent = checkEligibility(api, outsider.id, contest.id, null);
      expect(
        independent.some((c) => c.rule === "party-member"),
        where,
      ).toBe(false);
      const joined = joinParty(api, outsider.id, party.id);
      expect(joined.tie.partyId, where).toBe(party.id);
      expect(joined.agreement, where).toBeGreaterThanOrEqual(-1);
      expect(joined.agreement, where).toBeLessThanOrEqual(1);
      const after = checkEligibility(api, outsider.id, contest.id, party.name);
      expect(after.find((c) => c.rule === "party-member")?.met, where).toBe(
        true,
      );
      return;
    }
    throw new Error(
      `no drawn place had a party and an outsider: ${tried.join("; ")}`,
    );
  });
});
