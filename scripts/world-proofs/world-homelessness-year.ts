/**
 * Homelessness proof (OPUS-WORLD, owner Oct 14): build the played world as
 * the bench builds it, run a year, and print by record id every eviction
 * case, each removal and where the household went and why, the town's
 * housing status counts against HUD's 2024 point-in-time count, and the
 * chain for one person: the job they lost, the rent that went unpaid, the
 * case and the status.
 *
 * node --import tsx scripts/world-proofs/world-homelessness-year.ts <seed> [placeKey] [days]
 */
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { JOBS_MODULE_ID } from "../../src/core2/modules/jobs";
import { HOUSING_MODULE_ID } from "../../src/core2/modules/housing";
import {
  housingStatusCounts,
  type HousingStatusRow,
} from "../../src/core2/housing-homeless";
import hud from "../../docs/research/cloud-b-outcomes-2024/homelessness-hud-2024.json" with { type: "json" };
import { drawPlace } from "../../tests/golden-path/place";
import { composeJournal } from "../../src/director/journal";

const seed = process.argv[2] ?? `${Date.now()}`;
// A place drawn from all 56 by the seed, as the golden-path runner draws.
const placeKey = process.argv[3] || drawPlace(seed, "world-homelessness").key;
const days = Number(process.argv[4] ?? 365);
const start = gameStartDate();

const t0 = performance.now();
const world = buildBenchWorld(seed, start, { twoLevel: true, placeKey });
const core = world.core;
const api = coreAPI(core);
// The director watches every full person, so a removal's journal line can be read.
for (const person of core.people.values())
  if (person.alive && person.tier !== "husk")
    world.director.watch(core, person.id);
const end = new Date(`${start}T00:00:00Z`);
end.setUTCDate(end.getUTCDate() + days);
advanceCore(core, end.toISOString().slice(0, 10));
const seconds = (performance.now() - t0) / 1000;

const housing = api.moduleState(HOUSING_MODULE_ID);
const cases = housing.table("cases").rows() as unknown as {
  id: string;
  leaseId: string;
  householdId: string;
  stage: string;
  counted?: boolean;
  noticeAt: string;
  removedAt?: string;
  owedAtNoticeMinor: number;
}[];
const statuses = housing
  .table("statuses")
  .rows() as unknown as HousingStatusRow[];
const town = core.placeMetadata?.housingTown ?? "";
const usps = core.placeMetadata?.housingState ?? "";
const counts = housingStatusCounts(api, town);
const people =
  counts.housed + counts["doubled-up"] + counts.sheltered + counts.unsheltered;
const homeless = counts.sheltered + counts.unsheltered;
const hudPlace = (hud.places as Record<string, { per10k: number }>)[
  `US-${usps}`
];

const changes = core.modules.has(JOBS_MODULE_ID)
  ? (api.moduleState(JOBS_MODULE_ID).table("changes").rows() as unknown as {
      id: string;
      date: string;
      personId: string;
      kind: string;
      reasonKey: string;
    }[])
  : [];
// The journal lines the director wrote about each removal, for anyone it watched.
const journal = statuses.flatMap((row) =>
  row.memberIds.flatMap((personId) =>
    core.people.has(personId)
      ? composeJournal(core, world.director, personId).flatMap((chapter) =>
          chapter.lines
            .filter((line) =>
              line.sourceRecordIds.some((id) => id.includes(row.caseId)),
            )
            .map((line) => ({
              personId,
              text: line.text,
              sourceRecordIds: line.sourceRecordIds,
            })),
        )
      : [],
  ),
);
const sample =
  statuses.find((row) =>
    journal.some((line) => row.memberIds.includes(line.personId)),
  ) ?? statuses[0];
const member = sample?.memberIds[0];
const person = member ? core.people.get(member) : undefined;
const removal = sample ? cases.find((c) => c.id === sample.caseId) : undefined;

console.log(
  JSON.stringify(
    {
      seed,
      place: placeKey,
      span: [start, core.date],
      seconds: Math.round(seconds),
      cases: {
        opened: cases.length,
        counted: cases.filter((c) => c.counted).length,
        byStage: cases.reduce<Record<string, number>>((n, c) => {
          n[c.stage] = (n[c.stage] ?? 0) + 1;
          return n;
        }, {}),
      },
      foreclosures: housing.table("foreclosures").rows(),
      statuses: statuses.map((row) => ({
        id: row.id,
        status: row.status,
        since: row.since,
        people: row.memberIds.length,
        counted: row.counted,
        caseId: row.caseId,
        reasons: row.reasons,
      })),
      town: {
        placeId: town,
        counts,
        homelessPer10k: people ? (homeless / people) * 10_000 : 0,
        hudStatePer10k: hudPlace?.per10k,
      },
      chain: sample && {
        who: person && `${person.givenName} ${person.familyName}`,
        personId: member,
        jobChanges: changes.filter((c) => c.personId === member),
        case: removal,
        status: sample,
      },
      journal,
    },
    null,
    2,
  ),
);
