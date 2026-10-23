/**
 * One played year in a drawn place, reporting where the town lands against
 * each band the core research item sourced: visits on a day (ATUS 2025),
 * closeness change by tie kind (Roberts and Dunbar 2015), stress six months
 * after a death (Galatzer-Levy et al. 2018), opening pregnancies (NCHS 2024
 * and Jukic et al. 2013), the place's recall timing bars and its county
 * authority level. Bands calibrate; nothing here decides an outcome.
 * Run: node --import tsx scripts/research/core-year.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildBenchWorld } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { currentCloseness } from "../../src/core2/closeness";
import { affectAt } from "../../src/core2/emotion";
import { griefToday } from "../../src/core2/grief";
import { coreStateName } from "../../src/core2/place-lookup";
import { RENEWAL_MODULE_ID } from "../../src/core2/modules/renewal";
import {
  RECALLS_MODULE_ID,
  recallBarsFor,
  recallRule,
} from "../../src/core2/modules/recalls";
import type { IsoDate, PersonState } from "../../src/core2/types";

const root = join(import.meta.dirname, "..", "..");
const read = <T>(path: string): T =>
  JSON.parse(readFileSync(join(root, path), "utf8")) as T;
const atus = read<{ band: { low: number; high: number } }>(
  "data/research/core/atus-2025-socializing.json",
);
const ties = read<{
  band: {
    family: { low: number; high: number };
    other: { low: number; high: number };
  };
}>("data/research/core/tie-decay-panels-2015.json");
const affectBand = read<{ band: { low: number; high: number } }>(
  "data/research/core/affect-trajectories-2018.json",
);
const pregnancy = read<{
  rows: { gestationDaysFromOvulation: { value: number } };
}>("data/research/core/opening-pregnancy-2024.json");
const natality = read<{
  areas: Record<string, { fertilityPer1000Females15to44: number | null }>;
}>("data/research/renewal/natality-2024.json");
const areaAliases = read<{ aliases: Record<string, string> }>(
  "data/research/renewal/area-names.json",
).aliases;
const recallStatutes = read<{
  places: Record<
    string,
    { localRecall: boolean; tag?: string; afterFailed?: string }
  >;
}>("data/research/core/recall-timing-statutes-2026.json");
const naco = read<{
  places: Record<
    string,
    {
      authorityLevel?: number;
      authorityLabel?: string;
      countyGovernment?: boolean;
    }
  >;
}>("data/research/core/naco-2022-county-authority.json");

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const api = coreAPI(core);
const stateKey = world.place.stateJurisdictionKey ?? "";
const usps = stateKey.slice(3);
console.log(
  `${world.place.displayName} (${usps}), seed ${seed}, ${core.people.size} people, opening ${core.date}`,
);

const percent = (n: number, d: number) =>
  d ? `${((100 * n) / d).toFixed(1)}%` : "n/a";
const active = (person: PersonState) => person.alive && person.tier !== "husk";

// Opening pregnancies against the place's live-birth pregnancy share.
const start = core.date as IsoDate;
const women = [...core.people.values()].filter((person) => {
  const age = ageOnDate(person.birthDate, start);
  return (
    active(person) &&
    person.looks?.gender === "female" &&
    age >= 15 &&
    age <= 44
  );
});
// The renewal module rebuilds the opening's pregnancies on its first day, so
// they are counted after that day runs.
const reportPregnancies = () => {
  const renewal = api.moduleState(RENEWAL_MODULE_ID);
  const opening = renewal
    .table("pregnancies")
    .rows()
    .filter((row) => row.opening === true);
  const mothers = new Set(
    renewal
      .table("couples")
      .rows()
      .map((row) => row.motherId),
  );
  const partnered = women.filter((woman) => mothers.has(woman.id)).length;
  const areaName = areaAliases[stateKey] ?? coreStateName(usps) ?? usps;
  const gfr = natality.areas[areaName]?.fertilityPer1000Females15to44;
  const gestation = pregnancy.rows.gestationDaysFromOvulation.value;
  const expected = gfr ? ((gfr / 1000) * gestation) / 365.25 : undefined;
  const womenByTier = new Map<string, number>();
  for (const woman of women)
    womenByTier.set(woman.tier, (womenByTier.get(woman.tier) ?? 0) + 1);
  console.log(
    `opening pregnancies (SG-M1-opening-pregnancies): ${opening.length} of ${women.length} full-person women 15-44 (${percent(opening.length, women.length)}; ${partnered} of the women are in a couple the renewal module tracks); band for ${areaName}: ${gfr} births per 1,000 x ${gestation} / 365.25 days = ${expected ? (100 * expected).toFixed(2) : "n/a"}%; women by tier ${JSON.stringify(Object.fromEntries(womenByTier))}; records ${
      opening
        .slice(0, 3)
        .map((row) => row.id)
        .join(", ") || "none"
    }`,
  );
};

// Closeness at the opening, for every tie, to compare a year on.
const startCloseness = new Map<string, { kind: string; level: number }>();
for (const [key, row] of core.relationships)
  startCloseness.set(key, {
    kind: row.kind,
    level: currentCloseness(core, row, start),
  });

const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const end = addDays(makeIsoDate(core.date), 365);
const visitDays = new Map<string, { days: number; visits: number }>();
const stress = new Map<string, number[]>();
const losses = new Map<string, { day: number; eventId: string }>();
const seenLoss = new Map<string, Set<string>>();
let day = 0;
const visitExample: string[] = [];
while (core.date < end) {
  dev.advance(addDays(makeIsoDate(core.date), 1));
  day += 1;
  if (day === 1) reportPregnancies();
  const date = core.date as IsoDate;
  const ran = addDays(makeIsoDate(date), -1);
  for (const person of core.people.values()) {
    if (!active(person)) continue;
    if (ageOnDate(person.birthDate, date) >= 15) {
      const row = visitDays.get(person.tier) ?? { days: 0, visits: 0 };
      row.days += 1;
      if (person.lastContactDate === ran) {
        row.visits += 1;
        if (visitExample.length < 3)
          visitExample.push(`${person.id} on ${ran}`);
      }
      visitDays.set(person.tier, row);
    }
    const series = stress.get(person.id) ?? [];
    series[day] = affectAt(person.affect, date).stress;
    stress.set(person.id, series);
    const grief = griefToday(api, person);
    if (!grief.sourceIds.length) continue;
    const seen = seenLoss.get(person.id) ?? new Set<string>();
    for (const id of grief.sourceIds)
      if (!seen.has(id)) {
        seen.add(id);
        if (!losses.has(person.id)) losses.set(person.id, { day, eventId: id });
      }
    seenLoss.set(person.id, seen);
  }
}

// Visits: the share of adult-days with a contact act, by tier.
let allDays = 0,
  allVisits = 0;
const byTier: string[] = [];
for (const [tier, row] of visitDays) {
  allDays += row.days;
  allVisits += row.visits;
  byTier.push(`${tier} ${percent(row.visits, row.days)} of ${row.days}`);
}
console.log(
  `visits (unmodeledLeisureValuePerHour): ${percent(allVisits, allDays)} of adult-days had a visit; band ${atus.band.low}% to ${atus.band.high}% (ATUS 2025 socializing and communicating); by tier: ${byTier.join("; ")}; e.g. ${visitExample.join(", ")}`,
);

// Closeness: mean change over the year by tie kind.
const change = new Map<string, { sum: number; n: number; fell: number }>();
let tieExample = "";
for (const [key, before] of startCloseness) {
  const row = core.relationships.get(key);
  if (!row) continue;
  const delta = currentCloseness(core, row) - before.level;
  const cell = change.get(before.kind) ?? { sum: 0, n: 0, fell: 0 };
  cell.sum += delta;
  cell.n += 1;
  if (delta < 0) cell.fell += 1;
  change.set(before.kind, cell);
  if (!tieExample)
    tieExample = `${key} ${before.level.toFixed(3)} to ${(before.level + delta).toFixed(3)}`;
}
for (const [kind, cell] of change) {
  const band = kind === "family" ? ties.band.family : ties.band.other;
  console.log(
    `closeness (${kind}): mean change ${(cell.sum / cell.n).toFixed(3)} a year over ${cell.n} ties, ${percent(cell.fell, cell.n)} fell; band ${band.low} to ${band.high} (Roberts and Dunbar 2015, rescaled)`,
  );
}
console.log(`closeness example tie ${tieExample}`);

// Stress after a death: raised six months on by half its rise or more.
const followDays = 182;
let bereaved = 0,
  rose = 0,
  raised = 0;
const lossExample: string[] = [];
for (const [personId, loss] of losses) {
  const series = stress.get(personId);
  if (!series || loss.day < 2 || loss.day + followDays > day) continue;
  bereaved += 1;
  const before = series[loss.day - 1]!;
  const peak = Math.max(...series.slice(loss.day, loss.day + 15));
  if (peak <= before) continue;
  rose += 1;
  if (series[loss.day + followDays]! - before >= (peak - before) / 2)
    raised += 1;
  if (lossExample.length < 3) lossExample.push(`${personId} (${loss.eventId})`);
}
console.log(
  `stress after a death (SG-P8-emotion-model): ${bereaved} people bereaved with six months to follow; stress rose for ${rose}; ${raised} still raised by half the rise or more at ${followDays} days (${percent(raised, rose)}); band ${(affectBand.band.low * 100).toFixed(1)}% to ${(affectBand.band.high * 100).toFixed(1)}% (chronic plus delayed onset, Galatzer-Levy et al. 2018); e.g. ${lossExample.join(", ") || "none"}`,
);

// Recall: the drawn place's own bars and any petition in the year.
const rule = recallRule(api);
const statute = recallStatutes.places[usps];
const recalls = api.moduleState(RECALLS_MODULE_ID).table("recalls").rows();
console.log(
  `recall (SG-GOV-recall-bars-national): ${usps} ${rule ? `has a petitioned local recall; bars for a four-year term ${JSON.stringify(recallBarsFor(usps, 4) ?? "national estimate recallTermOpeningDays")}; statute row ${statute?.tag ?? "none"}; after a failed recall: ${statute?.afterFailed ?? "not read"}` : "has no petitioned local recall, so no bar applies"}; ${recalls.length} recall petitions in the year${
    recalls.length
      ? ` (${recalls
          .slice(0, 3)
          .map((row) => `${row.id} ${row.status}`)
          .join(", ")})`
      : ""
  }`,
);

// County authority: the place's NACo level, which no engine reads yet.
const county = naco.places[usps];
console.log(
  `county authority (SG-GOV-policy-power-conditions): ${usps} ${county?.countyGovernment === false ? "has no county government" : `NACo level ${county?.authorityLevel} (${county?.authorityLabel})`}; the authority reader does not read it yet (builder item core-policy-authority-limited-cell-predicates), so no town total lands against it this year`,
);
