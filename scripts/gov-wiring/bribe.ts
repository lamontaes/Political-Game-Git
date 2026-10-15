/**
 * Proof that a bribe buys a real decision in the played world, and that a
 * scandal reaches voters only through the news: a council member files a
 * minimum-wage raise the state lets the town pass, the bill goes to its vote
 * through the ordinary engines, and the run prints every bribe weighed over
 * it, each member's vote with its parts (the bribe among them), then plays
 * on to show whether the bribe surfaced, was reported and reached voters.
 *
 * Run: node --max-old-space-size=8192 --import tsx scripts/gov-wiring/bribe.ts [seed] [days]
 */
import { createHash } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { drawPlace } from "../core2-year/place";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { townSeats } from "../../src/core2/modules/offices";
import { lawInForce } from "../../src/core2/modules/laws";
import {
  authorityFor,
  draftBill,
  holdVote,
  votesOn,
  type Provision,
} from "../../src/core2/modules/legislature";
import {
  CORRUPTION_MODULE_ID,
  scandalsOf,
} from "../../src/core2/modules/corruption";
import { newsKey } from "../../src/core2/modules/news";

setBookkeeping(false);
const start =
  process.argv[2] ??
  createHash("sha256").update(String(Date.now())).digest("hex");
const days = Number(process.argv[3] ?? 365);

for (let attempt = 0; attempt < 12; attempt += 1) {
  const seed = attempt ? `${start}:${attempt}` : start;
  const place = drawPlace(seed, "bribe-proof");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  const council = townSeats(api).filter(
    (s) => s.office.kind === "council" && s.holder?.personId,
  );
  const floor = lawInForce(api, "minimum-wage").value;
  if (council.length < 3 || floor === null) continue;
  const raise: Provision = {
    kind: "law-amount",
    series: "minimum-wage",
    value: floor + Number(process.env.RAISE_MINOR ?? 300),
    unit: "minor/hour",
  };
  if (!authorityFor(api, raise).allowed) {
    console.log(
      JSON.stringify({ skipped: place.name, why: "no local minimum wage" }),
    );
    continue;
  }
  const sponsor = council[0]!.holder!.personId!;
  const drafted = draftBill(api, {
    bodyOfficeId: council[0]!.office.id,
    sponsorId: sponsor,
    provisions: [raise],
  });
  const voted = holdVote(api, drafted.id);
  const crimes = api
    .moduleState(CORRUPTION_MODULE_ID)
    .table("crimes")
    .rows() as unknown as {
    id: string;
    offererId: string;
    officialId: string;
    amountMinor: number;
    subjectId: string;
    offered: boolean;
    taken: boolean;
    reasons: unknown;
  }[];
  console.log(
    JSON.stringify(
      {
        seed,
        place: `${place.name} (${place.key})`,
        bill: drafted.number,
        billId: drafted.id,
        status: voted.status,
        bribes: crimes.filter((c) => c.subjectId === drafted.id),
        votes: votesOn(api, drafted.id).map((v) => ({
          memberId: v.memberId,
          vote: v.vote,
          total: Number(v.position.total.toFixed(3)),
          bribe: Number((v.position.bribe ?? 0).toFixed(3)),
          views: Number(v.position.views.toFixed(3)),
          lobby: Number(v.position.lobby.toFixed(3)),
        })),
      },
      null,
      1,
    ),
  );
  const taken = crimes.filter((c) => c.subjectId === drafted.id && c.taken);
  const end = addDays(makeIsoDate(core.date), days);
  advanceCore(core, end);
  const named = [...core.people.values()].filter(
    (p) => p.alive && p.tier !== "husk",
  );
  for (const crime of taken) {
    const surfaced = api
      .moduleState(CORRUPTION_MODULE_ID)
      .table("surfaced")
      .query("byCrime", [crime.id]);
    const stories = scandalsOf(api, crime.officialId, core.date);
    console.log(
      JSON.stringify({
        crime: crime.id,
        surfaced,
        reported: stories,
        heardBy: stories.length
          ? named.filter((p) =>
              stories.some((s) => api.knows(p.id, newsKey(s))),
            ).length
          : 0,
        namedAdults: named.length,
      }),
    );
  }
  break;
}
