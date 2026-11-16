/**
 * A local race whose filing closed before the world opens: the seat's holder
 * weighs standing again by the one rule (`standsAgain`), as at any race, and
 * one who stands is on the ballot. Nothing filed for them before the record
 * began, so a holder left out of the weighing left the seat with no one.
 *
 * Pinned: a Vermont place (5005725) on world seed "tl-c", opened on Oct 20,
 * 2026, after its county races closed on May 28; the twelve county seats
 * (board, sheriff, prosecutor, clerk, treasurer, assessor) had no filer on
 * Nov 3 before the fix. Played to the day after the opening, when candidacy
 * weighs the races closed at the opening. About 10 seconds.
 */
import { expect, it } from "vitest";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { openLaws } from "./modules/laws";
import { openOffices, OFFICES_MODULE_ID } from "./modules/offices";
import {
  ballot,
  ELECTIONS_MODULE_ID,
  openElections,
  type ContestRow,
} from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openVoting } from "./modules/voting";
import { decisionOf } from "./modules/candidacy";

const SEED = "tl-c";
const PLACE = "5005725";
const START = "2026-10-20";

it("a local race closed at the opening has its holder weigh standing again, and a holder who stands is on the ballot", () => {
  const full = buildPopulation({
    seed: SEED,
    placeKey: PLACE,
    startedAt: START,
    minimumPeople: 400,
  });
  const player = [...full.people]
    .filter(
      (p) => Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 18,
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0]!;
  const core = createLifeCore(
    collapseToTwoLevels({ ...full, playerId: player.id }),
  );
  openLaws(core);
  openOffices(core, SEED);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openVoting(core);
  const api = coreAPI(core);
  advanceCore(core, "2026-10-21");
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  const closed = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  ).filter(
    (c) =>
      c.electionDate === "2026-11-03" &&
      c.filingDeadline < START &&
      c.level !== "state" &&
      c.level !== "federal",
  );
  let weighed = 0,
    stood = 0,
    empty = 0;
  for (const contest of closed) {
    const holder = (
      terms.query("bySeatStatus", [contest.seatId, "serving"]) as unknown as {
        personId: string | null;
      }[]
    )[0]?.personId;
    const filed = ballot(api, contest.id);
    if (!filed.length) empty += 1;
    if (!holder || !api.state.people.get(holder)?.alive) continue;
    // The holder weighed standing again, by the one rule.
    const decision = decisionOf(api, contest.id, holder);
    expect(
      decision,
      `${PLACE} ${SEED}: ${contest.id} holder ${holder}`,
    ).not.toBeNull();
    weighed += 1;
    // One who chose to stand is on the ballot.
    if (decision!.run) {
      stood += 1;
      expect(
        filed.some((f) => f.personId === holder),
        `${PLACE} ${SEED}: ${contest.id} holder ${holder} stood`,
      ).toBe(true);
    }
  }
  const county = closed.filter((c) => c.seatId.startsWith("seat:gus2025:"));
  expect(
    county.length,
    `${PLACE} ${SEED}: county seats closed at the opening`,
  ).toBe(12);
  expect(weighed, `${PLACE} ${SEED}: holders weighed`).toBeGreaterThan(0);
  expect(stood, `${PLACE} ${SEED}: holders who stood`).toBeGreaterThan(0);
  process.stdout.write(
    `CLOSED RACE HOLDERS ${PLACE} ${SEED}: ${closed.length} local races closed at the opening, ${weighed} holders weighed, ${stood} stood, ${empty} with no filer\n`,
  );
}, 60_000);
