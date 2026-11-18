/* global process, console */
// Exports everything the game records that an Elections screen could show, for menu test round 2
// (owner, Nov 17: "I'm just worried about a bunch of slop getting in there"). Every word and number on a
// mock comes from this file, which the game wrote; nothing here is written by hand.
//
// Replays round 1's world: Grano, North Dakota (placeKey 3832580), seed 4da16a2f-..., the player
// Tracy Lucas, male, born Feb 14, 1980, on the start date (Jan 20, 2025), then reads the world's own
// records. Every value carries `source`, the record it came from; what the game does not record is
// listed under `not_in_game`, never guessed.
//
// Run from the repository root (about 15 seconds):
//   OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192 \
//     node --import tsx docs/menu-test/tools/export-elections.mjs
// Writes docs/menu-test/inputs/data/elections-full.json.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildBenchWorld, OPENING_WARMUP_DAYS } from "../../../src/bench/world";
import {
  applyChosenPerson,
  chosenBirthDate,
  readChosenPerson,
} from "../../../src/bench/creator";
import {
  localRaces,
  facePlace,
  holderFace,
} from "../../../src/bench/government";
import controls from "../../../src/bench/data/controls.json" with { type: "json" };
import { gameStartDate } from "../../../src/core2/game-start";
import { coreAPI } from "../../../src/core2/state";
import { setBookkeeping } from "../../../src/core2/bookkeeping";
import {
  ELECTIONS_MODULE_ID,
  filingOfficeFor,
  incumbentOf,
  playerFilingBar,
} from "../../../src/core2/modules/elections";
import { pastElections } from "../../../src/core2/modules/offices";
import {
  electorateRoll,
  petitionNeededHere,
} from "../../../src/core2/modules/voting";

const SEED = "4da16a2f-da10-45c7-b308-18f79c4f5388";
const PLACE_KEY = "3832580";
const PERSON = {
  givenName: "Tracy",
  familyName: "Lucas",
  gender: "male",
  birthYear: 1980,
  birthMonth: 2,
  birthDay: 14,
};

setBookkeeping(false);
const chosen = readChosenPerson(JSON.stringify(PERSON));
const { core, playerId, place } = buildBenchWorld(SEED, gameStartDate(), {
  twoLevel: true,
  warmUpDays: OPENING_WARMUP_DAYS,
  placeKey: PLACE_KEY,
  chooseIdentity: (built, id) => applyChosenPerson(built, id, chosen),
  playerBirthDate: chosenBirthDate(chosen),
  playerGender: chosen.gender,
});
const api = coreAPI(core);
const player = core.people.get(playerId);
const elections = api.moduleState(ELECTIONS_MODULE_ID);
const facesFrom = facePlace(core, playerId);

// A value and the record it came from.
const from = (value, source) => ({ value, source });
const attempt = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

// The voters the town's own roll holds, and the last general election's turnout the law's formulas read.
const roll = electorateRoll(api);
const registered = roll.reduce((n, v) => n + v.count, 0);

const contests = elections.table("contests").rows();
const bars = (contest) => playerFilingBar(api, contest.id);

function holderOf(contest) {
  const term = incumbentOf(api, contest.id);
  if (!term) return null;
  const who = holderFace(
    core,
    { id: term.id, personId: term.personId },
    facesFrom,
  );
  return {
    name: from(
      `${term.identity.givenName} ${term.identity.familyName}`,
      `offices.terms/${term.id}`,
    ),
    party: from(term.party, `offices.terms/${term.id}`),
    since: from(term.startDate, `offices.terms/${term.id}`),
    termEnds: from(term.endDate, `offices.terms/${term.id}`),
    howTheyReached: from(term.reached, `offices.terms/${term.id}`),
    won: term.elected
      ? from(
          {
            date: term.elected.date,
            sharePercent: Math.round(term.elected.share * 100),
          },
          `offices.terms/${term.id}.elected`,
        )
      : null,
    personCardId: who.cardId,
    bust: from(who.face?.bust ?? null, `face of ${who.cardId}`),
  };
}

function pastRacesOf(contest) {
  return pastElections(api, contest.seatId).map((race) => ({
    date: from(race.date, `offices.terms/${race.termId}.elected`),
    winner: from(race.holder, `offices.terms/${race.termId}`),
    party: from(race.party, `offices.terms/${race.termId}`),
    sharePercent: from(
      Math.round(race.share * 100),
      `offices.terms/${race.termId}.elected`,
    ),
  }));
}

function requirementsOf(contest) {
  const rules = attempt(() => filingOfficeFor(api, contest.id));
  if (!rules) return null;
  const source = `elections.contests/${contest.id} -> ${rules.source}`;
  const signatures = attempt(() =>
    petitionNeededHere(api, contest, rules.petition, null),
  );
  return {
    filedWith: from(rules.filedWith, source),
    minimumAge: from(rules.minimumAge, source),
    residency: from(rules.residency, source),
    registeredVoterRequired: from(rules.registeredVoter, source),
    signatures: from(signatures, `voting.petitionNeededHere(${contest.id})`),
    signatureRule: from(rules.petition.formula ?? rules.petition.basis, source),
    estimated: from(rules.estimate, source),
  };
}

const officeRows = contests
  .map((contest) => ({
    contestId: contest.id,
    title: from(contest.title, `elections.contests/${contest.id}`),
    level: from(contest.level, `elections.contests/${contest.id}`),
    district: from(contest.district, `elections.contests/${contest.id}`),
    family: from(contest.family, `elections.contests/${contest.id}`),
    electionDay: from(contest.electionDate, `elections.contests/${contest.id}`),
    filingOpens: from(
      contest.filingOpens ?? null,
      `elections.contests/${contest.id}`,
    ),
    filingCloses: from(
      contest.filingDeadline,
      `elections.contests/${contest.id}`,
    ),
    playerMayFile: from(
      bars(contest) === null,
      `elections.playerFilingBar(${contest.id})`,
    ),
    whyNot: from(bars(contest), `elections.playerFilingBar(${contest.id})`),
    requirements: requirementsOf(contest),
  }))
  .sort(
    (a, b) =>
      a.level.value.localeCompare(b.level.value) ||
      a.electionDay.value.localeCompare(b.electionDay.value) ||
      a.title.value.localeCompare(b.title.value) ||
      a.contestId.localeCompare(b.contestId),
  );

// The Elections page's own races (council and mayor for Grano), each with who holds it now and the last races.
const page = localRaces(core);
const pageRaces = page.races.map((race) => {
  const contest = contests.find((row) => row.id === race.contestId);
  return {
    contestId: race.contestId,
    title: from(race.title, "bench/government.localRaces"),
    seatsUp: from(race.seats, "bench/government.localRaces"),
    electionDay: from(race.electionDate, "bench/government.localRaces"),
    filingOpens: from(race.filingOpens, "bench/government.localRaces"),
    filingCloses: from(race.filingDeadline, "bench/government.localRaces"),
    filedWith: from(race.filedWith, "bench/government.localRaces"),
    officeLevel: from(race.officeLevel, "bench/government.localRaces"),
    playerMayFile: from(race.playerMayFile, "bench/government.localRaces"),
    whyNot: from(race.bar, "bench/government.localRaces"),
    filers: from(race.filers, "bench/government.localRaces"),
    requirements: requirementsOf(contest),
    // One holder per seat the race fills: the page's contest ids, each seat's current holder.
    holders: race.contestIds.map((id) => {
      const seat = contests.find((row) => row.id === id);
      return {
        contestId: id,
        holder: holderOf(seat),
        pastRaces: pastRacesOf(seat),
      };
    }),
  };
});

const out = {
  about:
    "Written by docs/menu-test/tools/export-elections.mjs from the game's own records. Every value is { value, source }; source names the record or function it was read from. Nothing here is typed by hand.",
  world: {
    place: from(place.displayName, `places/${PLACE_KEY}`),
    placeKey: from(PLACE_KEY, "newlife placeKey"),
    seed: from(SEED, "newlife seed"),
    date: from(core.date, "core.date"),
    player: {
      name: from(
        `${player.givenName} ${player.familyName}`,
        `core.people/${playerId}`,
      ),
      birthDate: from(player.birthDate, `core.people/${playerId}`),
      personId: playerId,
      bust: from(
        holderFace(core, { id: playerId, personId: playerId }, facesFrom).face
          ?.bust ?? null,
        `face of ${playerId}`,
      ),
    },
    registeredVoters: from(registered, "voting.electorateRoll"),
  },
  electionsPage: {
    nextElectionDay: from(page.date, "bench/government.localRaces"),
    races: pageRaces,
  },
  // Every contest the world holds at every level, with the filing dates and whether the player may file.
  allOffices: officeRows,
  labels: {
    about:
      "The Elections screen's own words, from src/bench/data/controls.json.",
    localRaces: from(controls.localRaces, "controls.json localRaces"),
    filing: from(controls.filing, "controls.json filing"),
    raceStanding: from(controls.raceStanding, "controls.json raceStanding"),
    levels: from(controls.levels, "controls.json levels"),
  },
  not_in_game: [
    "A filing fee: the game takes none (owner ruling Nov 15, 'Remove the filing fee for now').",
    "Turnout for any race, and the registered voters of the wider electorate: the roll above counts the people the town's own roll holds; the game keeps no past turnout for these races.",
    "Votes for any race before the start: a seat's past election keeps only its date, its winner and the winner's share (offices.terms .elected).",
    "The losing candidates of a past race: the records keep the winner only.",
    "The hours the clerk's counter is open.",
    "Where to drive to the filing office: a filing office is named, not placed.",
  ],
};

const target = path.resolve(
  import.meta.dirname,
  "../inputs/data/elections-full.json",
);
mkdirSync(path.dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`);
console.log(
  `${place.displayName}, ${core.date}: ${player.givenName} ${player.familyName}; ${officeRows.length} contests, ${pageRaces.length} races on the page; wrote ${path.relative(process.cwd(), target)}`,
);
for (const race of pageRaces)
  console.log(
    `${race.title.value}: filing opens ${race.filingOpens.value}, closes ${race.filingCloses.value}, election ${race.electionDay.value}`,
  );
