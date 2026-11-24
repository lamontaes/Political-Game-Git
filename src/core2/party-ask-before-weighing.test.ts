// @vitest-environment node
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  PARTY_ASKED_EVENT,
  decisionOf,
  filingWindowOpens,
} from "./modules/candidacy";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { coreAPI } from "./state";
import type { PersonId } from "./types";

// A party asks while the filing window is open and before that day's
// weighing (gov-party-ask-comes-after-the-days-weighing; account lead's
// ruling, Nov 14): on the day a seat's window opens, each party asks the
// member it would ask first, and that member weighs the seat that day with
// the ask among their reasons. So an ask can bring in a member who had not
// yet decided, and a party that already has a filer is asked too (the old
// order asked only parties with no filer, after everyone had filed).
// Pinned to Rainelle, West Virginia, where both major parties filed for the
// 2026 partisan seats before any ask was written.
const PLACE = "5466652";
const SEED = "2f25fb7e430b668e070d0566797f919b69f4d98980ad291944d6a73c00966ea8";

it(`a party's ask is written before the member weighs the seat, Rainelle ${PLACE}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const asks: {
    id: string;
    date: string;
    asked: PersonId;
    contest: string;
    party: string;
  }[] = [];
  api.subscribeEvents(
    "party-ask-before-weighing",
    [PARTY_ASKED_EVENT],
    (_, event) => {
      const facts = event.facts as Record<string, string>;
      asks.push({
        id: event.id,
        date: event.date,
        asked: facts.askedId as PersonId,
        contest: facts.contestId!,
        party: facts.party!,
      });
    },
  );
  const contests = () =>
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[];
  const filingsOf = (contestId: string) =>
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .query("byContest", [contestId]) as unknown as FilingRow[];
  const opens = contests()
    .map((contest) => filingWindowOpens(api, contest))
    .filter((date) => date > core.date)
    .sort()[0]!;
  advanceCore(core, addDays(makeIsoDate(opens), -1));
  const before = asks.length;
  advanceCore(core, opens);
  const today = asks.slice(before).filter((ask) => ask.date === opens);
  expect(
    today.length,
    `asks on the day the window opened, ${opens}`,
  ).toBeGreaterThan(0);
  let weighedWithAsk = 0;
  let partyHadFiler = 0;
  for (const ask of today) {
    const said = `${ask.id}`;
    // The one asked weighed the seat that day, citing the ask.
    const decision = decisionOf(api, ask.contest, ask.asked);
    expect(decision?.reasons.partyAsked, said).toBeGreaterThan(0);
    expect(decision?.sourceIds, said).toContain(ask.id);
    expect(decision?.date, said).toBe(opens);
    weighedWithAsk += 1;
    // A party asked before anyone had filed: some end the day with a filer.
    if (
      filingsOf(ask.contest).some(
        (row) => row.party?.toLowerCase() === ask.party.toLowerCase(),
      )
    )
      partyHadFiler += 1;
  }
  expect(weighedWithAsk).toBe(today.length);
  expect(partyHadFiler, "an asked party with a filer").toBeGreaterThan(0);
}, 300_000);
