/**
 * Filing under a party takes membership (CTO, player-path audit finding b,
 * Oct 14, 2026): a person with no tie to the party is refused its label and
 * may file as an independent; joining the party (their views read against
 * the party's positions) lets them file under it.
 */
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
  partyMemberIds,
  partyTie,
} from "./modules/parties";
import { openVoting } from "./modules/voting";
import { searchCorePlaces } from "./place-lookup";
import { benchRequest, benchWorld } from "../bench/handler";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { PARTIES_MODULE_ID, type TieRow } from "./modules/parties";

const START = "2026-01-05";
// Pinned (Nov 16). Before, the seed came from GOLDEN_PATH_SEED or the clock,
// the first case drew up to eight states and places from it until one had a
// party, an open contest and an outsider, and the second drew up to six
// places and played a year in each until someone joined a party as an act,
// so a red came and went with the draw. Both now play one place found once
// by running the old draws at seed pin-pf-0 on the Train at 6d12556a: the
// first case's fifth draw, Ellenboro, West Virginia (Stockton NJ, Boulder
// Canyon SD, Farmington NH and Gaston OR had no local contest open for
// filing), and the second case's sixth, Three Rivers, Texas (Puapua AS,
// Partridge KS, Highland Acres DE, Lewisport KY and Sherwood OR had nobody
// join a party as an act in the year).
const seed = "pin-pf-0";
const FILING = {
  state: "US-WV",
  key: "5424844",
  name: "Ellenboro, West Virginia",
};
const PLAYED = {
  key: "4872872",
  name: "Three Rivers, Texas",
  seed: "91eb538f0a6902fc467d2c5a249d405f89d23eaad7a9a44ee65aaf146d96ad7d",
};

describe(`filing under a party (seed ${seed})`, () => {
  it("refuses a party's label without membership, takes an independent, and takes the label after joining", () => {
    const where = `${FILING.name} (${FILING.key}), seed ${seed}`;
    const found = searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: FILING.state,
      scope: "locality",
    }).find((row) => row.key === FILING.key);
    expect(found?.displayName, where).toBe(FILING.name);
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: FILING.key,
        startedAt: START,
        minimumPeople: 300,
      }),
    );
    openOffices(core, seed, core.date);
    openElections(core);
    openCampaigns(core);
    openParties(core);
    openVoting(core);
    const api = coreAPI(core);
    const party = partiesHere(api)
      .filter((p) => p.side !== 0)
      .sort((a, b) => b.share - a.share)[0];
    expect(party, `${where}: a party to file under`).toBeDefined();
    const contest = openContests(api).find(
      (c) => c.filingDeadline >= START && c.level !== "federal",
    );
    expect(contest, `${where}: an open contest to file for`).toBeDefined();
    const outsider = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 30 &&
          partyTie(api, p.id)?.partyId !== party!.id,
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    expect(outsider, `${where}: someone outside the party`).toBeDefined();
    const before = checkEligibility(
      api,
      outsider!.id,
      contest!.id,
      party!.name,
    );
    expect(before.find((c) => c.rule === "party-member")?.met, where).toBe(
      false,
    );
    const independent = checkEligibility(api, outsider!.id, contest!.id, null);
    expect(
      independent.some((c) => c.rule === "party-member"),
      where,
    ).toBe(false);
    expect(partyMemberIds(api, party!.id), where).not.toContain(outsider!.id);
    const joined = joinParty(api, outsider!.id, party!.id);
    expect(joined.tie.partyId, where).toBe(party!.id);
    // Joining is an act: the party's membership holds them too, by the
    // membership record the roster (meetings, chair) reads.
    expect(
      core.memberships.has(`${outsider!.id}:${party!.organizationId}`),
      `${where}: membership ${outsider!.id}:${party!.organizationId}`,
    ).toBe(true);
    expect(partyMemberIds(api, party!.id), where).toContain(outsider!.id);
    expect(joined.agreement, where).toBeGreaterThanOrEqual(-1);
    expect(joined.agreement, where).toBeLessThanOrEqual(1);
    const after = checkEligibility(api, outsider!.id, contest!.id, party!.name);
    expect(after.find((c) => c.rule === "party-member")?.met, where).toBe(true);
  });

  // Before (Nov 16), this case waited for anyone to join a party as an act
  // in a played year at Three Rivers, and the only one who ever did was a
  // sitting state senator the voting engine named the party's stand-in
  // nominee for a statewide race nobody of that party had filed for
  // (voting.ts, fileStandingCandidates). Whether a stand-in is needed depends
  // on who files, which moves with the president's approval (#9689 opened it
  // per world), so on the Train at ce78169a nobody joined and the case went
  // red. Residents take their ties by the party rule instead, never as an
  // act. Now the player joins through the request the game's party page
  // sends (/api/party/join), in a new life at Three Rivers, and the year is
  // played; everyone who joined as an act, the player among them, must be on
  // the party's roll at its end.
  // Limit: the file took 157 s alone and 157 s beside another played-world
  // file (Nov 16, Train c0f54ca0), nearly all of it the played year; twice
  // the slower is about 320 s.
  it("holds everyone who joined as an act in the party's membership, in a played year", async () => {
    setBookkeeping(false);
    try {
      const where = `${PLAYED.name} (${PLAYED.key}), seed ${PLAYED.seed}`;
      const ask = (method: string, path: string) =>
        benchRequest(method, new URL(path, "http://bench"), {
          developer: true,
        });
      const opened = await ask(
        "POST",
        `/api/newlife?${new URLSearchParams({ seed: PLAYED.seed, placeKey: PLAYED.key })}`,
      );
      expect(opened.status, where).toBe(200);
      const { core, player } = benchWorld();
      const api = coreAPI(core!);
      const playerId = player!.personId!;
      const held = partyTie(api, playerId)?.partyId;
      const party = [...partiesHere(api)]
        .sort((a, b) => a.id.localeCompare(b.id))
        .find((row) => row.id !== held)!;
      expect(party, `${where}: a party to join`).toBeDefined();
      const joined = await ask(
        "POST",
        `/api/party/join?${new URLSearchParams({ partyId: party.id })}`,
      );
      expect(joined.status, where).toBe(200);
      advanceCore(core!, addDays(makeIsoDate(core!.date), 365));
      const ties = api
        .moduleState(PARTIES_MODULE_ID)
        .table("ties")
        .rows() as unknown as TieRow[];
      const joinedAsAct = ties.filter(
        (t) => t.partyId && t.reason.startsWith("joined;"),
      );
      expect(
        joinedAsAct.map((t) => t.personId),
        `${where}: the player joined ${party.id} as an act`,
      ).toContain(playerId);
      for (const tie of joinedAsAct)
        expect(
          partyMemberIds(api, tie.partyId!),
          `${where}: ${tie.id} joined ${tie.partyId} on ${tie.since}`,
        ).toContain(tie.personId);
      process.stdout.write(
        `party join membership: ${where}; ${joinedAsAct.length} joined as an act, the player ${playerId} in ${party.id}\n`,
      );
    } finally {
      setBookkeeping(true);
    }
  }, 320_000);
});
