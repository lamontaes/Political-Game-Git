/**
 * Bribes in played worlds against the officials the Justice Department
 * charges with public corruption (gov-bribes-in-played-worlds-measured,
 * Oct 25, 2026). For each seed it plays a place drawn from all 56 with every
 * module and counts the chain the corruption engine records: the chances to
 * offer (a lobbyist's first meeting with a member on a bill, and each contract
 * a body's members vote on), then bribes offered, taken, surfaced (a party told
 * someone) and reported to the press, per place-year and by the body the
 * official sat on. Beside them it prints, as an exploratory proxy only, the
 * state and local officials charged a year in 2014 to 2023 with federal public
 * corruption, per general-purpose local government and per state-level place
 * (data/research/corruption/doj-pin-2023-local-state-prosecutions.json). That
 * series counts officials, not bribe incidents, and every corruption offense
 * (bribery, extortion, fraud and others), so it is neither a floor nor a band
 * for bribes and no count here is judged against it. One run, one number.
 * Run: node --import tsx scripts/research/bribe-chain-years.ts [--months 24] seed...
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { CONTRACTS_MODULE_ID } from "../../src/core2/modules/contracts";
import {
  CORRUPTION_MODULE_ID,
  type CrimeRecord,
} from "../../src/core2/modules/corruption";
import { INTEREST_GROUPS_MODULE_ID } from "../../src/core2/modules/interest-groups";
import { LEGISLATURE_MODULE_ID } from "../../src/core2/modules/legislature";
import { coreAPI } from "../../src/core2/state";
import type { CoreAPI, CoreState } from "../../src/core2/types";
import { drawPlace } from "../core2-year/place";
import pin from "../../data/research/corruption/doj-pin-2023-local-state-prosecutions.json" with { type: "json" };
import corruptionRows from "../../src/core2/data/corruption/parameters.json" with { type: "json" };

const args = process.argv.slice(2);
const at = args.indexOf("--months");
const months = at >= 0 ? Number(args[at + 1]) : 24;
const given = at >= 0 ? args.filter((_, i) => i !== at && i !== at + 1) : args;
const seeds = given.length
  ? given
  : Array.from({ length: 4 }, () => randomBytes(8).toString("hex"));

const perYear = (counts: readonly number[], over: number) =>
  `${(Math.min(...counts) / over).toFixed(4)} to ${(Math.max(...counts) / over).toFixed(4)}`;
console.log(
  `proxy, not a band, ${pin.years[0]} to ${pin.years.at(-1)}: local officials charged a year per general-purpose local government ${perYear(pin.localOfficials.charged, pin.governments2022.generalPurpose)}; state officials charged a year per state-level place ${perYear(pin.stateOfficials.charged, pin.stateLevelPlaces)} (federal prosecutions only, every corruption offense, officials not incidents)`,
);

const rowsOf = <T>(api: CoreAPI, module: string, name: string): T[] =>
  api.state.modules.has(module)
    ? (api.moduleState(module).table(name).rows() as unknown as T[])
    : [];

/** The body whose decision a bribe was for: a contract's government, or the office of the body a bill was before. */
function bodyOf(api: CoreAPI, subjectId: string): string {
  if (subjectId.startsWith("contract:"))
    return `contract ${subjectId.split(":").slice(1, -2).join(":")}`;
  const bill = api.state.modules.has(LEGISLATURE_MODULE_ID)
    ? (api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .get(subjectId) as unknown as { bodyOfficeId?: string } | undefined)
    : undefined;
  return `bill ${bill?.bodyOfficeId ?? subjectId}`;
}

/** Each take term's mean and highest value over the offers, and the highest sum. */
function terms(crimes: readonly CrimeRecord[]): string {
  const takes = crimes.map((row) => row.reasons.take ?? {});
  if (!takes.length) return "none offered";
  const names = [...new Set(takes.flatMap((values) => Object.keys(values)))];
  const sums = takes.map((values) =>
    Object.values(values).reduce((sum, value) => sum + value, 0),
  );
  return [
    ...names.map((name) => {
      const values = takes.map((row) => row[name] ?? 0);
      return `${name} ${(values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(3)} (highest ${Math.max(...values).toFixed(3)})`;
    }),
    `sum highest ${Math.max(...sums).toFixed(3)}`,
  ].join(", ");
}

const tally = (keys: readonly string[]) => {
  const out = new Map<string, number>();
  for (const key of keys) out.set(key, (out.get(key) ?? 0) + 1);
  return Object.fromEntries([...out].sort((a, b) => b[1] - a[1]));
};

setBookkeeping(false);
const days = Math.round((months * 365.25) / 12);
for (const seed of seeds) {
  const place = drawPlace(seed, "bribe-chain");
  const started = Date.now();
  const world = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core as CoreState;
  const api = coreAPI(core);
  let day = makeIsoDate(core.date);
  const opening = day;
  const end = addDays(day, days);
  while (day < end) {
    day = addDays(day, 1);
    advanceCore(core, day);
  }
  const years = days / 365.25;
  const meetings = rowsOf<{ memberId: string; billId: string }>(
    api,
    INTEREST_GROUPS_MODULE_ID,
    "meetings",
  ).filter((row) => core.people.has(row.memberId));
  const awards = rowsOf<{ governmentId: string; basis: string }>(
    api,
    CONTRACTS_MODULE_ID,
    "awards",
  ).filter((row) => row.basis === "vote");
  const crimes = rowsOf<CrimeRecord>(api, CORRUPTION_MODULE_ID, "crimes");
  const byId = new Map(crimes.map((row) => [row.id, row]));
  const surfaced = rowsOf<{ crimeId: string }>(
    api,
    CORRUPTION_MODULE_ID,
    "surfaced",
  );
  const reported = rowsOf<{ id: string; crimeId: string }>(
    api,
    CORRUPTION_MODULE_ID,
    "reported",
  );
  const rate = (n: number) => (n / years).toFixed(2);
  const subject = (crimeId: string) =>
    bodyOf(api, byId.get(crimeId)?.subjectId ?? crimeId);
  console.log(
    [
      `\n${place.name}, ${place.state} (key ${place.key}, seed ${seed}): ${opening} to ${end}, ${years.toFixed(2)} years, ${((Date.now() - started) / 1000).toFixed(0)} s`,
      `  chances: ${meetings.length} lobbyist meetings with members on bills (${rate(meetings.length)} a year), by body ${JSON.stringify(tally(meetings.map((row) => bodyOf(api, row.billId))))}; ${awards.length} contract awards voted (${rate(awards.length)} a year), by government ${JSON.stringify(tally(awards.map((row) => row.governmentId)))}`,
      `  offered ${crimes.length} (${rate(crimes.length)} a year), taken ${crimes.filter((row) => row.taken).length}, surfaced ${new Set(surfaced.map((row) => row.crimeId)).size}, reported to the press ${new Set(reported.map((row) => row.crimeId)).size} (${rate(new Set(reported.map((row) => row.crimeId)).size)} a year)`,
      `  offered by body ${JSON.stringify(tally(crimes.map((row) => subject(row.id))))}; reported by body ${JSON.stringify(tally([...new Set(reported.map((row) => row.crimeId))].map(subject)))}`,
      `  each official's take terms, mean and highest over the offers, against the pull of refusing (${corruptionRows.corruptionHonestPull.value}): ${terms(crimes)}`,
      ...(crimes[0]
        ? [
            `  e.g. ${crimes[0].id}${reported[0] ? `; reported ${reported[0].id}` : ""}`,
          ]
        : []),
    ].join("\n"),
  );
}
