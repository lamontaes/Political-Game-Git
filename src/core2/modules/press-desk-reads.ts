import { standing } from "./elections";
import type {
  CampaignRow,
  CoreAPI,
  DeskContext,
  FilingRow,
  ModuleRow,
  OutletRow,
  PrintedStory,
} from "./press-base";
import {
  CAMPAIGNS_MODULE_ID,
  ELECTIONS_MODULE_ID,
  NATIONAL,
  adOutlet,
  addDays,
  ballot,
  contestOf,
  countedAudience,
  countsThisMonth,
  followersOf,
  lawChain,
  makeIsoDate,
  pressParameter,
  recordOutletOf,
  table,
  townOutlet,
} from "./press-base";

/** What the reporter's desk reads from the press. */
export function deskContext(api: CoreAPI): DeskContext {
  // Read once per desk run: a race's rivals and a campaign's ad money hold
  // for the day's stories.
  const rivals = new Map<string, readonly string[]>();
  const ads = new Map<string, number>();
  return {
    parameter: pressParameter,
    followers: (outletId) => followersOf(api, outletId),
    townPlaceId: lawChain(api).townPlaceId,
    recordOutletId: () => recordOutletOf(api),
    adMoney: (outlet, personId) => {
      const key = `${outlet.organizationId}|${personId}`;
      let held = ads.get(key);
      if (held === undefined) {
        held = adMoneyAt(api, outlet, personId);
        ads.set(key, held);
      }
      return held;
    },
    rivals: (personId) => {
      let held = rivals.get(personId);
      if (!held) {
        held = rivalsOf(api, personId);
        rivals.set(personId, held);
      }
      return held;
    },
    printed: (wireId, outletId) =>
      (
        table(api, "stories").query("byWire", [
          wireId,
        ]) as unknown as PrintedStory[]
      ).some((s) => s.outletId === outletId),
    printedAnywhere: (wireId) =>
      (table(api, "stories").query("byWire", [wireId]) as unknown[]).length > 0,
    save: (story) => table(api, "stories").put(story as unknown as ModuleRow),
    countedFollowers: (outlet) => countedFollowersOf(api, outlet as OutletRow),
    paperOfRecord: (outlet) =>
      outlet.tier !== "national" && townOutlet(api)?.id === outlet.id,
  };
}

/**
 * The ad money a person's campaigns spent at an outlet: campaigns buy their
 * ads at the outlet with the widest audience, so it is what their open
 * campaigns spent where this outlet is that one.
 */
function adMoneyAt(
  api: CoreAPI,
  outlet: Pick<OutletRow, "organizationId">,
  personId: string,
): number {
  if (
    !api.state.modules.has(CAMPAIGNS_MODULE_ID) ||
    adOutlet(api)?.organizationId !== outlet.organizationId
  )
    return 0;
  let spent = 0;
  for (const filing of api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .query("byPerson", [personId]) as unknown as FilingRow[]) {
    const contest = contestOf(api, filing.contestId);
    if (!contest || contest.electionDate < api.state.date) continue;
    spent +=
      (
        api
          .moduleState(CAMPAIGNS_MODULE_ID)
          .table("campaigns")
          .get(filing.id) as unknown as CampaignRow | undefined
      )?.spentMinor ?? 0;
  }
  return spent;
}

/**
 * The town's counted residents who follow an outlet: for a town outlet, its
 * share of the town's adults by their age bands' habits less its named
 * followers; for a national one, its kind's share of the town's counted
 * adults, split among the kind's outlets.
 */
function countedFollowersOf(api: CoreAPI, outlet: OutletRow): number {
  // Counted once a week: the count reads every counted household.
  const cached = countedCache.get(api.state);
  if (
    cached &&
    cached.date <= api.state.date &&
    api.state.date < addDays(makeIsoDate(cached.date), 7)
  ) {
    const held = cached.byOutlet.get(outlet.id);
    if (held !== undefined) return held;
  } else
    countedCache.set(api.state, { date: api.state.date, byOutlet: new Map() });
  const value = countedFollowersNow(api, outlet);
  countedCache.get(api.state)!.byOutlet.set(outlet.id, value);
  return value;
}

const countedCache = new WeakMap<
  object,
  { date: string; byOutlet: Map<string, number> }
>();

function countedFollowersNow(api: CoreAPI, outlet: OutletRow): number {
  if (outlet.tier !== "national")
    return Math.max(
      0,
      countedAudience(api, outlet) - followersOf(api, outlet.id).length,
    );
  const row = NATIONAL.kinds.find((k) => k.kind === outlet.kind);
  if (!row) return 0;
  let adults = 0;
  for (const counts of countsThisMonth(api))
    if (
      counts.placeId === outlet.placeId ||
      counts.placeId === lawChain(api).townPlaceId
    )
      adults += counts.adults;
  return (adults * row.followShare) / Math.max(1, row.audienceLeans.length);
}

/** The candidates on the ballot against a person in their open races. */
function rivalsOf(api: CoreAPI, personId: string): readonly string[] {
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return [];
  const out = new Set<string>();
  for (const filing of api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .query("byPerson", [personId]) as unknown as FilingRow[]) {
    if (!standing(filing)) continue;
    const contest = contestOf(api, filing.contestId);
    if (!contest || contest.electionDate < api.state.date) continue;
    for (const rival of ballot(api, contest.id))
      if (rival.personId !== personId) out.add(rival.personId);
  }
  return [...out].sort();
}
