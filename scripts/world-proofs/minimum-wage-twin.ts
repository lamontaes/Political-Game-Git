/**
 * A minimum-wage twin pair: the same generated world twice, one with a state
 * minimum-wage bill passed the real way (draft, every chamber votes yes, the
 * executive signs, the vote is held) and one without, both run the same
 * number of months. Reports, for each, what the employers' own books did:
 * low-wage jobs, jobs held, hours paid, payroll, the prices the firms charge
 * and the firms open, so the effect of a higher floor on staffing and prices
 * is read from the employers, not from a hand-set factor.
 *
 * node --import tsx scripts/world-proofs/minimum-wage-twin.ts <seed> [months]
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
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import type { CoreState } from "../../src/core2/types";

setBookkeeping(false);
const seed = process.argv[2] ?? "mw2";
const months = Number(process.argv[3] ?? 24);

function enact(core: CoreState): boolean {
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
  if (!seat || !policy || !policy.authority.allowed) return false;
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
  return result.status === "enacted" || result.status === "overridden";
}

function read(core: CoreState, label: string) {
  const api = coreAPI(core);
  const rt = residentsRuntime(core)!;
  const floor = lawInForce(api, "minimum-wage").value ?? 0;
  const line = api.parameter("jobsLowWageLineHourlyMinor");
  type J = {
    organizationId: string;
    hourlyMinor?: number;
    hoursDaily?: number;
    wageDailyMinor: number;
    endsAt?: string;
  };
  const live = [
    ...core.jobs.values(),
    ...(rt.jobs.values() as Iterable<J>),
  ].filter(
    (j: J) =>
      j.endsAt === undefined && core.finance.businesses.has(j.organizationId),
  ) as J[];
  const lowWage = live.filter(
    (j) => (j.hourlyMinor ?? 0) < Math.max(line, floor),
  ).length;
  const hours = live.reduce((n, j) => n + (j.hoursDaily ?? 0), 0);
  const payroll = live.reduce((n, j) => n + j.wageDailyMinor * 365, 0);
  const books = [...core.finance.businesses.values()].filter(
    (b) => !b.closedAt,
  );
  const price =
    books.reduce((n, b) => n + b.price / (b.anchorPrice || 1), 0) /
    Math.max(1, books.length);
  console.log(
    `${label}: floor ${floor}, jobs at firms ${live.length}, under max(line,floor) ${lowWage}, hours/day ${Math.round(hours)}, yearly payroll $${Math.round(payroll / 100)}, firms open ${books.length}, mean price index ${price.toFixed(4)}`,
  );
}

for (let attempt = 0; attempt < 12; attempt++) {
  const place = drawPlace(attempt ? `${seed}:${attempt}` : seed, "min-wage");
  const build = () =>
    buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    }).core;
  const withLaw = build();
  if (!enact(withLaw)) continue;
  const control = build();
  const end = (c: CoreState) =>
    advanceCore(c, addDays(makeIsoDate(gameStartDate()), months * 30));
  end(withLaw);
  end(control);
  console.log(
    `place ${place.name} (${place.key}), seed ${place.seed}, ${months} months`,
  );
  read(control, "control ");
  read(withLaw, "with law");
  process.exit(0);
}
console.log(
  JSON.stringify({ seed, error: "no drawn state enacted a minimum-wage bill" }),
);
