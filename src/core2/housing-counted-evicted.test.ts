/**
 * An evicted counted household stays counted (CTO, Nov 1, 2026, under
 * "Two-level population" and "One model, two tiers"): eviction, placement,
 * homelessness and renting again read the counted record by the same rule a
 * full household meets, and housing fills nobody in. Played worlds: Storrs,
 * Connecticut (key 0973980, a college town whose renters fall behind from
 * its first spring) and a place drawn from all 56, each named with its seed;
 * set GOLDEN_PATH_SEED to reproduce a draw. Renting again is shown on a
 * played world's own homeless counted household with the rent set low
 * (an edge fixture: the town's rent is out of their reach in a few months).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  HOUSING_STATUS_EVENT,
  housingHealthFactor,
  housingStatusCounts,
  housingStatusOf,
  reviewHomeless,
  type HousingStatusRow,
} from "./housing-homeless";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { drivesReport } from "./modules/drives";
import { HOUSING_MODULE_ID, leaseHousehold } from "./modules/housing";
import {
  householdCash,
  householdIncome,
  residentsRuntime,
} from "./modules/residents";
import { coreAPI, registerModule } from "./state";
import type { CoreEventInput } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

type CaseRow = {
  id: string;
  householdId: string;
  counted: boolean;
  stage: string;
  removedAt?: string;
};

function play(placeKey: string, worldSeed: string, months: number) {
  setBookkeeping(false);
  const world = buildBenchWorld(worldSeed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const { core } = world;
  const api = coreAPI(core);
  const where = `${world.place.displayName} (${placeKey}), seed ${worldSeed}`;
  const events: CoreEventInput[] = [];
  registerModule(core, {
    id: "test-counted-evicted-probe",
    eventKinds: ["housing.eviction", HOUSING_STATUS_EVENT],
    onEvent(_api, event) {
      events.push(event);
    },
  });
  advanceCore(
    core,
    makeIsoDate(addDays(makeIsoDate(core.date), Math.round(months * 30.4))),
  );
  return { core, api, where, events, town: world.placeId as string };
}

function checkRemovals(played: ReturnType<typeof play>): {
  removed: number;
  homeless: string[];
  perceived: number;
} {
  const { core, api, where, events } = played;
  const rt = residentsRuntime(core)!;
  const housing = api.moduleState(HOUSING_MODULE_ID);
  const cases = (housing.table("cases").rows() as unknown as CaseRow[]).filter(
    (row) => row.counted && row.stage === "removed",
  );
  const homeless: string[] = [];
  const subjectsOf = new Map<string, Set<string>>();
  for (const row of cases) {
    const id = row.householdId;
    const at = `${where}: ${row.id}`;
    // Housing filled nobody in: the household is still counted, or left the
    // counts for another place or by death, never filled in on its removal day.
    expect(rt.filledAt.get(id), at).not.toBe(row.removedAt);
    const eviction = events.find(
      (event) => event.id === `event:housing.eviction:${row.id}`,
    )!;
    expect(eviction, at).toBeDefined();
    expect(eviction.personIds, at).toEqual([]);
    expect(eviction.facts?.["counted-household"], at).toBe(id);
    // Every counted member is a subject, as every member of a full household
    // is named by its eviction.
    const subjects = JSON.parse(
      eviction.facts?.["counted-subjects"] ?? "[]",
    ) as string[];
    expect(subjects.length, at).toBeGreaterThan(0);
    subjectsOf.set(eviction.id, new Set(subjects));
    // Placed by the same rule: a status announced the day of the removal.
    const placed = events.find(
      (event) =>
        event.kind === HOUSING_STATUS_EVENT &&
        event.topic === id &&
        event.date === row.removedAt &&
        event.facts?.previousStatus === "housed",
    );
    expect(placed, at).toBeDefined();
    expect(placed!.facts?.["counted-household"], at).toBe(id);
    const h = rt.store.liveHousehold(id);
    const status = housing.table("statuses").get(id) as unknown as
      HousingStatusRow | undefined;
    if (!h || !status) continue;
    // Still counted, for the one household removed, with no home.
    expect(h.tenure, at).toBe("none");
    expect(rt.store.weightOf(h), at).toBe(1);
    expect(status.counted, at).toBe(true);
    expect(status.caseId, at).toBe(row.id);
    expect(rt.flows.get(`rent:${id}`)?.endedAt, at).toBeDefined();
    expect(housingStatusOf(api, status.memberIds[0]!), at).toBe(status.status);
    for (const member of status.memberIds)
      expect(subjects, `${at}: ${member}`).toContain(member);
    homeless.push(id);
  }
  // The drives engine answers each counted member as the eviction's subject,
  // with the whole household named, by the rule a full household meets.
  const perceived = drivesReport(core).decisions.filter(
    (trace) => trace.counted && subjectsOf.has(trace.eventId),
  );
  for (const trace of perceived) {
    const at = `${where}: ${trace.eventId} perceived by ${trace.personId}`;
    expect(trace.role, at).toBe("subject");
    expect([...subjectsOf.get(trace.eventId)!], at).toContain(trace.personId);
    expect(trace.event.subjects, at).toEqual([
      ...subjectsOf.get(trace.eventId)!,
    ]);
  }
  // The town's homeless count reads the counted rows, people times weight.
  const rows = housing
    .table("statuses")
    .query("byPlace", [played.town]) as unknown as HousingStatusRow[];
  const counts = housingStatusCounts(api, played.town);
  for (const status of ["doubled-up", "sheltered", "unsheltered"] as const)
    expect(counts[status], `${where}: ${status}`).toBe(
      rows
        .filter((row) => row.status === status)
        .reduce((n, row) => n + row.memberIds.length, 0),
    );
  const example = homeless[0]
    ? (housing
        .table("statuses")
        .get(homeless[0]) as unknown as HousingStatusRow)
    : undefined;
  process.stdout.write(
    `COUNTED EVICTED ${where}: ${cases.length} counted households removed (${perceived.length} perceptions, each by a member as its subject), ${homeless.length} still without a home and counted${example ? ` (e.g. ${example.id}, ${example.status} since ${example.since} after ${example.caseId})` : ""}; town ${JSON.stringify(counts)}; ${core.people.size} full people, ${rt.filledIn.size} filled in\n`,
  );
  return { removed: cases.length, homeless, perceived: perceived.length };
}

it("Storrs, Connecticut: an evicted counted household stays counted, is placed and counted homeless by its record, and rents again by the same rule", () => {
  const played = play("0973980", `${seed}:storrs`, 3.5);
  const { core, api, where } = played;
  const { removed, homeless, perceived } = checkRemovals(played);
  // Storrs's renters fall behind from its first spring.
  expect(removed, where).toBeGreaterThan(0);
  expect(homeless.length, where).toBeGreaterThan(0);
  expect(perceived, `${where}: counted eviction perceptions`).toBeGreaterThan(
    0,
  );
  const rt = residentsRuntime(core)!;
  const housing = api.moduleState(HOUSING_MODULE_ID);

  // Its health reads its status: a counted household without a home falls
  // ill sooner, by the same factors a full person's strain takes.
  const first = homeless[0]!;
  const strain = housingHealthFactor(api, first);
  expect(strain.status, where).not.toBe("housed");
  expect(strain.factor, where).toBeGreaterThan(1);

  // Renting again by the counted rule: income from its record's work, cash
  // from its share of its group's money. The edge fixture asks the lowest
  // rent there is, so the same review signs the lease for a household whose
  // record shows any pay and any money.
  const target = homeless.find((id) => {
    const h = rt.store.liveHousehold(id)!;
    return (
      householdIncome(rt, h) - h.retirementMinorYear > 0 &&
      householdCash(rt, h) > 0
    );
  });
  expect(
    target,
    `${where}: a homeless counted household with pay and money`,
  ).toBeDefined();
  const h = rt.store.liveHousehold(target!)!;
  const before = rt.store.groups[h.group]!.id;
  let read: { placeId: string; incomeMinor: number } | undefined;
  reviewHomeless(
    api,
    (householdId, placeId, incomeMinor) => {
      if (householdId !== target) return 0;
      read = { placeId, incomeMinor };
      return 1;
    },
    (householdId, rentMinor) => leaseHousehold(api, householdId, rentMinor),
  );
  expect(read?.placeId, where).toBe(h.placeId);
  expect(read!.incomeMinor, where).toBeGreaterThan(0);
  const flow = rt.flows.get(`rent:${target}`)!;
  expect(flow.endedAt, where).toBeUndefined();
  expect(flow.amountMinor, where).toBe(1);
  // The rent flow its removal ended begins again, due next month, and the
  // household rents again: still counted, back in a renters' group.
  expect(flow.payeeId, where).toBe(`organization:landlord:${h.placeId}`);
  expect(flow.nextAt > core.date, where).toBe(true);
  expect(rt.store.liveHousehold(target), where).toBe(h);
  expect(h.tenure, where).toBe("rent");
  expect(rt.store.groups[h.group]!.id, where).not.toBe(before);
  expect(rt.store.groups[h.group]!.tenure, where).toBe("rent");
  expect(housing.table("statuses").get(target), where).toBeUndefined();
  expect(
    (housing.table("dwellings").get(`dwelling:${target}`) as { basis: string })
      .basis,
    where,
  ).toBe("rehoused");
  expect(core.households.has(target), where).toBe(false);
  process.stdout.write(
    `COUNTED EVICTED ${where}: ${target} rents again from its record (rent:${target} reopened, group ${before} to ${rt.store.groups[h.group]!.id})\n`,
  );
}, 600_000);

it("a place drawn from all 56: every evicted counted household stays counted and is counted homeless by its record", () => {
  const place = drawPlace(seed, "counted-evicted");
  const played = play(place.key, place.seed, 4);
  checkRemovals(played);
}, 600_000);
