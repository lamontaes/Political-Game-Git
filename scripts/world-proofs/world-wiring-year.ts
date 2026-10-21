/**
 * Stress-audit wiring proof (OPUS-WORLD, Oct 14): build the played world as
 * the bench builds it (two-level, every module), run a game year, and print
 * each read by record id: a person who moved and their pull's parts, the
 * aides and their hire reasons, withholding on aides living out of town, the
 * wage shortfalls an employer's credit line would have covered (registered
 * stopgap), and voucher eligibility rows ended by a closure.
 *
 * node --import tsx scripts/world-proofs/world-wiring-year.ts <seed> [placeKey] [days]
 */
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { departuresSeen, watchDepartures } from "../../src/core2/modules/moves";
import { lawChain } from "../../src/core2/modules/laws";
import { withholdingOf } from "../../src/core2/modules/budgets";
import type { StafferRow } from "../../src/core2/modules/staff";
import { REACH_B_MODULE_ID } from "../../src/core2/law-reach/group-b-store";
import { drawPlace } from "../../tests/golden-path/place";

const seed = process.argv[2] ?? `${Date.now()}`;
// A place drawn from all 56 by the seed, as the golden-path runner draws.
const placeKey = process.argv[3] || drawPlace(seed, "world-wiring").key;
const days = Number(process.argv[4] ?? 365);
const start = gameStartDate();

const t0 = performance.now();
const world = buildBenchWorld(seed, start, { twoLevel: true, placeKey });
const core = world.core;
const api = coreAPI(core);
watchDepartures(core);
const end = new Date(`${start}T00:00:00Z`);
end.setUTCDate(end.getUTCDate() + days);
advanceCore(core, end.toISOString().slice(0, 10));
const seconds = (performance.now() - t0) / 1000;

const town = lawChain(api).townPlaceId;
const name = (id: string) => {
  const p = core.people.get(id);
  return p ? `${p.givenName} ${p.familyName}` : id;
};
const departures = departuresSeen(core);
const sample =
  departures.find((row) =>
    Object.keys(row.reasons).some((key) => key.startsWith("push:")),
  ) ?? departures[0];
const staff = core.modules.has("core2-staff-v1")
  ? (api
      .moduleState("core2-staff-v1")
      .table("staff")
      .rows() as unknown as StafferRow[])
  : [];
const outOfTown = staff.filter(
  (row) => core.people.get(row.personId)?.placeId !== town,
);
const withheldOutside = outOfTown.flatMap((row) =>
  withholdingOf(api, row.personId).slice(0, 1),
);
const ages = staff.map(
  (row) =>
    Number(core.date.slice(0, 4)) -
    Number(core.people.get(row.personId)!.birthDate.slice(0, 4)),
);
const reach = core.modules.has(REACH_B_MODULE_ID)
  ? (api
      .moduleState(REACH_B_MODULE_ID)
      .table("organizations")
      .rows() as unknown as { id: string; endedOn?: string }[])
  : [];

console.log(
  JSON.stringify(
    {
      seed,
      place: placeKey,
      span: [start, core.date],
      seconds: Math.round(seconds),
      moves: {
        departures: departures.length,
        withPushes: departures.filter((row) =>
          Object.keys(row.reasons).some((key) => key.startsWith("push:")),
        ).length,
        sample: sample && {
          id: sample.id,
          who: name(sample.personId),
          reasons: sample.reasons,
          reads: sample.reads,
        },
      },
      staff: {
        aides: staff.length,
        outOfTown: outOfTown.length,
        family: staff.filter((row) => row.reasons?.family).length,
        counted: staff.filter((row) =>
          row.reasonRecordIds?.some((id) => id.startsWith("counted:")),
        ).length,
        oldest: ages.length ? Math.max(...ages) : null,
        sample: staff.slice(0, 3),
      },
      withholding: {
        outOfTownAidesWithheld: withheldOutside.length,
        sample:
          withheldOutside[0] ?? withholdingOf(api, staff[0]?.personId ?? "")[0],
        estimated: staff.filter((row) =>
          withholdingOf(api, row.personId).some(
            (w) => w.source.tag === "ESTIMATED",
          ),
        ).length,
      },
      wagesCreditLineStopgapHit: core.stopgapHits.has(
        "SG-WORLD-wages-skip-credit-line",
      ),
      vouchers: {
        rows: reach.length,
        ended: reach
          .filter((row) => row.endedOn)
          .map((row) => {
            const organizationId = row.id.split("|")[1] ?? "";
            const closed = core.eventIds.has(
              `event:business.closed:${organizationId}`,
            );
            return { id: row.id, endedOn: row.endedOn, closed };
          }),
      },
    },
    null,
    2,
  ),
);
