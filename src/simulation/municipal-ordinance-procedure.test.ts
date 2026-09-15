import { describe, expect, it } from "vitest";

import { createScenarioWorld } from "./demo";
import { requireLifePlace } from "./life-places";
import {
  measureActions,
  measureEnactment,
  measurePosition,
} from "./legislation";
import { municipalGovernmentForLifePlace } from "./municipal-government";
import {
  installMunicipalGovernment,
  introduceMunicipalOrdinance,
  municipalSeats,
  seatMunicipalMember,
} from "./municipal-public-work";
import {
  admitCouncilAction,
  municipalOrdinanceStatus,
  passMunicipalOrdinance,
  placeMunicipalOrdinanceOnAgenda,
} from "./municipal-ordinance-procedure";
import { deserializeWorld, serializeWorld } from "./serialization";
import { advanceWorld } from "./world";
import { makeIsoDate } from "./dates";
import type {
  EntityId,
  LegislativeVoteDisposition,
  LegislativeVoteProvenance,
  World,
} from "./types";

const PROVENANCE: LegislativeVoteProvenance = {
  method: "authored-fixture",
  note: "Test roll call supplied by the test.",
  sourceEntityIds: [],
};

function charlottesville() {
  const place = requireLifePlace("5114968");
  const government = municipalGovernmentForLifePlace(place)!;
  let world = createScenarioWorld(
    "rules-to-play-cville-ordinance",
    place.context,
    {
      peopleCount: 12,
    },
  );
  const people = world.personOrder;
  world = installMunicipalGovernment(world, {
    governmentKey: government.key,
    jurisdictionId: place.context.jurisdiction.id,
    formedAt: world.currentDate,
  });
  for (let index = 0; index < 5; index += 1) {
    world = seatMunicipalMember(world, {
      governmentKey: government.key,
      personId: people[index + 1]!,
      startedAt: world.currentDate,
      role: index === 0 ? "presiding-member" : "member",
      seatLabel: index === 0 ? "Mayor" : `Seat ${index + 1}`,
    });
  }
  const member = people[1]!;
  world = { ...world, control: { kind: "person", personId: member } };
  const council = municipalSeats(world, government.key).map(
    (seat) => seat.personId,
  );
  return { world, key: government.key, people, member, council };
}

function roll(
  council: readonly EntityId[],
  yeas: number,
  nays: number,
): readonly LegislativeVoteDisposition[] {
  return council.map((personId, index) => ({
    memberKey: `council:${index + 1}`,
    personId,
    disposition: index < yeas ? "yea" : index < yeas + nays ? "nay" : "absent",
  }));
}

function introduced(world: World, key: string, designation = "Ord. 26-1") {
  const filed = introduceMunicipalOrdinance(world, {
    governmentKey: key,
    designation,
    shortTitle: "Sidewalk dining permits",
    summary: "A general ordinance introduced by a councilor.",
  });
  if (!filed.ok) throw new Error(filed.reason);
  const measure = (filed.world.history.legislativeMeasures ?? []).at(-1)!;
  const placed = placeMunicipalOrdinanceOnAgenda(filed.world, {
    governmentKey: key,
    measureId: measure.id,
  });
  if (!placed.ok) throw new Error(placed.reason);
  return { world: placed.world, measureId: measure.id };
}

describe("a Charlottesville general ordinance through the shared measure engine", () => {
  it("waits the Code's three intervening days, passes by majority of those voting, and takes effect on passage", () => {
    const { world, key, council } = charlottesville();
    const { world: onAgenda, measureId } = introduced(world, key);
    const status = municipalOrdinanceStatus(onAgenda, key, measureId)!;
    expect(status.phase).toBe("on-floor");
    expect(status.earliestPassageOn).toBe(
      makeIsoDate(
        new Date(Date.parse(`${onAgenda.currentDate}T00:00:00Z`) + 4 * 864e5)
          .toISOString()
          .slice(0, 10),
      ),
    );
    expect(status.timingRule).toContain("City Code § 2-97");

    const tooSoon = passMunicipalOrdinance(advanceWorld(onAgenda, 3), {
      governmentKey: key,
      measureId,
      dispositions: roll(council, 3, 0),
      provenance: PROVENANCE,
    });
    expect(tooSoon.ok).toBe(false);
    if (!tooSoon.ok)
      expect(tooSoon.reason).toMatch(/at least 3 days intervene/);

    const ready = advanceWorld(onAgenda, 4);
    const noQuorum = passMunicipalOrdinance(ready, {
      governmentKey: key,
      measureId,
      dispositions: roll(council, 2, 0),
      provenance: PROVENANCE,
    });
    expect(noQuorum.ok).toBe(false);
    if (!noQuorum.ok) {
      expect(noQuorum.reason).toMatch(/2 present, 3 required/);
      expect(noQuorum.world).toBe(ready);
    }

    // Two yeas and one nay with two absent is a quorum and a majority voting.
    const passed = passMunicipalOrdinance(ready, {
      governmentKey: key,
      measureId,
      dispositions: roll(council, 2, 1),
      provenance: PROVENANCE,
    });
    expect(passed.ok).toBe(true);
    if (!passed.ok) throw new Error(passed.reason);
    const enactment = measureEnactment(passed.world, measureId)!;
    expect(enactment.outcome).toBe("enacted");
    expect(enactment.effectiveAt).toBe(ready.currentDate);
    expect(measurePosition(passed.world, measureId).phase).toBe("enacted");
    expect(measureActions(passed.world, measureId).map((a) => a.kind)).toEqual([
      "introduced",
      "placed-on-calendar",
      "floor-stage-passed",
      "enrolled",
      "enacted",
    ]);

    const again = passMunicipalOrdinance(passed.world, {
      governmentKey: key,
      measureId,
      dispositions: roll(council, 3, 0),
      provenance: PROVENANCE,
    });
    expect(again.ok).toBe(false);

    const reloaded = deserializeWorld(serializeWorld(passed.world));
    expect(serializeWorld(reloaded)).toBe(serializeWorld(passed.world));
    expect(
      municipalOrdinanceStatus(reloaded, key, measureId)?.enactment,
    ).toEqual({
      resolvedAt: ready.currentDate,
      effectiveAt: ready.currentDate,
    });
  }, 60000);

  it("records a failed vote as failed, and refuses outsiders and doubled ballots without writing", () => {
    const { world, key, council, people } = charlottesville();
    const { world: onAgenda, measureId } = introduced(world, key);
    const ready = advanceWorld(onAgenda, 4);

    const outsiderBallot = passMunicipalOrdinance(ready, {
      governmentKey: key,
      measureId,
      dispositions: [
        ...roll(council, 3, 0).slice(0, 4),
        { memberKey: "council:5", personId: people[9]!, disposition: "yea" },
      ],
      provenance: PROVENANCE,
    });
    expect(outsiderBallot.ok).toBe(false);
    if (!outsiderBallot.ok) expect(outsiderBallot.world).toBe(ready);

    const doubled = passMunicipalOrdinance(ready, {
      governmentKey: key,
      measureId,
      dispositions: [
        ...roll(council, 3, 0),
        { memberKey: "council:6", personId: council[0]!, disposition: "yea" },
      ],
      provenance: PROVENANCE,
    });
    expect(doubled.ok).toBe(false);

    const resident = {
      ...ready,
      control: { kind: "person" as const, personId: people[0]! },
    };
    const byResident = passMunicipalOrdinance(resident, {
      governmentKey: key,
      measureId,
      dispositions: roll(council, 3, 0),
      provenance: PROVENANCE,
    });
    expect(byResident.ok).toBe(false);
    if (!byResident.ok)
      expect(byResident.reason).toMatch(/does not put you on it/);

    const failed = passMunicipalOrdinance(ready, {
      governmentKey: key,
      measureId,
      dispositions: roll(council, 1, 2),
      provenance: PROVENANCE,
    });
    expect(failed.ok).toBe(true);
    if (!failed.ok) throw new Error(failed.reason);
    expect(measurePosition(failed.world, measureId).phase).toBe("failed");
    expect(measureEnactment(failed.world, measureId)).toBeNull();
  }, 60000);
});

describe("rules-municipal-authority/v1", () => {
  it("applies § 15.2-1428 and City Code § 2-98 by amount and date, with no veto and no other city", () => {
    const { world, key, member, people } = charlottesville();
    const onDate = makeIsoDate("2026-03-01");
    const big = admitCouncilAction(world, {
      governmentKey: key,
      actorPersonId: member,
      kind: "APPROPRIATION",
      amountUsd: 25_000,
      onDate,
    });
    expect(big).toMatchObject({
      admitted: true,
      requiredVote: {
        basis: "MAJORITY_OF_ALL_ELECTED_MEMBERS",
        recordedYeaNay: true,
      },
      minimumInterveningDays: 3,
      vetoApplies: false,
    });
    if (big.admitted) {
      expect(big.requiredVote.citations).toContain(
        "Code of Virginia § 15.2-1428",
      );
      expect(big.requiredVote.citations).toContain("City Code § 2-98(a)");
    }

    const tax = admitCouncilAction(world, {
      governmentKey: key,
      actorPersonId: member,
      kind: "TAX_LEVY",
      onDate,
    });
    expect(tax).toMatchObject({
      admitted: true,
      requiredVote: { basis: "MAJORITY_OF_ALL_ELECTED_MEMBERS" },
    });

    const smallBeforeAmendment = admitCouncilAction(world, {
      governmentKey: key,
      actorPersonId: member,
      kind: "APPROPRIATION",
      amountUsd: 300,
      onDate: makeIsoDate("2026-01-05"),
    });
    expect(smallBeforeAmendment).toMatchObject({
      admitted: false,
      reason: "FIELD_UNKNOWN",
    });

    expect(
      admitCouncilAction(world, {
        governmentKey: key,
        actorPersonId: people[0]!,
        kind: "APPROPRIATION",
        amountUsd: 25_000,
        onDate,
      }),
    ).toMatchObject({ admitted: false, reason: "NOT_A_MEMBER" });

    expect(
      admitCouncilAction(world, {
        governmentKey: "us-va-richmond",
        actorPersonId: member,
        kind: "ORDINANCE",
        onDate,
      }),
    ).toMatchObject({ admitted: false, reason: "UNSUPPORTED_JURISDICTION" });
  }, 60000);
});
