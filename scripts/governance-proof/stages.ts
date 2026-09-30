import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import { STATES, TERRITORY_USPS } from "../../src/simulation/state-reference";
import { lawInForce } from "../../src/simulation/governing/law-in-force";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import { US_CONGRESS_PACK_ID } from "../../src/simulation/congress-rule-pack";
import { publicPartyAffiliation } from "../../src/simulation/living-world/congress";
import { activePartyUnitsAt } from "../../src/simulation/living-world/party-registry";
import { recordedCongressProcedure } from "../../src/simulation/governing/congress-procedure";
import {
  measurePosition,
  rulePackForMeasure,
} from "../../src/simulation/legislation";
import { legislativePackForJurisdiction } from "../../src/simulation/legislative-institutions";
import { stateLegislativeSeats } from "../../src/simulation/nationwide-world/state-legislature-opening";
import type {
  World,
  LegislativeActionRecord,
  EntityId,
  IsoDate,
} from "../../src/simulation/types";

/** A reading or cloture vote is not final passage out of a chamber. */
export function passedChamberMeasures(
  actions: readonly Pick<
    LegislativeActionRecord,
    "kind" | "measureId" | "chamberKey" | "floorStageKey"
  >[],
  chamberKey: string,
  finalStageKey: string | null | ((measureId: EntityId) => string | null),
): number {
  if (!finalStageKey) return 0;
  return new Set(
    actions
      .filter(
        (a) =>
          a.kind === "floor-stage-passed" &&
          a.chamberKey === chamberKey &&
          a.floorStageKey !== null &&
          a.floorStageKey ===
            (typeof finalStageKey === "function"
              ? finalStageKey(a.measureId)
              : finalStageKey),
      )
      .map((a) => a.measureId),
  ).size;
}

export function jurisdictionStages(
  world: World,
  jurisdictionId: EntityId | null,
  since?: IsoDate,
) {
  const measures = (world.history.legislativeMeasures ?? []).filter(
    (m) => jurisdictionId !== null && m.jurisdictionId === jurisdictionId,
  );
  const ids = new Set(measures.map((m) => m.id));
  const actions = (world.history.legislativeActions ?? []).filter((a) =>
    ids.has(a.measureId),
  );
  const count = (kind: string, chamber?: string) =>
    new Set(
      actions
        .filter(
          (a) => a.kind === kind && (!chamber || a.chamberKey === chamber),
        )
        .map((a) => a.measureId),
    ).size;
  const enacted = (world.history.legislativeEnactments ?? []).filter(
    (e) =>
      ids.has(e.measureId) &&
      e.outcome === "enacted" &&
      e.resolvedAt <= world.currentDate,
  );
  const dispositions = (world.history.executiveDispositions ?? []).filter((e) =>
    ids.has(e.measureId),
  );
  const byYear: Record<string, number> = {};
  for (const enactment of enacted) {
    const year = enactment.resolvedAt.slice(0, 4);
    byYear[year] = (byYear[year] ?? 0) + 1;
  }
  const inForce = new Set(
    measures.flatMap((m) =>
      (m.propositionIds ?? []).flatMap((p) =>
        lawInForce(world, jurisdictionId!, p)?.measureId === m.id ? [m.id] : [],
      ),
    ),
  ).size;
  const phases: Record<string, number> = {};
  for (const m of measures) {
    const phase = measurePosition(world, m.id).phase;
    phases[phase] = (phases[phase] ?? 0) + 1;
  }

  const pack = jurisdictionId
    ? legislativePackForJurisdiction(jurisdictionId)
    : null;
  const finalStages = new Map(
    measures.map((m) => [
      m.id,
      new Map(
        rulePackForMeasure(world, m.id).chambers.map((c) => [
          c.chamberKey,
          c.floorStages.at(-1)?.stageKey ?? null,
        ]),
      ),
    ]),
  );
  const chamberKeys = new Set([
    ...(pack?.chambers.map((c) => c.chamberKey) ?? []),
    ...[...finalStages.values()].flatMap((stages) => [...stages.keys()]),
  ]);
  const roster = pack
    ? stateLegislativeSeats(world, `${pack.packId}:candidacy`)
    : [];

  return {
    filed: measures.length,
    heard: count("committee-hearing-held"),
    chamberPassed: Object.fromEntries(
      [...chamberKeys].map((chamber) => [
        chamber,
        passedChamberMeasures(
          actions,
          chamber,
          (measureId) => finalStages.get(measureId)?.get(chamber) ?? null,
        ),
      ]),
    ),
    desk: count("presented-to-executive"),
    onDesk: phases["awaiting-executive"] ?? 0,
    signed: new Set(
      dispositions.filter((d) => d.action === "signed").map((d) => d.measureId),
    ).size,
    lawWithoutSignature: count("became-law-without-signature"),
    vetoed: new Set(
      dispositions.filter((d) => d.action === "vetoed").map((d) => d.measureId),
    ).size,
    lapsed: count("died-on-adjournment"),
    enacted: enacted.length,
    enactedDuringPeriod: enacted.filter((e) => !since || e.resolvedAt > since)
      .length,
    inForce,
    inForceBasis:
      "Measures currently governing at least one explicit policy answer; excludes laws with no linked policy question.",
    byYear,
    phases,
    roster: roster.map((s) => ({
      chamber: s.officeKey,
      party: s.member?.party,
    })),
  };
}

export function governanceStages(world: World, since?: IsoDate) {
  return Object.entries(STATES).map(([usps, state]) => ({
    usps,
    name: state.name,
    state: usps !== "DC" && !TERRITORY_USPS.has(usps),
    ...jurisdictionStages(
      world,
      stateJurisdictionForKey(`US-${usps}`)?.id ?? null,
      since,
    ),
  }));
}

/** Saved passage ballots, with the public affiliation on the day of the vote. */
export function congressPassageVotes(world: World) {
  const measures = new Map(
    (world.history.legislativeMeasures ?? [])
      .filter((m) => m.rulePackId === US_CONGRESS_PACK_ID)
      .map((m) => [m.id, m]),
  );
  return (world.history.legislativeVotes ?? [])
    .filter(
      (v) =>
        measures.has(v.measureId) &&
        v.forum.kind === "chamber" &&
        v.purpose === "floor-stage" &&
        v.floorStageKey === "passage",
    )
    .map((vote) => {
      const parties = new Map(
        activePartyUnitsAt(world, vote.takenAt, { level: "national" }).map(
          (unit) => [unit.organizationId, unit.partyKey],
        ),
      );
      const byParty: Record<string, Record<string, number>> = {};
      for (const ballot of vote.dispositions) {
        const partyId = ballot.personId
          ? publicPartyAffiliation(world, ballot.personId, {
              asOf: vote.takenAt,
            })
          : null;
        const party = partyId
          ? (parties.get(partyId) ?? "other")
          : "unaffiliated";
        const row = byParty[party] ?? {};
        row[ballot.disposition] = (row[ballot.disposition] ?? 0) + 1;
        byParty[party] = row;
      }
      return {
        measureId: vote.measureId,
        designation: measures.get(vote.measureId)!.designation,
        takenAt: vote.takenAt,
        chamber: vote.forum.kind === "chamber" ? vote.forum.chamberKey : null,
        procedure: recordedCongressProcedure(world, vote.measureId),
        tally: vote.tally,
        outcome: vote.outcome,
        requiredVotes: vote.requiredVotes,
        denominator: vote.denominatorValue,
        threshold: vote.thresholdLabel,
        byParty,
      };
    });
}

export function congressStages(world: World, since?: IsoDate) {
  return jurisdictionStages(world, NATIONAL_ELECTION_JURISDICTION.id, since);
}
