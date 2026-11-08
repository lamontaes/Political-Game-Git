/**
 * Outside money in a played place: the town's cash (people and organizations)
 * by year against what the journal records as paid in from outside it, with
 * the largest outside owners, for the Dev Tester's finding that towns end
 * with billions of cash against an equal negative outside balance.
 *
 * node --import tsx scripts/world-proofs/outside-money.ts <seed> <placeKey> [years]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import type { CoreState } from "../../src/core2/types";

setBookkeeping(false);
const seed = process.argv[2] ?? "r7";
const placeKey = process.argv[3]!;
const years = Number(process.argv[4] ?? 3);
const start = gameStartDate();
const world = buildBenchWorld(seed, start, { twoLevel: true, placeKey });
const core: CoreState = world.core;
const dollars = (minor: number) => Math.round(minor / 100);
const cash = () => {
  let total = 0;
  for (const row of core.people.values()) total += row.liquidMinor;
  for (const row of core.organizations.values()) total += row.liquidMinor;
  return total;
};
const owners = () =>
  [...core.cashJournal.externalFlowsByOwner.entries()].map(([id, row]) => ({
    id,
    kind: core.organizations.get(id)?.kind ?? "person?",
    net: Number(row.netMinor),
  }));
const sum = (rows: { net: number }[]) => rows.reduce((n, r) => n + r.net, 0);
const cash0 = cash();
const net0 = sum(owners());
for (let y = 1; y <= years; y++) {
  advanceCore(core, addDays(makeIsoDate(start), y * 365));
  const rows = owners();
  const top = [...rows]
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    .slice(0, 4)
    .map((r) => `${r.kind}:${r.id.slice(-8)} ${dollars(r.net)}`)
    .join("; ");
  console.log(
    `year ${y}: cash +${dollars(cash() - cash0)}, outside net ${dollars(sum(rows) - net0)}, gap ${dollars(cash() - cash0 + (sum(rows) - net0))}; largest: ${top}`,
  );
}

const big = [...core.cashJournal.externalFlowsByOwner.entries()].sort(
  (a, b) => Math.abs(Number(b[1].netMinor)) - Math.abs(Number(a[1].netMinor)),
)[0]!;
console.log(
  "largest owner",
  big[0],
  JSON.stringify(big[1], (_k, v) =>
    typeof v === "bigint" ? Number(v) : v,
  ).slice(0, 600),
);
