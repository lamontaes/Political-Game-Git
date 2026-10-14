/* global process, console, performance */
// One model, two tiers: the proof run (docs/design/one-model-two-tiers.md).
// One year of the played world (the bench's two-level town, every module),
// twice on the same seed: once as it is, once with the town's state raising
// its income tax by an act on --law-day. It reports, from the records:
//   - the act's reach at both tiers from one rule (reachOf), and the state
//     income tax withheld at both tiers before and after it, with every
//     dollar of the world balanced every day;
//   - two counted people filled in on --fill-day, each set against the
//     group they came from;
//   - the moves out of and into the town, by place, with and without the act;
//   - the demotions the year made, by record id.
// Usage: CORE2_BOOKKEEPING=0 node --max-old-space-size=8000 --import tsx scripts/core2-year/one-model-proof.mjs [--seed S] [--days 365] [--law-day 45] [--rate 10] [--fill-day 10] [--out file.json]
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";
const args = process.argv.slice(2);
const value = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const at = (path) => import(pathToFileURL(resolve(process.cwd(), path)).href);
const seed = value("--seed", randomBytes(16).toString("hex"));
const days = Number(value("--days", 365));
const lawDay = Number(value("--law-day", 45));
const rate = Number(value("--rate", 10));
const fillDay = Number(value("--fill-day", 10));
const out = value("--out", undefined);
console.error(`seed ${seed}`);

const { buildBenchWorld } = await at("src/bench/world.ts");
const { gameStartDate } = await at("src/core2/game-start.ts");
const { advanceCore } = await at("src/core2/life.ts");
const { coreAPI, fillInPerson } = await at("src/core2/state.ts");
const { lawChain, enactLaw, lawInForce } = await at(
  "src/core2/modules/laws.ts",
);
const residents = await at("src/core2/modules/residents.ts");
const { reachOf } = await at("src/core2/counted-reach.ts");
const { countedMoves, countedPull, coarsePlace } = await at(
  "src/core2/modules/counted-moves.ts",
);
const { countedDemotions } = await at("src/core2/modules/counted-demotion.ts");
const { scheduleTax } = await at("src/core2/tax-withholding.ts");
const { BUDGETS_MODULE_ID } = await at("src/core2/modules/budgets.ts");
const { corePlaceByKey } = await at("src/core2/place-lookup.ts");
const { placeReferencePopulation } = await at(
  "src/simulation/nationwide-world/place-population.ts",
);

const total = (core) =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (n, row) => n + row.liquidMinor,
    0,
  ) +
  [...core.cashJournal.externalFlowsByOwner.values()].reduce(
    (n, row) => n + row.netMinor,
    0,
  );

/** The state's income tax on a year's wages in dollars, under a law-in-force answer. */
function stateTax(answer, wages) {
  let tax = 0;
  for (const level of answer.levels) {
    if (level.level !== "state" || level.setAside || !level.row) continue;
    const single = level.row.terms?.schedules?.single;
    tax += single
      ? scheduleTax(single, wages)
      : level.row.unit === "percent-flat" || level.row.unit === "percent"
        ? (wages * (level.row.value ?? 0)) / 100
        : 0;
  }
  return tax;
}

/** A counted household's facts, as its group keys them. */
function groupFacts(rt, h) {
  const g = rt.store.groups[h.group];
  return g
    ? {
        groupId: g.id,
        district: g.district,
        kind: g.kind,
        incomeBand: g.incomeBand,
        tenure: g.tenure,
        ageBand: g.ageBand,
        work: g.work,
        incomeDollarsYear: Math.round(residents.householdIncome(rt, h) / 100),
      }
    : undefined;
}

async function run(withLaw) {
  const started = performance.now();
  const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
  const core = world.core;
  const api = coreAPI(core);
  const rt = residents.residentsRuntime(core);
  const chain = lawChain(api);
  const stateKey = chain.stateKey;
  const stateUsps = stateKey.slice(3);
  const opening = total(core);
  const townId = residents.townPlaceOf(core);
  const geoid = corePlaceByKey(core.placeMetadata?.placeKey)?.sourceGeoid;
  const result = {
    seed,
    place: world.place.key,
    placeName: world.place.displayName ?? world.place.name,
    state: stateKey,
    withLaw,
    census: geoid ? placeReferencePopulation(geoid) : null,
    townPeopleAtOpening: {
      full: [...core.people.values()].filter(
        (p) => p.placeId === townId && p.alive && p.tier !== "husk",
      ).length,
      counted:
        residents.residentCounts(core).find((r) => r.placeId === townId)
          ?.people ?? 0,
    },
    balanced: true,
    unbalancedDays: [],
    filled: [],
    law: undefined,
    withheld: {},
    months: [],
  };
  const seen = new Set();
  const stateWithheld = { full: 0, counted: 0 };
  let countedBefore = 0;
  const countedState = () => {
    let n = 0;
    for (const [key, v] of rt.withheld)
      if (key.split("|")[2] === stateKey) n += v;
    return n;
  };
  for (let day = 1; day <= days; day++) {
    if (day === fillDay) {
      // The player meets two counted people in different groups.
      const player = core.playerId ? core.people.get(core.playerId) : undefined;
      const circle = new Set([
        ...(player?.familyIds ?? []),
        ...(player?.knownIds ?? []),
      ]);
      const picked = [];
      const town = residents.townPlaceOf(core);
      for (const h of rt.store.liveHouseholds()) {
        if (h.placeId !== town || picked.length >= 2) continue;
        if (picked.some((p) => p.group === h.group)) continue;
        const members = rt.store.countedMembers(h);
        if (!members.length || members.some((m) => circle.has(rt.store.ids[m])))
          continue;
        if (!h.jobs.length && picked.length === 0) continue;
        picked.push({ group: h.group, h, id: rt.store.ids[members[0]] });
      }
      for (const { h, id } of picked) {
        const before = groupFacts(rt, h);
        const person = fillInPerson(core, id);
        const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
        const home = core.households.get(person.householdId);
        const jobWages = (home?.memberIds ?? [])
          .map((m) => core.people.get(m))
          .map((p) => (p?.jobId ? core.jobs.get(p.jobId) : undefined))
          .filter((j) => j && j.endsAt === undefined)
          .reduce((n, j) => n + j.wageDailyMinor * 365, 0);
        // Its share of the place's unplaced workers' pay, now its own flow.
        const unplacedPay = [...rt.flows.values()]
          .filter(
            (f) =>
              !f.endedAt &&
              f.financeKind === "work.unplaced-residents" &&
              home?.memberIds.includes(f.payeeId),
          )
          .reduce((n, f) => n + (f.amountMinor * 365) / 14, 0);
        const wages = jobWages + unplacedPay;
        const contracts = [...core.finance.contracts.values()].filter(
          (c) => c.householdId === person.householdId && !c.endedAt,
        );
        result.filled.push({
          personId: person.id,
          name: `${person.givenName} ${person.familyName}`,
          householdId: person.householdId,
          group: before,
          asFull: {
            job: job
              ? {
                  id: job.id,
                  title: job.title,
                  organizationId: job.organizationId,
                  hourlyDollars: (job.hourlyMinor ?? 0) / 100,
                }
              : null,
            householdRecordedPayDollarsYear: Math.round(jobWages / 100),
            householdUnplacedPayDollarsYear: Math.round(unplacedPay / 100),
            incomeBandOfThatPay: residents.incomeBandOf(wages),
            rent:
              contracts.find((c) => c.id.startsWith("lease:"))?.amountMinor ??
              null,
            mortgage:
              contracts.find((c) => c.id.startsWith("mortgage:"))
                ?.amountMinor ?? null,
            cashDollars: Math.round(person.liquidMinor / 100),
          },
        });
      }
    }
    if (withLaw && day === lawDay) {
      // The state raises its income tax: a flat rate, in force today.
      const lawBefore = lawInForce(api, "income-tax");
      const row = enactLaw(api, {
        jurisdiction: stateKey,
        level: "state",
        series: "income-tax",
        value: rate,
        unit: "percent-flat",
        effectiveDate: core.date,
        measureId: `proof-act:${stateKey}:${core.date}`,
        citation: `A state act setting a flat ${rate}% income tax (one-model proof).`,
      });
      const lawAfter = lawInForce(api, "income-tax");
      const wagesShown = [30000, 50000, 80000];
      const before = Object.fromEntries(
        wagesShown.map((w) => [w, Math.round(stateTax(lawBefore, w))]),
      );
      const after = Object.fromEntries(
        wagesShown.map((w) => [w, Math.round(stateTax(lawAfter, w))]),
      );
      // One rule for both tiers: every working adult, and what the act
      // changes in their state income tax a year.
      const reach = reachOf(core, chain.townPlaceId, {
        ageFrom: 18,
        employed: true,
        dollarsPerYear: (f) =>
          stateTax(lawAfter, f.wageDollars) -
          stateTax(lawBefore, f.wageDollars),
      });
      result.law = {
        id: row.id,
        date: core.date,
        stateTaxOnWagesBefore: before,
        stateTaxOnWagesAfter: after,
        reach: {
          people: reach.people,
          fullPeople: reach.full.people,
          countedPeople: Math.round(reach.counted.people),
          dollarsPerYear: Math.round(reach.dollars),
          fullDollarsPerYear: Math.round(reach.full.dollars),
          countedDollarsPerYear: Math.round(reach.counted.dollars),
          byGroup: reach.byGroup
            .slice()
            .sort((a, b) => b.people - a.people)
            .slice(0, 8)
            .map((g) => ({
              ...g,
              people: Math.round(g.people),
              dollars: Math.round(g.dollars),
            })),
        },
      };
    }
    const next = new Date(`${core.date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    advanceCore(core, next.toISOString().slice(0, 10));
    const now = total(core);
    if (now !== opening) {
      result.balanced = false;
      if (result.unbalancedDays.length < 5)
        result.unbalancedDays.push({ date: core.date, off: now - opening });
    }
    // State income tax withheld, by tier, from each tier's own records.
    {
      try {
        for (const row of api
          .moduleState(BUDGETS_MODULE_ID)
          .table("withholding")
          .rows()) {
          if (seen.has(row.id)) continue;
          seen.add(row.id);
          for (const line of row.lines)
            if (line.jurisdiction === stateKey && line.tax === "income")
              stateWithheld.full += line.minor;
        }
      } catch {
        // no budgets engine
      }
    }
    if (core.date.endsWith("-01")) {
      const counted = countedState();
      const month = core.date.slice(0, 7);
      const moves = countedMoves(api).filter(
        (m) =>
          m.date.startsWith(month) &&
          (m.fromPlace === townId || m.toPlace === townId),
      );
      const outBy = {};
      for (const m of moves.filter((m) => m.direction === "out"))
        outBy[m.toPlace] = (outBy[m.toPlace] ?? 0) + m.people;
      const inBy = {};
      for (const m of moves.filter((m) => m.direction === "in"))
        inBy[m.fromPlace] = (inBy[m.fromPlace] ?? 0) + m.people;
      result.months.push({
        month,
        stateIncomeTaxWithheld: {
          fullDollars: Math.round(stateWithheld.full / 100),
          countedDollars: Math.round((counted - countedBefore) / 100),
        },
        peopleOut: Object.values(outBy).reduce((a, b) => a + b, 0),
        peopleIn: Object.values(inBy).reduce((a, b) => a + b, 0),
        outBy,
        inBy,
        countedPeople: residents
          .residentCounts(core)
          .reduce((n, r) => n + r.people, 0),
        coarseState: Math.round(
          (coarsePlace(core, stateUsps)?.people ?? []).reduce(
            (a, b) => a + b,
            0,
          ),
        ),
        // The town's three largest working groups.
        pulls: rt.store.groups
          .filter(
            (g) =>
              g.work === "working" &&
              rt.store.households[[...g.households][0]]?.placeId === townId,
          )
          .sort((a, b) => b.households.size - a.households.size)
          .slice(0, 3)
          .map((g) => ({ groupId: g.id, ...countedPull(api, g.id) })),
      });
      stateWithheld.full = 0;
      countedBefore = counted;
    }
  }
  result.demotions = countedDemotions(api).map((d) => ({
    id: d.id,
    date: d.date,
    householdId: d.householdId,
    personIds: d.personIds,
    groupId: d.groupId,
    cashDollars: Math.round(d.cashMinor / 100),
    jobIds: d.jobIds,
    lastContact: d.lastContact,
  }));
  result.filledNow = result.filled.map((f) => {
    const p = core.people.get(f.personId);
    return {
      personId: f.personId,
      tier: p?.tier,
      placeId: p?.placeId,
      countedAgain: residents.residentPerson(core, f.personId) !== undefined,
    };
  });
  result.seconds = Math.round((performance.now() - started) / 1000);
  return result;
}

const withAct = await run(true);
const without = await run(false);
const report = { seed, withAct, without };
if (out) writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
