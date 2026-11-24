/**
 * A minimum-wage bill in a played year: a state raises its minimum wage the
 * real way (draft, every chamber votes yes, the executive signs, the vote is
 * held), the world runs, and the live jobs still paid under the new floor are
 * counted, named and counted workers, with the pay changes the jobs engine
 * recorded and the largest employers still under it.
 *
 * node --import tsx scripts/world-proofs/minimum-wage-reach.ts <seed> [months] [placeKey]
 */
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { billCatalog, provisionFor } from "../../src/core2/bill-catalog";
import { coreAPI } from "../../src/core2/state";
import { townSeats } from "../../src/core2/modules/offices";
import {
  bodyOf,
  castMemberVote,
  chambersOf,
  draftBill,
  executiveDecision,
  holdVote,
  members,
  memberKey,
} from "../../src/core2/modules/legislature";
import { lawInForce } from "../../src/core2/modules/laws";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { lowWageStaffFactor } from "../../src/core2/jobs-web";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";

setBookkeeping(false);
const seed = process.argv[2] ?? "mw1";
const months = Number(process.argv[3] ?? 3);
const fixedKey = process.argv[4];
for (let attempt = 0; attempt < 12; attempt++) {
  const place = fixedKey
    ? { name: fixedKey, key: fixedKey, seed }
    : drawPlace(attempt ? `${seed}:${attempt}` : seed, "min-wage");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  const seat = townSeats(api).find(
    (r) =>
      r.office.level === "state" &&
      r.holder?.personId &&
      bodyOf(api, r.office.id) &&
      r.office.kind.startsWith("legislature-"),
  );
  const policy = billCatalog(api, "state" as never)
    .flatMap((s) => s.topics.flatMap((t) => t.policies))
    .find((x) => x.id.includes("minimum-wage"));
  if (!seat || !policy || !policy.authority.allowed) continue;
  const lowLine = api.parameter("jobsLowWageLineHourlyMinor");
  const factors = () => {
    const rt0 = residentsRuntime(core)!;
    const out: number[] = [];
    for (const row of api
      .moduleState("jobs")
      .table("employers")
      .rows() as unknown as { id: string }[]) {
      const placeId = core.organizations.get(row.id)?.placeId;
      if (!placeId) continue;
      const jobs = [...core.jobs.values(), ...rt0.jobs.values()].filter(
        (j) => j.organizationId === row.id && j.endsAt === undefined,
      );
      const low = jobs.filter((j) => (j.hourlyMinor ?? 0) < lowLine).length;
      out.push(lowWageStaffFactor(api, placeId, low, jobs.length));
    }
    return {
      moved: out.filter((f) => f !== 1).length,
      min: Math.min(...out, 1),
    };
  };
  const factorBefore = factors();
  const before = lawInForce(api, "minimum-wage").value ?? 0;
  const amount = Math.max(1, Math.round((policy.inForce ?? 1) * 1.5 + 1));
  const bill = draftBill(api, {
    bodyOfficeId: seat.office.id,
    sponsorId: seat.holder!.personId!,
    provisions: [
      provisionFor({
        policyId: policy.id,
        operation: (policy.operations.includes("enact")
          ? "enact"
          : "raise") as never,
        amount,
      }),
    ],
  });
  for (const ch of chambersOf(api, bill))
    for (const m of members(api, ch))
      castMemberVote(api, bill.id, memberKey(m), "yes");
  executiveDecision(api, bill.id, true);
  const result = holdVote(api, bill.id);
  if (result.status !== "enacted" && result.status !== "overridden") continue;
  advanceCore(core, addDays(makeIsoDate(core.date), months * 30));
  const floor = lawInForce(api, "minimum-wage").value ?? 0;
  const rt = residentsRuntime(core)!;
  type J = {
    id: string;
    organizationId: string;
    hourlyMinor?: number;
    endsAt?: string;
  };
  const under = (j: J) =>
    j.endsAt === undefined &&
    (j.hourlyMinor ?? 0) > 0 &&
    (j.hourlyMinor ?? 0) < floor &&
    core.organizations.get(j.organizationId)?.outsideFlow === undefined;
  const named = [...core.jobs.values()].filter(under);
  const counted = [...rt.jobs.values()].filter(under);
  const all = [...named, ...counted];
  const byOrg = new Map<string, number>();
  for (const j of all)
    byOrg.set(j.organizationId, (byOrg.get(j.organizationId) ?? 0) + 1);
  const raises = (
    api.moduleState("jobs").table("raises").rows() as unknown as {
      id: string;
      values: { toHourlyMinor: number };
    }[]
  ).filter((r) => r.values.toHourlyMinor >= floor);
  console.log(
    JSON.stringify({
      place: place.name,
      key: place.key,
      seed: place.seed,
      policy: policy.id,
      floorBefore: before,
      floorAfter: floor,
      date: core.date,
      jobsUnderFloor: { named: named.length, counted: counted.length },
      employersUnderFloor: [...byOrg].sort((a, b) => b[1] - a[1]).slice(0, 4),
      staffingFactor: { before: factorBefore, after: factors() },
      payChangesToFloor: raises.length,
      exampleRecords: raises.slice(0, 3).map((r) => r.id),
    }),
  );
  process.exit(0);
}
console.log(
  JSON.stringify({ seed, error: "no drawn state enacted a minimum-wage bill" }),
);
