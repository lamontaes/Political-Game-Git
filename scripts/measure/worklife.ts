/* eslint-disable @typescript-eslint/no-explicit-any */
// Rows 5, 12, 13, 14: working lives and life events of the player, full adults and filled-in counted adults.
// tsx scripts/measure/worklife.ts <seed> [fillCount]
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { fillInPerson } from "../../src/core2/state";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { openWholePast } from "../../src/core2/modules/people";
import { lifeOf } from "../../src/core2/person-life";
import { PAST_WORK_SPELL } from "../../src/core2/past-work";
import { ageOn } from "../../src/core2/counted-groups";
import { TOWN_MEDIAN_TENURE_BY_AGE } from "../../src/core2/town-workplaces";
setBookkeeping(false);
const [seed = "w1", fillArg = "300"] = process.argv.slice(2);
// Override with PLACEKEY and SEEDHEX to replay a named world; otherwise a drawn place.
const place = process.env.PLACEKEY
  ? {
      key: process.env.PLACEKEY,
      seed: process.env.SEEDHEX!,
      name: process.env.PLACEKEY,
    }
  : drawPlace(seed, "worklife");
const w: any = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core: any = w.core;
const age = (p: any) => ageOn(p.birthDate, core.date);
const med = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)]! : NaN;
};
const mean = (a: number[]) =>
  a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const r2 = (n: number) => +n.toFixed(2);
// full adults 25-64 (non-husk), not the player
const full: string[] = [...core.people.values()]
  .filter(
    (p: any) =>
      p.alive &&
      p.tier !== "husk" &&
      age(p) >= 18 &&
      age(p) < 65 &&
      p.id !== w.playerId,
  )
  .map((p: any) => p.id);
// counted adults 25-64, spread sample, filled in
const rt: any = residentsRuntime(core);
const counted: string[] = [];
for (const h of rt.store.households)
  for (const m of rt.store.countedMembers(h)) {
    const f = rt.store.factsOf(m);
    const a = ageOn(f.birthDate, core.date);
    if (a >= 18 && a < 65) counted.push(f.id);
  }
const step = Math.max(1, Math.floor(counted.length / Number(fillArg)));
const fillIds = counted
  .filter((_, i) => i % step === 0)
  .slice(0, Number(fillArg));
for (const id of fillIds) fillInPerson(core, id as any);
const filled = fillIds.filter((id) => core.people.has(id));
const all = [...full, ...filled];
for (const id of all) openWholePast(core, id as any);
openWholePast(core, w.playerId);
const spellCache = new Map<string, any[]>();
const spellsOf = (id: string) => {
  let r = spellCache.get(id);
  if (!r) {
    r = lifeOf(core, id as any).filter(
      (e: any) =>
        e.life === "work" &&
        e.what === "job-started" &&
        e.record === PAST_WORK_SPELL,
    );
    spellCache.set(id, r);
  }
  return r;
};
// ---- row 5: event counts by kind
const kinds = (id: string) => {
  const m = new Map<string, number>();
  for (const e of lifeOf(core, id as any)) {
    const k = `${e.life}.${e.what}`;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
};
const avgKinds = (ids: string[]) => {
  const t = new Map<string, number>();
  for (const id of ids)
    for (const [k, v] of kinds(id)) t.set(k, (t.get(k) ?? 0) + v);
  return Object.fromEntries(
    [...t].sort().map(([k, v]) => [k, r2(v / Math.max(1, ids.length))]),
  );
};
const eventsPerPerson = (ids: string[]) =>
  r2(mean(ids.map((id) => lifeOf(core, id as any).length)));
const row5 = {
  player: Object.fromEntries([...kinds(w.playerId)].sort()),
  playerAge: age(core.people.get(w.playerId)),
  fullAdultsAvgPerPerson: avgKinds(full),
  filledAvgPerPerson: avgKinds(filled),
  eventsPerPerson: {
    player: lifeOf(core, w.playerId).length,
    full: eventsPerPerson(full),
    filled: eventsPerPerson(filled),
  },
  noWorkSpellShare: {
    full: r2(
      full.filter((i) => !spellsOf(i).length).length / Math.max(1, full.length),
    ),
    filled: r2(
      filled.filter((i) => !spellsOf(i).length).length /
        Math.max(1, filled.length),
    ),
  },
};
// ---- row 12/13: spells
const band = (a: number) => TOWN_MEDIAN_TENURE_BY_AGE.find(([b]) => a < b)![0];
const group = (ids: string[]) => {
  const per: number[] = [],
    distinct: number[] = [];
  let spells = 0,
    noOrg = 0;
  const orgs = new Map<string, number>();
  const tenureBy = new Map<number, number[]>();
  const perBand = new Map<number, number[]>();
  for (const id of ids) {
    const sp = spellsOf(id);
    per.push(sp.length);
    spells += sp.length;
    const set = new Set<string>();
    const b = band(age(core.people.get(id)));
    (perBand.get(b) ?? perBand.set(b, []).get(b)!).push(sp.length);
    for (const s of sp) {
      if (!s.facts.organizationId) noOrg++;
      else {
        set.add(s.facts.organizationId);
        const n = core.organizations.get(s.facts.organizationId)?.name ?? "?";
        orgs.set(n, (orgs.get(n) ?? 0) + 1);
      }
      if (s.facts.endedAt && s.facts.end !== "held-at-start") {
        const y =
          (Date.parse(s.facts.endedAt) - Date.parse(s.facts.startedAt)) /
          31557600000;
        (tenureBy.get(b) ?? tenureBy.set(b, []).get(b)!).push(y);
      }
    }
    distinct.push(set.size);
  }
  return {
    people: ids.length,
    spells,
    spellsPerPerson: {
      mean: r2(mean(per)),
      median: med(per),
      p90: [...per].sort((a, b) => a - b)[Math.floor(per.length * 0.9)],
      max: Math.max(...per),
      peopleWithAnySpell: per.filter((n) => n > 0).length,
      meanAmongThoseWithAny: r2(mean(per.filter((n) => n > 0))),
      medianAmongThoseWithAny: med(per.filter((n) => n > 0)),
      over7: per.filter((n) => n >= 7).length,
    },
    distinctEmployersPerPerson: {
      mean: r2(mean(distinct)),
      median: med(distinct),
    },
    spellsWithNoEmployer: noOrg,
    shareNoEmployer: r2(noOrg / Math.max(1, spells)),
    peopleWithAnyNoEmployerSpell: ids.filter((i) =>
      spellsOf(i).some((s) => !s.facts.organizationId),
    ).length,
    completedSpellMedianYearsByAgeBand: Object.fromEntries(
      [...tenureBy]
        .sort((a, b) => a[0] - b[0])
        .map(([b, a]) => [`<${b}`, { n: a.length, median: r2(med(a)) }]),
    ),
    blsMedianTenure: Object.fromEntries(
      TOWN_MEDIAN_TENURE_BY_AGE.map(([b, y]) => [`<${b}`, y]),
    ),
    spellsPerPersonByAgeBand: Object.fromEntries(
      [...perBand]
        .sort((a, b) => a[0] - b[0])
        .map(([b, a]) => [`<${b}`, r2(mean(a))]),
    ),
    distinctEmployersInTown: orgs.size,
    top: [...orgs].sort((a, b) => b[1] - a[1]).slice(0, 8),
  };
};
const row12 = { full: group(full), filled: group(filled) };
// ---- row 14: parent-child shared employers
const emp = (id: string) =>
  new Set(
    spellsOf(id)
      .map((s) => s.facts.organizationId)
      .filter(Boolean) as string[],
  );
const pairs: { child: string; parent: string; rel: string }[] = [];
const pool = new Set(all);
for (const id of all)
  for (const f of (core.people.get(id).pastFacts ?? []) as any[]) {
    if (f.kind === "family:parent") {
      const o = f.facts?.otherPersonId;
      if (!o) continue;
      const op = core.people.get(o);
      if (op && op.tier !== "husk") {
        if (!pool.has(o)) openWholePast(core, o);
        pairs.push({ child: id, parent: o, rel: f.kind });
      } else if (!op) {
        // counted parent: fill in
        try {
          fillInPerson(core, o);
          openWholePast(core, o);
          if (core.people.get(o))
            pairs.push({ child: id, parent: o, rel: f.kind });
        } catch {
          /* not counted */
        }
      }
    }
  }
const overlap = (a: Set<string>, b: Set<string>) => {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
};
const withWork = pairs.filter((p) => emp(p.child).size && emp(p.parent).size);
const shares = withWork.map(
  (p) => overlap(emp(p.child), emp(p.parent)) / emp(p.child).size,
);
// baseline: each child against the next unrelated adult in the list
const base: number[] = [];
const arr = all.filter((i) => emp(i).size);
arr.forEach((id, i) => {
  const other = arr[(i + 7) % arr.length]!;
  if (other !== id) base.push(overlap(emp(id), emp(other)) / emp(id).size);
});
const row14 = {
  parentChildPairsFound: pairs.length,
  pairsBothWithEmployers: withWork.length,
  meanShareOfChildEmployersAlsoParents: r2(mean(shares)),
  pairsSharingMoreThanHalf: withWork.filter((_, i) => shares[i]! > 0.5).length,
  pairsSharingAny: shares.filter((s) => s > 0).length,
  unrelatedBaselineMeanShare: r2(mean(base)),
  unrelatedBaselineSharingAny: base.filter((s) => s > 0).length,
  unrelatedPairs: base.length,
  examples: withWork.slice(0, 3).map((p) => ({
    rel: p.rel,
    child: [...emp(p.child)].map((o) => core.organizations.get(o)?.name),
    parent: [...emp(p.parent)].map((o) => core.organizations.get(o)?.name),
  })),
};
const noEmpDetail: any[] = [];
for (const id of all)
  for (const sp of spellsOf(id))
    if (!sp.facts.organizationId)
      noEmpDetail.push({
        how: sp.facts.how,
        startedAt: sp.facts.startedAt,
        end: sp.facts.end,
        placeId: sp.placeId,
        placeIsHome: sp.placeId === core.people.get(id).placeId,
        personAge: age(core.people.get(id)),
      });
console.log(
  JSON.stringify(
    {
      noEmpDetail,
      place: place.name,
      key: place.key,
      seed: place.seed.slice(0, 16),
      fullAdults: full.length,
      filledAdults: filled.length,
      row5,
      row12,
      row14,
    },
    null,
    1,
  ),
);
