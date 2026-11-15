import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { governmentView, fileForOffice } from "../bench/government";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { campaignParameter } from "./campaign-data";
import { takeCampaignDayChoice } from "./campaign-day";
import { gameStartDate } from "./game-start";
import { advanceToRaceFiling } from "./gov-test-clock";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  ELECTIONS_MODULE_ID,
  petitionOf,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import {
  campaignFor,
  ownChoiceDoorHours,
  ownChoicePetitionDoors,
} from "./modules/campaigns";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

// A filed player on a day they make their own choices works the petition's
// doors (owner, Oct 28: the count fills as the candidate campaigns); on a day
// they take a campaign choice by hand nothing is done for them (owner, Oct 14,
// night). Pinned at Sherrodsville, Ohio (3972242, seed "scan-25"), where the
// first council petition needs 10 signatures and one volunteer near the line
// decided whether an own-choice filer ever got any. NOT a one-minute test: the
// town's own days from the start date to the filing window are the only way to
// a real petition (about 4 minutes each case). OWN_CHOICE_PLAYED=<file> keeps
// the day's hours for the played file.
const PLACE = "3972242";
const SEED = "scan-25";
const OUT = process.env.OWN_CHOICE_PLAYED;

function filer() {
  setBookkeeping(false);
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const contest = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter((c) => /:council:/.test(c.officeId + c.id))
    .sort((a, b) => a.id.localeCompare(b.id))[0]!;
  advanceToRaceFiling(core, contest);
  // The first adult who lives with someone and has a race open to them (every
  // check met), in id order, as the house-talk case picks its filer.
  const candidates = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        [...(core.households.get(p.householdId)?.memberIds ?? [])].length > 1,
    )
    .map((p) => p.id)
    .sort();
  let entrant: PersonId | undefined;
  let contestId = "";
  for (const id of candidates) {
    const open = governmentView(core, id).contests.find((row) =>
      row.checks.every((check) => check.met),
    );
    if (open) {
      entrant = id;
      contestId = open.contest.id;
      break;
    }
  }
  expect(entrant, `${PLACE} ${SEED}: a person with a race open`).toBeDefined();
  (core as { playerId?: string }).playerId = entrant!;
  fileForOffice(core, entrant!, contestId);
  const filing = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .rows() as unknown as FilingRow[]
  ).find((f) => f.personId === entrant && f.contestId === contestId)!;
  return { core, api, entrant: entrant!, filing };
}

it("a filed player on own-choice gets their petition's signatures from their own doors", () => {
  const { core, api, entrant, filing } = filer();
  const person = core.people.get(entrant)!;
  const petition = petitionOf(api, filing.id)!;
  const hours = ownChoiceDoorHours(api, filing.id);
  const base = campaignParameter(
    person.jobId ? "rivalHoursWithJob" : "rivalHoursWithoutJob",
  );
  // The day's door hours come out of the same base a world candidate's do
  // (a job's hours first), never more than that base scaled by the
  // candidate's own lean.
  expect(hours, `${PLACE} ${SEED}: door hours`).toBeGreaterThan(0);
  expect(hours, `${PLACE} ${SEED}: door hours against ${base}`).toBeLessThan(
    2 * base,
  );
  const due = petition.due;
  advanceCore(core, addDays(makeIsoDate(due), 1));
  const after = petitionOf(api, filing.id)!;
  if (OUT)
    writeFileSync(
      OUT,
      `${PLACE} ${SEED}: filer ${entrant} ${person.jobId ? "with" : "without"} a job, door hours ${hours.toFixed(2)} of a base ${base}; petition needed ${after.needed}, signed ${after.signed}, due ${due}; filing ${(api.moduleState(ELECTIONS_MODULE_ID).table("filings").get(filing.id) as unknown as FilingRow).status}\n`,
    );
  expect(
    after.signed,
    `${PLACE} ${SEED}: signed of ${after.needed}`,
  ).toBeGreaterThanOrEqual(after.needed);
}, 1_500_000);

it("a day the player takes a campaign choice by hand, nothing is done for them", () => {
  const { core, api, filing } = filer();
  const doors = () => campaignFor(api, filing.id).doorsKnockedCount ?? 0;
  const before = doors();
  ownChoicePetitionDoors(api, filing.id);
  const own = doors();
  expect(
    own,
    `${PLACE} ${SEED}: an own-choice day walks doors`,
  ).toBeGreaterThan(before);
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  takeCampaignDayChoice(api, filing.id, "canvass", { hours: 1 });
  const byHand = doors();
  ownChoicePetitionDoors(api, filing.id);
  expect(doors(), `${PLACE} ${SEED}: a hand day adds none of its own`).toBe(
    byHand,
  );
  expect(campaignFor(api, filing.id).handDay).toBe(core.date);
}, 1_500_000);
