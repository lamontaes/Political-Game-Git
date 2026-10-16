/** Observe ordinary completed-home occupancy without inserting projects or movers. */
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { drawPlace } from "../../tests/golden-path/place";

const seed = process.argv[2];
if (!seed) throw new Error("Supply the base SHA seed.");
const months = Number(process.argv[3] ?? 12);
const place = drawPlace(seed, "world-business");
const started = performance.now();
const { core } = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const built = performance.now();
const api = coreAPI(core);
const rows = (name: string) => api.moduleState("housing").table(name).rows();
const cash = () =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (sum, row) => sum + row.liquidMinor,
    0,
  );
const outside = () =>
  [...core.cashJournal.externalFlowsByOwner.values()].reduce(
    (sum, row) => sum + row.netMinor,
    0,
  );
const initial = cash() + outside();
const start = core.date;
const checkpoints = [];
let previous = built;
for (let month = 1; month <= months; month++) {
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + month);
  advanceCore(core, date.toISOString().slice(0, 10));
  if (month % 12 === 0) {
    const now = performance.now();
    checkpoints.push({
      date: core.date,
      yearSeconds: (now - previous) / 1000,
      cashError: cash() + outside() - initial,
      projects: rows("projects").length,
      completed: rows("projects").filter((row) => !row.open).length,
      moves: rows("moves").length,
      stock: rows("stock"),
    });
    previous = now;
    console.error(JSON.stringify(checkpoints.at(-1)));
  }
}
const rt = residentsRuntime(core);
console.log(
  JSON.stringify(
    {
      seed,
      place,
      span: [start, core.date],
      buildSeconds: (built - started) / 1000,
      checkpoints,
      projects: rows("projects"),
      moves: rows("moves"),
      occupancy: rows("occupancy"),
      rentReads: rows("moves").map((row) => ({
        moveId: row.id,
        leaseId: row.leaseId,
        contract: core.finance.contracts.get(String(row.leaseId)),
        receipt: core.finance.latestReceiptsByContract.get(String(row.leaseId)),
        flow: rt?.flows.get(String(row.leaseId)),
      })),
      renewals: rows("renewals").filter(
        (row) => row.previousRentMinor !== undefined,
      ),
    },
    null,
    2,
  ),
);
if (checkpoints.some((row) => row.cashError)) process.exitCode = 1;
