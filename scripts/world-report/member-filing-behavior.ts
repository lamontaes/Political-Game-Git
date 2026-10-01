/** Measured national filing behavior through the existing observer Day button. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import { observerPlace } from "../../src/presentation/observer-world";
import {
  anniversary,
  createObserverDayButton,
  openWatchedWorld,
} from "../dev-lab/world-aging";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../../src/simulation/nationwide-world/state-executive-candidacy-packs";
import { legislativePackForJurisdiction } from "../../src/simulation/legislative-institutions";
import { seatedChamberForPack } from "../../src/simulation/governing/chamber-votes";
import { US_CONGRESS_RULE_PACK } from "../../src/simulation/congress-rule-pack";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import { serializeWorld } from "../../src/simulation/serialization";
import type { EntityId, World } from "../../src/simulation/types";
import type { LegislativeRulePack } from "../../src/simulation/legislature-rules";
import throughput from "../../data/research/lawmaking-throughput/throughput-evidence.json";

const args = process.argv.slice(2);
function option(name: string, fallback: string): string {
  const index = args.indexOf(`--${name}`);
  return index < 0 ? fallback : args[index + 1]!;
}
const seed = option("seed", "team1-member-filing-20261001");
const placeKey = option("place", observerPlace(seed).key);
const output = option("out", "test-results/member-filing/receipt.json");
const save = option("save", "test-results/member-filing/world.json");
const sourceHead = option("head", "unrecorded");
const started = performance.now();
const watched = openWatchedWorld(seed, placeKey);
const button = createObserverDayButton(watched.world);
const startedOn = watched.world.currentDate;
const until = anniversary(startedOn, 2);
const startingSequence = watched.world.history.nextSequence;
const bodies = CHIEF_EXECUTIVE_JURISDICTIONS.flatMap((key) => {
  const jurisdiction = stateJurisdictionForKey(`US-${key}`);
  return jurisdiction
    ? [
        {
          key,
          jurisdictionId: jurisdiction.id,
          pack: legislativePackForJurisdiction(jurisdiction.id),
        },
      ]
    : [];
});
const allBodies = [
  ...bodies,
  {
    key: "US",
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    pack: US_CONGRESS_RULE_PACK,
  },
];
type SeatSnapshot = {
  personId: EntityId;
  partyKey: string | null;
  chamberKey: string;
  minority: boolean | null;
};
function seats(world: World, pack: LegislativeRulePack | null): SeatSnapshot[] {
  if (!pack) return [];
  return pack.chambers.flatMap((chamber) => {
    const members =
      seatedChamberForPack(world, pack.packId, chamber.chamberKey, chamber.name)
        ?.body.members ?? [];
    const counts = new Map<string, number>();
    for (const member of members)
      if (member.personId && member.partyKey)
        counts.set(member.partyKey, (counts.get(member.partyKey) ?? 0) + 1);
    const largest = Math.max(0, ...counts.values());
    return members.flatMap((member) =>
      member.personId
        ? [
            {
              personId: member.personId,
              partyKey: member.partyKey ?? null,
              chamberKey: chamber.chamberKey,
              minority:
                member.partyKey && counts.size > 1
                  ? counts.get(member.partyKey)! < largest
                  : null,
            },
          ]
        : [],
    );
  });
}
const seatedPeople = new Map<string, Set<EntityId>>();
function observeSeats(world: World) {
  for (const body of allBodies) {
    const recorded = seatedPeople.get(body.key) ?? new Set<EntityId>();
    for (const member of seats(world, body.pack)) recorded.add(member.personId);
    seatedPeople.set(body.key, recorded);
  }
}
observeSeats(button.world);
const filingDetails: {
  measureId: EntityId;
  place: string;
  date: string;
  memberFiler: boolean;
  sponsorPersonId: EntityId | null;
  minority: boolean | null;
  seatedMembers: number;
  chamberKey: string;
}[] = [];
let measureCursor = button.world.history.legislativeMeasures?.length ?? 0;
let daysPressed = 0;
let stopped: string | null = null;
function captureNewBills(world: World) {
  const measures = world.history.legislativeMeasures ?? [];
  const rosters = new Map<string, SeatSnapshot[]>();
  for (const bill of measures.slice(measureCursor)) {
    const body = allBodies.find(
      (candidate) =>
        candidate.jurisdictionId === bill.jurisdictionId &&
        candidate.pack?.packId === bill.rulePackId,
    );
    if (!body) continue;
    let roster = rosters.get(body.key);
    if (!roster) {
      roster = seats(world, body.pack);
      rosters.set(body.key, roster);
    }
    const sponsor = roster.find(
      (member) =>
        member.personId === bill.sponsorPersonId &&
        member.chamberKey === bill.originChamberKey,
    );
    filingDetails.push({
      measureId: bill.id,
      place: body.key,
      date: bill.introducedAt,
      memberFiler: /^(legislative-intake\/v1|congress-intake\/v1):/.test(
        bill.stableKey,
      ),
      sponsorPersonId: bill.sponsorPersonId,
      minority: sponsor?.minority ?? null,
      seatedMembers: roster.filter(
        (member) => member.chamberKey === bill.originChamberKey,
      ).length,
      chamberKey: bill.originChamberKey,
    });
  }
  measureCursor = measures.length;
}
function receipt() {
  const world = button.world;
  const measures = (world.history.legislativeMeasures ?? []).filter(
    (row) => row.sequence >= startingSequence,
  );
  const enactments = new Set(
    (world.history.legislativeEnactments ?? [])
      .filter(
        (row) => row.sequence >= startingSequence && row.outcome === "enacted",
      )
      .map((row) => row.measureId),
  );
  const rows = allBodies.map((body) => {
    const filed = measures.filter(
      (bill) =>
        bill.jurisdictionId === body.jurisdictionId &&
        bill.rulePackId === body.pack?.packId,
    );
    const detail = filingDetails.filter((bill) => bill.place === body.key);
    const memberFilings = detail.filter((bill) => bill.memberFiler);
    const sponsors = new Set(
      memberFilings.flatMap((bill) =>
        bill.sponsorPersonId ? [bill.sponsorPersonId] : [],
      ),
    );
    const seated = seatedPeople.get(body.key)?.size ?? 0;
    const enacted = filed.filter((bill) => enactments.has(bill.id)).length;
    const intakes = [
      ...new Set(
        memberFilings.map((bill) => `${bill.date}:${bill.chamberKey}`),
      ),
    ].map((key) => {
      const bills = memberFilings.filter(
        (bill) => `${bill.date}:${bill.chamberKey}` === key,
      );
      const members = bills[0]!.seatedMembers;
      const filingMembers = new Set(bills.map((bill) => bill.sponsorPersonId))
        .size;
      return {
        key,
        seatedMembers: members,
        filingMembers,
        memberShare: members ? filingMembers / members : null,
      };
    });
    return {
      place: body.key,
      packId: body.pack?.packId ?? null,
      observedSeatedMembers: seated,
      seated: seated > 0,
      filed: filed.length,
      memberFiled: memberFilings.length,
      enacted,
      enactedToFiled: filed.length ? enacted / filed.length : null,
      minorityFiled: memberFilings.filter((bill) => bill.minority === true)
        .length,
      sponsorPartyUnknown: memberFilings.filter(
        (bill) => bill.minority === null,
      ).length,
      uniqueMemberSponsors: sponsors.size,
      memberShareAcrossObservedSeats: seated ? sponsors.size / seated : null,
      intakes,
    };
  });
  return {
    sourceHead,
    seed,
    placeKey,
    placeName: watched.placeName,
    startedOn,
    currentDate: world.currentDate,
    targetDate: until,
    daysPressed,
    stopped,
    elapsedSeconds: (performance.now() - started) / 1000,
    complete: world.currentDate >= until && stopped === null,
    everySeatedLegislatureFiled: rows
      .filter((row) => row.seated)
      .every((row) => row.memberFiled > 0),
    rows,
    filingDetails,
    throughputObservations: throughput.observations,
    limits:
      "Natural observer clock; no actor records or law terms injected. Throughput observations have their own cohorts and session lengths; no scaling or success rate is applied. Per-intake member share is observed on dates that filed a bill; an intake with zero filings has no inferred membership denominator. Minority is relative to the actual chamber party counts when filed; absent or tied party counts are not inferred as a minority.",
  };
}
function checkpoint() {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(receipt(), null, 2));
  console.log(
    JSON.stringify({
      daysPressed,
      date: button.world.currentDate,
      elapsedSeconds: (performance.now() - started) / 1000,
      observedFilings: filingDetails.length,
      stopped,
    }),
  );
}
checkpoint();
while (button.world.currentDate < until) {
  const month = button.world.currentDate.slice(0, 7);
  const result = button.press();
  if (result.status === "stopped") {
    stopped = result.problem;
    break;
  }
  daysPressed += 1;
  captureNewBills(button.world);
  if (button.world.currentDate.slice(0, 7) !== month) {
    observeSeats(button.world);
    checkpoint();
  }
}
checkpoint();
mkdirSync(dirname(save), { recursive: true });
writeFileSync(save, serializeWorld(button.world));
process.exitCode = stopped ? 1 : 0;
