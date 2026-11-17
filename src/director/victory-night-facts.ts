/**
 * What the night a candidate wins may say, from the records the world already
 * keeps (Story lead, Nov 17, the victory-night rewrite). Each fact is read
 * from the one record that holds it and set only where that record holds it
 * (an effect is a read, not a record); each cites its record ids. The scene's
 * own packet (`purpose-scene.ts`) calls this once, beside the facts it already
 * sets from the count (`office`, `opponent`, `recount-offered`).
 *
 * - `opponent`: the first who missed the cut in the count, by full name (both
 *   ran in this race, so the count names them to each other).
 * - `unopposed`, `margin-close`, `margin-wide`: the one margin reader
 *   (`raceMargin`, from the count's totals), never a figure.
 * - `takes-office`: the day the result says the term begins, as people say a
 *   day ahead ("on January 6th"), when it is more than a day away.
 * - `plank`: the question the winner's top plank was on, as people say it
 *   after "on" ("the gas tax"), from the count record's mandate.
 * - `ran-it`: the one who speaks ran the campaign (on its staff); `manager`:
 *   another who did, by first name.
 * - `volunteers`: how many worked the campaign, as a size (`crewSaid`), set
 *   from two up.
 * - `doors`: the campaign's own record of households its doors reached.
 * - `raised-least`: the campaign raised less than every other candidate's
 *   campaign did (the campaigns' own rows), never a sum.
 * - `first-race`: the player's own filings hold no earlier race (set only for
 *   the player, whose past the game has kept; a resident's earlier races are
 *   not generated, so nothing is claimed of them).
 * - `at-home`, `at-venue`: where the scene plays.
 */
import {
  CAMPAIGNS_MODULE_ID,
  type CampaignRow,
} from "../core2/modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  type FilingRow,
} from "../core2/modules/elections";
import {
  VOTING_MODULE_ID,
  beatenRunnerUp,
  resultOf,
} from "../core2/modules/voting";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { crewSaid } from "../english/count-words";
import { dayAhead, dayAheadSaid } from "../english/day-words";
import { questionSaid } from "../english/question-names";
import type { Fact } from "../english/scene-talk-words";
import { raceMargin } from "./race-margin";

/** The situation type that reads these facts. */
export const VICTORY_NIGHT_TYPE = "race-won";

export interface VictoryNightInput {
  /** The election-result record the night is about. */
  readonly causeId: string;
  readonly contestId: string;
  /** The one who speaks (a supporter) and the winner they speak to. */
  readonly askerId: PersonId;
  readonly winnerId: PersonId;
  /** Where the scene plays: "venue" or "home". */
  readonly setting: string;
}

export function victoryNightFacts(
  core: Readonly<CoreState>,
  input: VictoryNightInput,
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const { causeId, contestId, askerId, winnerId } = input;
  const record = core.durableLog.get(causeId as never);
  if (!record) return facts;
  const fact = (text: string, ids: readonly string[]): Fact => ({
    text,
    sourceRecordIds: ids,
  });
  const api = coreAPI(core as CoreState);
  // Where the scene plays.
  if (input.setting === "home") facts["at-home"] = fact("yes", [causeId]);
  else facts["at-venue"] = fact("yes", [causeId]);
  // The runner-up by full name.
  const beaten = beatenRunnerUp(record.facts, winnerId);
  const rival = beaten ? core.people.get(beaten.id as PersonId) : undefined;
  if (rival)
    facts.opponent = fact(`${rival.givenName} ${rival.familyName}`, [
      causeId,
      rival.id,
    ]);
  // How the race was decided: the one margin reader.
  const margin = raceMargin(core, causeId);
  if (margin === "alone") facts.unopposed = fact("yes", [causeId]);
  if (margin === "close") facts["margin-close"] = fact("yes", [causeId]);
  if (margin === "wide") facts["margin-wide"] = fact("yes", [causeId]);
  // The day the term begins.
  if (core.modules.has(VOTING_MODULE_ID)) {
    const result = resultOf(api, contestId);
    if (result?.takesOffice && dayAhead(result.takesOffice, core.date)) {
      const said = dayAheadSaid(result.takesOffice, core.date, false);
      if (said && said.startsWith("on "))
        facts["takes-office"] = fact(said, [result.id, causeId]);
    }
  }
  // The winner's top plank, as the question is said.
  const plank = record.topic ? questionSaid(record.topic) : null;
  if (plank) facts.plank = fact(plank, [causeId]);
  // The campaign's own record.
  if (
    !core.modules.has(CAMPAIGNS_MODULE_ID) ||
    !core.modules.has(ELECTIONS_MODULE_ID)
  )
    return facts;
  const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
  const campaigns = api.moduleState(CAMPAIGNS_MODULE_ID).table("campaigns");
  const own = (
    filings.query("byPerson", [winnerId]) as unknown as FilingRow[]
  ).find((row) => row.contestId === contestId);
  const mine = own
    ? (campaigns.get(own.id) as unknown as CampaignRow | undefined)
    : undefined;
  if (own && mine) {
    const cited = [causeId, mine.id];
    if (mine.staffIds.includes(askerId)) facts["ran-it"] = fact("yes", cited);
    const manager = mine.staffIds
      .filter((id) => id !== askerId && id !== winnerId)
      .map((id) => core.people.get(id as PersonId))
      .find((person) => person?.alive);
    if (manager)
      facts.manager = fact(manager.givenName, [...cited, manager.id]);
    const crew = new Set([...mine.volunteerIds, ...mine.staffIds]);
    crew.delete(winnerId);
    if (crew.size >= P.two) facts.volunteers = fact(crewSaid(crew.size), cited);
    if ((mine.doorsKnockedCount ?? P.zero) > P.zero)
      facts.doors = fact("yes", cited);
    // Money: against every other candidate's campaign in the race.
    const others = (
      filings.query("byContest", [contestId]) as unknown as FilingRow[]
    )
      .filter((row) => row.id !== own.id)
      .flatMap((row) => {
        const campaign = campaigns.get(row.id) as unknown as
          CampaignRow | undefined;
        return campaign ? [campaign] : [];
      });
    if (others.length) {
      const ids = [...cited, ...others.map((row) => row.id)];
      if (others.every((row) => row.raisedMinor > mine.raisedMinor))
        facts["raised-least"] = fact("yes", ids);
    }
  }
  // A first race: only for the player, whose filings the game has kept from
  // the start, never a resident's.
  if (winnerId === core.playerId) {
    const earlier = (
      filings.query("byPerson", [winnerId]) as unknown as FilingRow[]
    ).filter((row) => row.contestId !== contestId);
    if (!earlier.length) facts["first-race"] = fact("yes", [causeId, winnerId]);
  }
  return facts;
}
