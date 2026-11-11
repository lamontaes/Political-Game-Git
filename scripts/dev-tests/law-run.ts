/**
 * Dev Tester, Phase 1 runner. One place, one level: for every policy the
 * level's body may draft, build the same generated world twice (control and
 * with the law), pass the bill through the real body, run past the lag and a
 * month, repeal it by a second bill, run again, and print one JSON line per
 * policy: what the law engine did, how the bill ended and whether a trade
 * added a section to it, who the law reached (the core's one reader,
 * `lawReach`: people, counted people and dollars), what moved against the
 * control. Usage:
 *   tsx scripts/dev-tests/law-run.ts <seed> <level> [idSubstring] [days]
 */
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { billCatalog, provisionFor } from "../../src/core2/bill-catalog";
import { coreAPI } from "../../src/core2/state";
import { townSeats } from "../../src/core2/modules/offices";
import {
  bodyOf,
  chambersOf,
  draftBill,
  castMemberVote,
  castChairHearing,
  holdVote,
  executiveDecision,
  members,
  memberKey,
  billEnding,
  sectionsAddedTo,
} from "../../src/core2/modules/legislature";
import { lawReach } from "../../src/core2/law-reach/applied";
import {
  lawChain,
  lawInForce,
  LAWS_MODULE_ID,
} from "../../src/core2/modules/laws";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import type { CoreState } from "../../src/core2/types";

setBookkeeping(false);
const [seed = "t1", level = "city", pick = "", daysArg = "90"] =
  process.argv.slice(2);
const DAYS = Number(daysArg);
let place = drawPlace(seed, "law-run");
const hasBody = (core: CoreState) =>
  townSeats(coreAPI(core)).some(
    (r) =>
      r.office.level === level &&
      r.holder?.personId &&
      bodyOf(coreAPI(core), r.office.id) &&
      (level === "state" ? r.office.kind.startsWith("legislature-") : true),
  );
const skipped: string[] = [];
for (let a = 0; a < 12; a++) {
  place = drawPlace(a ? `${seed}:${a}` : seed, "law-run");
  if (process.env.SKIP_PROBE) break;
  const probe = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  if (hasBody(probe.core)) break;
  skipped.push(`${place.name} (${place.key})`);
}
if (skipped.length)
  console.error("SKIPPED places with no", level, "body:", skipped.join("; "));
const build = () =>
  buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
const run = (core: CoreState, days: number) =>
  advanceCore(core, addDays(makeIsoDate(core.date), days));

function totals(core: CoreState) {
  let cash = 0,
    orgCash = 0,
    alive = 0,
    employed = 0;
  for (const p of core.people.values()) {
    if (!p.alive) continue;
    alive++;
    cash += p.liquidMinor;
    if (p.jobId) employed++;
  }
  for (const o of core.organizations.values()) orgCash += o.liquidMinor;
  const kinds: Record<string, number> = {};
  for (const [k, s] of core.logByKind) kinds[k] = s.size;
  return { cash, orgCash, alive, employed, kinds };
}
function diffKinds(a: Record<string, number>, b: Record<string, number>) {
  const out: Record<string, number> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const d = (a[k] ?? 0) - (b[k] ?? 0);
    if (d) out[k] = d;
  }
  return Object.fromEntries(
    Object.entries(out)
      .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))
      .slice(0, 12),
  );
}
function pass(
  core: CoreState,
  bodyId: string,
  sponsor: string,
  policyId: string,
  op: string,
  amount?: number,
) {
  const api = coreAPI(core);
  const bill = draftBill(api, {
    bodyOfficeId: bodyId,
    sponsorId: sponsor,
    provisions: [
      provisionFor({
        policyId,
        operation: op as never,
        ...(amount !== undefined ? { amount } : {}),
      }),
    ],
  });
  for (const ch of chambersOf(api, bill)) {
    for (const m of members(api, ch))
      castMemberVote(api, bill.id, memberKey(m), "yes");
    // Each committee's chair is cast to hear it, as dev mode's "Chair hears it" does: a forced bill is not a test of the chair.
    castChairHearing(api, bill.id, ch, true);
  }
  // Dev force: the executive's signature is on the record before the vote, as dev mode's "sign" control writes it.
  executiveDecision(api, bill.id, true);
  let b = holdVote(api, bill.id);
  const trail = [b.status];
  if (b.status === "awaiting-signature") {
    b = executiveDecision(api, bill.id, true);
    trail.push(b.status);
  }
  // How it ended in the legislature's own terms, and the sections a trade added (a rider: the run then measures it too).
  return {
    billId: bill.id,
    status: b.status,
    trail,
    ending: billEnding(api, bill.id),
    addedSections: sectionsAddedTo(b),
  };
}

const control = build();
const seatOf = (core: CoreState) =>
  townSeats(coreAPI(core)).find(
    (r) =>
      r.office.level === level &&
      r.holder?.personId &&
      bodyOf(coreAPI(core), r.office.id) &&
      (level === "state" ? r.office.kind.startsWith("legislature-") : true),
  );
const seat0 = seatOf(control.core);
if (!seat0) {
  console.log(
    JSON.stringify({
      place: place.name,
      key: place.key,
      seed: place.seed,
      level,
      error: "no body at this level",
    }),
  );
  process.exit(0);
}
const policies = billCatalog(coreAPI(control.core), level as never)
  .flatMap((s) =>
    s.topics.flatMap((t) => t.policies.map((p) => ({ ...p, subject: s.name }))),
  )
  .filter((p) => p.id.includes(pick));
run(control.core, DAYS);
const ctlAfterPass = totals(control.core);
run(control.core, DAYS);
const ctlAfterRepeal = totals(control.core);

for (const p of policies) {
  const rec: Record<string, unknown> = {
    place: place.name,
    key: place.key,
    seed: place.seed,
    level,
    policy: p.id,
    kind: p.kind,
    allowed: p.authority.allowed,
    why: p.authority.reason,
  };
  try {
    const w = build();
    const core = w.core;
    const api = coreAPI(core);
    const seat = seatOf(core)!;
    const op = p.operations.includes("enact")
      ? "enact"
      : p.operations.includes("raise")
        ? "raise"
        : p.operations[0]!;
    const amount =
      p.kind === "policy-question"
        ? undefined
        : Math.max(1, Math.round((p.inForce ?? 1) * 1.2 + 1));
    rec.op = op;
    rec.inForce = p.inForce;
    const series = p.series ?? p.question ?? p.line;
    const before = series
      ? lawInForce(
          api,
          p.kind === "budget-line" ? `budget-line:${p.line}` : series,
        ).governing
      : null;
    const r = pass(
      core,
      seat.office.id,
      seat.holder!.personId!,
      p.id,
      op,
      amount,
    );
    rec.pass = r.trail;
    rec.billId = r.billId;
    rec.ending = r.ending;
    rec.addedSections = r.addedSections;
    const after = series
      ? lawInForce(
          api,
          p.kind === "budget-line" ? `budget-line:${p.line}` : series,
        ).governing
      : null;
    rec.lawBefore = before && {
      id: before.id,
      level: before.level,
      value: before.value,
    };
    rec.lawAfter = after && {
      id: after.id,
      level: after.level,
      value: after.value,
      eff: after.effectiveDate,
    };
    rec.changed =
      !!after &&
      (!before || before.id !== after.id || before.value !== after.value);
    // The law's own date: a bill takes effect on the state's rule (often the next July 1), so run to it plus the month.
    const seriesName =
      p.kind === "budget-line" ? `budget-line:${p.line}` : series;
    const eff = seriesName
      ? (
          api.moduleState(LAWS_MODULE_ID).table("laws").rows() as unknown as {
            series: string;
            effectiveDate: string;
            measureId?: string;
          }[]
        )
          .filter((x) => x.series === seriesName && x.effectiveDate > core.date)
          .map((x) => x.effectiveDate)
          .sort()
          .pop()
      : undefined;
    const need = eff
      ? Math.round((Date.parse(eff) - Date.parse(core.date)) / 864e5) + 30
      : 0;
    const horizon = Math.min(Math.max(DAYS, need), 420);
    rec.effectiveOn = eff ?? null;
    rec.daysRun = horizon;
    run(core, horizon);
    const afterLag = series
      ? lawInForce(
          api,
          p.kind === "budget-line" ? `budget-line:${p.line}` : series,
        ).governing
      : null;
    rec.lawAfterLag = afterLag && {
      id: afterLag.id,
      level: afterLag.level,
      value: afterLag.value,
      eff: afterLag.effectiveDate,
    };
    rec.inForceAfterLag =
      !!afterLag &&
      (!before || before.id !== afterLag.id || before.value !== afterLag.value);
    const t = totals(core);
    if (horizon === DAYS) {
      rec.cashDeltaMinor = t.cash - ctlAfterPass.cash;
      rec.orgCashDeltaMinor = t.orgCash - ctlAfterPass.orgCash;
      rec.alive = t.alive - ctlAfterPass.alive;
      rec.employed = t.employed - ctlAfterPass.employed;
      rec.kindDiff = diffKinds(t.kinds, ctlAfterPass.kinds);
    }
    // Who the law reached: the one reader dev mode's bill card shows, without the list of names.
    if (afterLag) {
      const { people, ...reach } = lawReach(
        api,
        afterLag.id,
        lawChain(api).townPlaceId,
      );
      rec.reach = { ...reach, named: people.length };
    }
    // repeal
    // An amount law is repealed outright: the body's own law ends and its
    // level holds what it held before, including nothing.
    if (
      r.status === "enacted" &&
      (p.kind === "law-amount" ||
        p.operations.some((o) => ["repeal", "lower", "restrict"].includes(o)))
    ) {
      const rop =
        p.kind === "law-amount" || p.operations.includes("repeal")
          ? "repeal"
          : p.operations.includes("lower")
            ? "lower"
            : "restrict";
      const ramount = undefined;
      const rr = pass(
        core,
        seat.office.id,
        seat.holder!.personId!,
        p.id,
        rop,
        ramount,
      );
      rec.repeal = rr.trail;
      const eff2 = seriesName
        ? (
            api.moduleState(LAWS_MODULE_ID).table("laws").rows() as unknown as {
              series: string;
              effectiveDate: string;
            }[]
          )
            .filter(
              (x) => x.series === seriesName && x.effectiveDate > core.date,
            )
            .map((x) => x.effectiveDate)
            .sort()
            .pop()
        : undefined;
      const need2 = eff2
        ? Math.round((Date.parse(eff2) - Date.parse(core.date)) / 864e5) + 30
        : 0;
      run(core, Math.min(Math.max(DAYS, need2), 420));
      const re = series ? lawInForce(api, seriesName!).governing : null;
      rec.lawAfterRepeal = re && {
        id: re.id,
        level: re.level,
        value: re.value,
      };
      rec.repealUnwound =
        !!re &&
        !!afterLag &&
        (re.id !== afterLag.id || re.value !== afterLag.value);
      const t2 = totals(core);
      rec.cashDeltaAfterRepealMinor = t2.cash - ctlAfterRepeal.cash;
    }
  } catch (e) {
    rec.error = (e as Error).message.slice(0, 200);
  }
  console.log(JSON.stringify(rec));
}
