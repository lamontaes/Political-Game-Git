import { setFutureDueItemTerminalState } from "./future-transitions";
import { organizationParticipationStateAt } from "./life-queries";
import { describe, expect, it } from "vitest";
import { createDemoWorld } from "./demo";
import { makeIsoDate } from "./dates";
import {
  governmentUnit,
  governmentUnitJurisdictionId,
} from "./government-units";
import { ensureLocalGovernmentOrganization } from "./nationwide-world/local-governments";
import { localGoverningBodyIdentity } from "./nationwide-world/local-governing-body-candidacy-packs";
import {
  scheduleElectionContest,
  resolveElectionContest,
} from "./election-contests";
import { createOrganizationParticipation } from "./life";
import {
  organizationIdFor,
  sittingLocalOfficers,
  COUNTY_BOARD_MEMBER,
} from "./living-world/local-government-seats";
import {
  deferCountyElectionWinner,
  localElectionTermStartHandler,
  LOCAL_ELECTION_TERM_START,
  LOCAL_ELECTION_HANDLERS,
} from "./living-world/local-elections";
import { serializeWorldPayload, deserializeWorld } from "./serialization";
import type { World } from "./types";

// Authored boundary dates isolate the transition, not proof of the day clock.
function at(world: World, date: string): World {
  const currentDate = makeIsoDate(date);
  return {
    ...world,
    currentDate,
    currentMoment: { ...world.currentMoment, date: currentDate },
  };
}
function fixture() {
  const unit = governmentUnit("gus2025:127794")!;
  let world = ensureLocalGovernmentOrganization(
    createDemoWorld("county-term-start"),
    unit,
  );
  const [holder, winner] = world.personOrder;
  world = createOrganizationParticipation(world, {
    stableKey: "county-term:holder",
    personId: holder!,
    organizationId: organizationIdFor(world, unit)!,
    startedAt: world.currentDate,
    kind: "leadership:municipal-office",
    roleKind: COUNTY_BOARD_MEMBER,
    context: "Police juror, seat 1",
    provenance: {
      kind: "authored",
      note: "Controlled county incumbent fixture.",
    },
  });
  const office = localGoverningBodyIdentity(unit)!;
  world = scheduleElectionContest(world, {
    stableKey: `local-elections/v1:${unit.id}:2027-11-20:seat-1:general`,
    jurisdictionId: governmentUnitJurisdictionId(unit),
    office: {
      officeKey: office.officeKey,
      title: office.officeTitle,
      seatKey: "seat-1",
      occupationClassification: "service:elected-local-official",
    },
    electionDate: "2027-11-20",
    candidatePersonIds: [holder!, winner!],
    provenance: {
      method: "authored",
      sourceEntityIds: [],
      note: "Authored result; no eligibility or natural county electorate claim.",
    },
  });
  const contest = world.history.electionContests!.at(-1)!;
  world = at(world, "2027-11-20");
  world = resolveElectionContest(world, {
    contestId: contest.id,
    resolvedAt: world.currentDate,
    winnerPersonId: winner!,
    tallies: [
      { candidatePersonId: holder!, votes: 1, voteShare: 0.25 },
      { candidatePersonId: winner!, votes: 3, voteShare: 0.75 },
    ],
    provenance: {
      method: "authored",
      sourceEntityIds: [contest.id],
      note: "Explicit fixture count.",
    },
  });
  const electionDue = world.history.futureDueItems.find(
    (row) => row.entityIds[0] === contest.id,
  )!;
  world = setFutureDueItemTerminalState(world, {
    stableKey: "county-term:contest-resolved",
    dueItemId: electionDue.id,
    effectiveAt: world.currentDate,
    status: "resolved",
    outcomeEventId: null,
    reasonKey: null,
    context: "The authored contest was explicitly resolved above.",
  });
  return { world, unit, contest, holder: holder!, winner: winner! };
}
describe("recorded county winner waits for the sourced term start", () => {
  it("keeps incumbent through election and reload, then records one county-role successor", () => {
    const f = fixture();
    let world = deferCountyElectionWinner(f.world, f.contest.id);
    const due = world.history.futureDueItems.find(
      (row) => row.transitionKey === LOCAL_ELECTION_TERM_START,
    )!;
    expect(due.dueAt).toBe("2028-01-10");
    expect(due.entityIds).toEqual([f.contest.id, f.winner]);
    expect(
      sittingLocalOfficers(world, f.unit).map((row) => row.personId),
    ).toEqual([f.holder]);
    expect(deferCountyElectionWinner(world, f.contest.id)).toBe(world);
    world = deserializeWorld(serializeWorldPayload(world));
    const before = localElectionTermStartHandler(world, due).world;
    expect(before).toBe(world);
    world = at(world, due.dueAt);
    world = localElectionTermStartHandler(world, due).world;
    expect(
      sittingLocalOfficers(world, f.unit).map((row) => row.personId),
    ).toEqual([f.winner]);
    const successor = world.history.organizationParticipations.find(
      (row) =>
        row.personId === f.winner &&
        row.organizationId === organizationIdFor(world, f.unit),
    )!;
    expect(successor.startedAt).toBe(due.dueAt);
    expect(
      organizationParticipationStateAt(world, successor.id)?.roleKind,
    ).toBe(COUNTY_BOARD_MEMBER);
    expect(
      world.history.events.filter((row) => row.type === "local.seat-changed"),
    ).toHaveLength(1);
    const saved = deserializeWorld(serializeWorldPayload(world));
    expect(localElectionTermStartHandler(saved, due).world).toBe(saved);
    expect(
      LOCAL_ELECTION_HANDLERS.some(
        ([key]) => key === LOCAL_ELECTION_TERM_START,
      ),
    ).toBe(true);
  });
  it("refuses a changed winner reference or calendar date without ending the incumbent", () => {
    const f = fixture();
    const world = deferCountyElectionWinner(f.world, f.contest.id);
    const due = world.history.futureDueItems.find(
      (row) => row.transitionKey === LOCAL_ELECTION_TERM_START,
    )!;
    const invalidOffice = {
      ...f.world,
      history: {
        ...f.world.history,
        electionContests: f.world.history.electionContests!.map((row) =>
          row.id === f.contest.id
            ? {
                ...row,
                office: { ...row.office, officeKey: "unrelated-office" },
              }
            : row,
        ),
      },
    };
    expect(deferCountyElectionWinner(invalidOffice, f.contest.id)).toBe(
      invalidOffice,
    );
    const onDate = at(world, due.dueAt);
    expect(
      localElectionTermStartHandler(onDate, {
        ...due,
        entityIds: [f.contest.id, f.holder],
      }).world,
    ).toBe(onDate);
    const early = { ...due, dueAt: makeIsoDate("2028-01-03") };
    const wrongDate = at(world, early.dueAt);
    expect(localElectionTermStartHandler(wrongDate, early).world).toBe(
      wrongDate,
    );
    expect(
      sittingLocalOfficers(onDate, f.unit).map((row) => row.personId),
    ).toEqual([f.holder]);
  });
});
