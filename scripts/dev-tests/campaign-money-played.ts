/**
 * Campaign money as played (development tooling only): the world's own
 * campaigns in drawn places, read from their records.
 *
 *   node --import tsx scripts/dev-tests/campaign-money-played.ts <seed> [places=3] [days=400]
 *
 * For each place drawn from the seed it builds the bench world, plays it
 * forward a month at a time, and prints: the town outlet's own ad price
 * each month (a week of its costs over its followers), and for every
 * campaign the world ran, what it raised (gifts, with a gift's record id),
 * how it split its money by kind of reach, the ads it bought (the first ad
 * reach record), its polls, and the stories the town's press printed that
 * name its candidate. Nothing is pinned: the place and the world seed are
 * printed for a replay.
 */
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  CAMPAIGNS_MODULE_ID,
  adContactPrice,
  voterContactPriceMinor,
  type CampaignRow,
  type GiftRow,
  type PollRow,
} from "../../src/core2/modules/campaigns";
import { PRESS_MODULE_ID } from "../../src/core2/modules/press";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";

const seed = process.argv[2] ?? "books";
const places = Number(process.argv[3] ?? 3);
const days = Number(process.argv[4] ?? 400);
const dollars = (minor: number) => `$${Math.round(minor / 100)}`;

setBookkeeping(false);
for (let draw = 0; draw < places; draw += 1) {
  const place = drawPlace(`${seed}:${draw}`, "campaign-money-played");
  const started = Date.now();
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  const api = coreAPI(core);
  console.log(
    `\n## ${place.name}, ${place.state} (${place.key}), world seed ${place.seed}`,
  );
  const end = addDays(makeIsoDate(core.date), days);
  const prices: string[] = [];
  const seen = new Map<string, CampaignRow>();
  const keep = () => {
    if (!core.modules.has(CAMPAIGNS_MODULE_ID)) return;
    for (const row of api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("campaigns")
      .rows() as unknown as CampaignRow[])
      seen.set(row.id, row);
  };
  while (core.date < end) {
    prices.push(
      `${core.date.slice(0, 7)} ad ${Math.round(adContactPrice(api))}c, cheapest contact ${Math.round(voterContactPriceMinor(api))}c`,
    );
    keep();
    const next = addDays(makeIsoDate(core.date), 30);
    advanceCore(core, makeIsoDate(next < end ? next : end));
  }
  keep();
  console.log(`Price of one contact, by month: ${prices.join("; ")}`);
  const gifts = api
    .moduleState(CAMPAIGNS_MODULE_ID)
    .table("gifts")
    .rows() as unknown as GiftRow[];
  const polls = api
    .moduleState(CAMPAIGNS_MODULE_ID)
    .table("polls")
    .rows() as unknown as PollRow[];
  const stories = core.modules.has(PRESS_MODULE_ID)
    ? (api.moduleState(PRESS_MODULE_ID).table("stories").rows() as unknown as {
        id: string;
        subjectIds?: readonly string[];
      }[])
    : [];
  const spenders = [...seen.values()]
    .filter((c) => c.raisedMinor > 0 || c.spentMinor > 0)
    .sort((a, b) => b.spentMinor - a.spentMinor);
  console.log(
    `${seen.size} campaigns seen, ${spenders.length} with money; ${stories.length} stories printed in all.`,
  );
  for (const c of spenders.slice(0, 8)) {
    const who = core.people.get(c.candidateId as PersonId);
    const name = who ? `${who.givenName} ${who.familyName}` : c.candidateId;
    const own = gifts.filter((g) => g.campaignId === c.filingId);
    const outside = own.filter((g) => g.donorId.startsWith("outside:"));
    const kinds = Object.entries(c.spentByKind ?? {})
      .sort((a, b) => b[1] - a[1])
      .map(
        ([kind, minor]) =>
          `${kind} ${Math.round((100 * minor) / Math.max(1, c.spentMinor))}%`,
      )
      .join(", ");
    const covered = stories.filter((s) =>
      s.subjectIds?.includes(c.candidateId),
    );
    const ownPolls = polls.filter((p) => p.campaignId === c.id);
    console.log(
      `- ${name} (${c.id}): raised ${dollars(c.raisedMinor)} from ${own.length} gift rows` +
        (own[0] ? ` (first ${own[0].id})` : "") +
        (outside.length
          ? `, ${dollars(outside.reduce((n, g) => n + g.totalMinor, 0))} of it from ${outside.reduce((n, g) => n + (g.donors ?? 0), 0)} donors outside town`
          : "") +
        `; spent ${dollars(c.spentMinor)}: ${kinds || "nothing"}` +
        `; ads ${c.adReaches?.length ?? 0}` +
        (c.adReaches?.[0]
          ? ` (first ${c.adReaches[0].id}: ${c.adReaches[0].full} named and ${c.adReaches[0].counted} counted followers)`
          : "") +
        `; counted adults reached ${c.countedReached ?? 0}; doors ${c.doorsKnockedCount ?? 0}` +
        `; polls ${ownPolls.length}` +
        `; stories naming the candidate ${covered.length}` +
        (covered[0] ? ` (first ${covered[0].id})` : ""),
    );
  }
  console.log(
    `Played to ${core.date} in ${Math.round((Date.now() - started) / 1000)} s.`,
  );
}
console.log("ALLDONE");
