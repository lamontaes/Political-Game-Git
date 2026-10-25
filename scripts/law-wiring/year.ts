/**
 * One played year in a drawn place: every law enacted during it (passed by
 * a body in play, at any level; a repeal is not counted), with the people and
 * organizations it reached, the money the engines that applied it recorded,
 * and the outcome-web measures its links moved. The before-and-after counts
 * at the top of the law-wiring report come from this.
 *
 *   node --import tsx scripts/law-wiring/year.ts [--seed <hex>] [--days 365] [--out file.json]
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import type { CoreState } from "../../src/core2/types";
import { placeLocalities, placeStateKeys } from "../../src/core2/places";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

function drawPlace(seed: string) {
  const h = createHash("sha256")
    .update(`${seed}:law-wiring-year`)
    .digest("hex");
  const keys = [...placeStateKeys()].sort((a, b) => a.localeCompare(b));
  const stateKey = keys[parseInt(h.slice(0, 8), 16) % keys.length]!;
  const localities = [...placeLocalities(stateKey)].sort((a, b) =>
    a.key.localeCompare(b.key),
  );
  const l = localities[parseInt(h.slice(8, 16), 16) % localities.length]!;
  return { seed: h, key: l.key, name: l.displayName, state: stateKey };
}

interface LawRow {
  id: string;
  series: string;
  level: string;
  value: number | null;
  effectiveDate: string;
  terms?: Record<string, unknown>;
}

const has = (core: CoreState, id: string) => core.modules.has(id);

/** Rows naming a law id in a law-reach store (both groups and the applied record, where present). */
function reachOf(core: CoreState, lawId: string, key: string) {
  const api = coreAPI(core);
  const out = {
    full: 0,
    groups: 0,
    groupPeople: 0,
    organizations: 0,
    other: 0,
    moneyMinor: 0,
    sample: [] as string[],
  };
  const add = (
    id: string,
    target: string,
    kind?: string,
    count?: number,
    money?: number,
  ) => {
    if (out.sample.length < 3) out.sample.push(id);
    out.moneyMinor += Math.abs(money ?? 0);
    if (
      kind === "group" ||
      (!core.people.has(target) &&
        !core.organizations.has(target) &&
        count !== undefined)
    ) {
      out.groups += 1;
      out.groupPeople += count ?? 0;
    } else if (core.people.has(target)) out.full += 1;
    else if (
      core.organizations.has(target) ||
      core.publicOrganizations.has(target)
    )
      out.organizations += 1;
    else out.other += 1;
  };
  if (has(core, "core2-law-reach-a-v1"))
    for (const r of api
      .moduleState("core2-law-reach-a-v1")
      .table("reach")
      .rows() as unknown as Record<string, unknown>[])
      if (r.lawId === lawId)
        add(
          String(r.id),
          String(r.targetId),
          undefined,
          r.count === undefined ? undefined : Number(r.count),
        );
  if (has(core, "core2-law-reach-b-v1")) {
    const s = api.moduleState("core2-law-reach-b-v1");
    for (const r of s.table("people").rows() as unknown as Record<
      string,
      unknown
    >[])
      if (r.lawId === lawId) add(String(r.id), String(r.personId));
    for (const r of s.table("organizations").rows() as unknown as Record<
      string,
      unknown
    >[])
      if (r.lawId === lawId) add(String(r.id), String(r.organizationId));
    for (const r of s.table("groups").rows() as unknown as Record<
      string,
      unknown
    >[])
      if (r.key === key)
        add(
          String(r.id),
          String(r.id),
          "group",
          Number(r.count ?? r.people ?? 0),
        );
  }
  if (has(core, "core2-law-effects-v1")) {
    let applied;
    try {
      applied = api.moduleState("core2-law-effects-v1").table("applied");
    } catch {
      applied = null;
    }
    if (applied)
      for (const r of applied.rows() as unknown as Record<string, unknown>[])
        if (r.lawId === lawId)
          add(
            String(r.id),
            String(r.targetId),
            r.target === "group" ? "group" : undefined,
            Number(r.count),
            Number(r.amountMinor),
          );
  }
  return out;
}

function main(): void {
  const seed = arg("seed") ?? randomBytes(16).toString("hex");
  const days = Number(arg("days") ?? 365);
  const drawn = drawPlace(seed);
  console.error(
    `law-wiring year: seed ${seed} -> ${drawn.name}, ${drawn.state} (${drawn.key}), ${days} days`,
  );
  setBookkeeping(false);
  const world = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  const start = core.date;
  const t = Date.now();
  advanceCore(core, addDays(makeIsoDate(start), days));
  console.error(`ran ${days} days in ${Math.round((Date.now() - t) / 1000)}s`);
  const rows = (
    api.moduleState("core2-laws-v1").table("laws").rows() as unknown as LawRow[]
  ).filter(
    (r) =>
      r.effectiveDate > start &&
      r.effectiveDate <= core.date &&
      r.terms?.enactedBy &&
      // A repeal (a policy set back to no) applies to no one by design.
      r.value !== 0,
  );
  const webRows = has(core, "core2-outcome-web-v1")
    ? (api
        .moduleState("core2-outcome-web-v1")
        .table("months")
        .rows() as unknown as {
        id: string;
        date: string;
        effects: Record<string, number>;
      }[])
    : [];
  const links = (
    JSON.parse(
      readFileSync("data/research/outcome-web/links.json", "utf8"),
    ) as {
      links: { key: string; from: string }[];
    }
  ).links;
  const laws = rows.map((r) => {
    const reach = reachOf(core, r.id, r.series);
    const own = links
      .filter((l) => l.from === `law:${r.series}`)
      .map((l) => l.key);
    const moved = webRows
      .filter((m) => m.date >= r.effectiveDate)
      .flatMap((m) =>
        own
          .filter((k) => (m.effects?.[k] ?? 0) !== 0)
          .map((k) => `${m.id}:${k}`),
      );
    return {
      lawId: r.id,
      series: r.series,
      level: r.level,
      value: r.value,
      effectiveDate: r.effectiveDate,
      reached: reach.full + reach.groups + reach.organizations + reach.other,
      reach,
      outcomeLinks: own.length,
      outcomeMoved: moved.length,
      outcomeSample: moved.slice(0, 2),
    };
  });
  const summary = {
    seed,
    place: drawn,
    days,
    lawsTookEffect: laws.length,
    reachedSomeone: laws.filter((l) => l.reached > 0).length,
    movedMoney: laws.filter((l) => l.reach.moneyMinor > 0).length,
    withOutcomeLinks: laws.filter((l) => l.outcomeLinks > 0).length,
    movedOutcome: laws.filter((l) => l.outcomeMoved > 0).length,
  };
  const out = arg("out");
  if (out)
    writeFileSync(out, `${JSON.stringify({ summary, laws }, null, 1)}\n`);
  console.log(JSON.stringify(summary));
}

main();
