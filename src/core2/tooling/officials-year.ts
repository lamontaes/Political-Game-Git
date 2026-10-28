/**
 * M1-12 proof (OPUS-OFFICIALS): build the played world in a place drawn from
 * the seed, switch on other governments' races and legislating, run a game
 * year, and report every federal and state vote: tallies by party, members
 * who crossed their party, and each independent's votes beside their
 * caucus's. Also the opening's build time and memory.
 *
 * node --import tsx src/core2/tooling/officials-year.ts <seed> [placeKey] [years]
 */
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../bench/world";
import { gameStartDate } from "../game-start";
import { advanceCore } from "../life";
import { coreAPI } from "../state";
import { partySide } from "../appointments";
import { allOfficials, officialOf } from "../modules/officials";
import { LEGISLATURE_MODULE_ID } from "../modules/legislature";
import {
  openWorldLegislating,
  WORLD_LEGISLATING_MODULE_ID,
} from "../modules/world-legislating";
import {
  openWorldRaces,
  VOTING_MODULE_ID,
  worldRacesOpen,
} from "../modules/voting";

const seed = process.argv[2] ?? "officials-proof";
const placeKey = process.argv[3] || undefined;
const years = Number(process.argv[4] ?? 1);
const start = gameStartDate();

const t0 = performance.now();
const world = buildBenchWorld(seed, start, {
  twoLevel: true,
  ...(placeKey ? { placeKey } : {}),
});
const buildSeconds = (performance.now() - t0) / 1000;
const heapAfterBuild = process.memoryUsage().heapUsed;
const core = world.core;
const api = coreAPI(core);
if (!worldRacesOpen(coreAPI(core))) openWorldRaces(core);
if (!core.modules.has(WORLD_LEGISLATING_MODULE_ID)) openWorldLegislating(core);

const officials = allOfficials(api);
const t1 = performance.now();
const end = new Date(`${start}T00:00:00Z`);
end.setUTCFullYear(end.getUTCFullYear() + years);
advanceCore(core, end.toISOString().slice(0, 10));
const yearSeconds = (performance.now() - t1) / 1000;

interface Vote {
  billId: string;
  memberId: string;
  chamber?: string;
  vote: string;
  position: Record<string, number>;
}
interface Bill {
  id: string;
  number: string;
  bodyOfficeId: string;
  provisions: { question?: string; value: number }[];
  status: string;
}
const legislature = api.moduleState(LEGISLATURE_MODULE_ID);
const bills = legislature.table("bills").rows() as unknown as Bill[];
const votes = legislature.table("votes").rows() as unknown as Vote[];
const sideOf = (memberId: string, fallback: string | null) => {
  const o = officialOf(api, memberId);
  return partySide(
    o?.independent ? o.independent.caucus : (o?.party ?? fallback),
  );
};
const report = bills
  .filter((b) => /:(legislature-|us-house|us-senate)/.test(b.bodyOfficeId))
  .map((bill) => {
    const chambers = new Map<string, Vote[]>();
    for (const v of votes.filter((x) => x.billId === bill.id && x.chamber))
      chambers.set(v.chamber!, [...(chambers.get(v.chamber!) ?? []), v]);
    return {
      number: bill.number,
      question: bill.provisions[0]?.question,
      change: (bill.provisions[0]?.value ?? 0) > 0 ? "enact" : "repeal",
      status: bill.status,
      chambers: [...chambers].map(([chamber, list]) => {
        const tally = (side: number) => {
          const mine = list.filter((v) => sideOf(v.memberId, null) === side);
          return `${mine.filter((v) => v.vote === "yes").length}-${mine.filter((v) => v.vote === "no").length}`;
        };
        const yes = list.filter((v) => v.vote === "yes").length;
        const no = list.filter((v) => v.vote === "no").length;
        const independents = list
          .map((v) => ({ v, o: officialOf(api, v.memberId) }))
          .filter(({ o }) => o?.independent)
          .map(({ v, o }) => ({
            seat: o!.seatId,
            caucus: o!.independent!.caucus,
            reason: o!.independent!.reason,
            vote: v.vote,
            party: Number((v.position.party ?? 0).toFixed(2)),
          }));
        return {
          chamber,
          total: `${yes}-${no}`,
          democrats: tally(-1),
          republicans: tally(1),
          others: tally(0),
          independents,
        };
      }),
    };
  });
const races = (
  api.moduleState(VOTING_MODULE_ID).table("races").rows() as unknown as {
    office: string;
    incumbentParty: string | null;
    winnerParty: string;
  }[]
).filter((r) => r.office !== "president");
console.log(
  JSON.stringify(
    {
      seed,
      place: `${world.place.displayName}`,
      placeKey: world.place.key,
      start,
      buildSeconds: Math.round(buildSeconds),
      heapAfterBuildMB: Math.round(heapAfterBuild / 1e6),
      yearSeconds: Math.round(yearSeconds),
      heapAfterYearMB: Math.round(process.memoryUsage().heapUsed / 1e6),
      officials: officials.length,
      people: core.people.size,
      races: races.length,
      seatsFlipped: races.filter(
        (r) =>
          r.incumbentParty &&
          partySide(r.incumbentParty) !== partySide(r.winnerParty),
      ).length,
      bills: report,
    },
    null,
    1,
  ),
);
