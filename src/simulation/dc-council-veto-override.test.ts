import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { daysBetween } from "./dates";
import { advanceWorld } from "./world";
import { dcCouncilSittingHandler } from "./dc-council-sittings";
import {
  DC_GOVERNMENT_KEY,
  ensureDistrictOfColumbiaCouncilOpening,
} from "./nationwide-world/district-of-columbia-council-opening";
import {
  introduceMunicipalOrdinance,
  municipalSeats,
} from "./municipal-public-work";
import {
  municipalExecutiveHolder,
  municipalOrdinanceStatus,
  overrideCouncilVeto,
  overrideDeadline,
  placeMunicipalOrdinanceOnAgenda,
  recordCouncilReadingVote,
} from "./municipal-ordinance-procedure";
import {
  measureActions,
  measurePosition,
  recordExecutiveAction,
} from "./legislation";
import {
  decideCouncilVote,
  ensureCouncilPrinciples,
} from "./governing/council-lawmaking";
import type { LegislativeVoteProvenance, World } from "./types";
import { deserializeWorld, serializeWorld } from "./serialization";

function vetoedAct(seed: string) {
  const fixture = smallWorld({
    place: "US-DC",
    date: "2026-01-05",
    seed,
    people: 16,
    offices: ["governor"],
  });
  const mayor = municipalExecutiveHolder(fixture.world, DC_GOVERNMENT_KEY);
  if (!mayor) throw Error("The actual District executive office is vacant.");
  let world = ensureDistrictOfColumbiaCouncilOpening(fixture.world, [
    fixture.personId,
    mayor,
  ]);
  const members = municipalSeats(world, DC_GOVERNMENT_KEY).filter(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  );
  expect(members).toHaveLength(13);
  world = {
    ...world,
    control: { kind: "person", personId: members[0]!.personId },
  };
  const introduced = introduceMunicipalOrdinance(world, {
    governmentKey: DC_GOVERNMENT_KEY,
    designation: "B26-9001",
    shortTitle: "Supplied neutral council act",
    summary:
      "Supplied passage and actual executive return isolate the NPC reconsideration caller.",
  });
  if (!introduced.ok) throw Error(introduced.reason);
  world = introduced.world;
  const measure = world.history.legislativeMeasures!.at(-1)!;
  const placed = placeMunicipalOrdinanceOnAgenda(world, {
    governmentKey: DC_GOVERNMENT_KEY,
    measureId: measure.id,
  });
  if (!placed.ok) throw Error(placed.reason);
  world = placed.world;
  const dispositions = members.map((member, index) => ({
    memberKey: `council:${index + 1}`,
    personId: member.personId,
    disposition: "yea" as const,
  }));
  const provenance: LegislativeVoteProvenance = {
    method: "authored-fixture",
    note: "Supplied passage votes; the override must use actual member decisions.",
    sourceEntityIds: [measure.id],
  };
  const first = recordCouncilReadingVote(world, {
    governmentKey: DC_GOVERNMENT_KEY,
    measureId: measure.id,
    dispositions,
    provenance,
  });
  if (!first.ok) throw Error(first.reason);
  world = first.world;
  const nextDate = municipalOrdinanceStatus(
    world,
    DC_GOVERNMENT_KEY,
    measure.id,
  )?.earliestPassageOn;
  if (!nextDate) throw Error("No sourced next-reading date.");
  world = advanceWorld(world, daysBetween(world.currentDate, nextDate));
  const second = recordCouncilReadingVote(world, {
    governmentKey: DC_GOVERNMENT_KEY,
    measureId: measure.id,
    dispositions,
    provenance,
  });
  if (!second.ok) throw Error(second.reason);
  world = second.world;
  expect(measurePosition(world, measure.id).phase).toBe("awaiting-executive");
  world = recordExecutiveAction(world, {
    stableKey: `${measure.stableKey}:fixture-veto`,
    measureId: measure.id,
    action: "vetoed",
    actorPersonId: mayor,
    rationale:
      "Supplied executive return isolates reconsideration by the actual council.",
  });
  world = ensureCouncilPrinciples(world, [...members, { personId: mayor }]);
  world = { ...world, control: { kind: "observer" } } as World;
  return { world, measure, members, mayor, dispositions, provenance };
}

describe("A82 actual NPC council veto reconsideration", () => {
  it("preserves the actual returned act, members and deadline through canonical continuation", () => {
    const { world, measure, members } = vetoedAct("A82 continuation");
    const continued = deserializeWorld(serializeWorld(world));
    expect(continued).toEqual(world);
    expect(measurePosition(continued, measure.id).phase).toBe(
      "awaiting-override",
    );
    expect(overrideDeadline(continued, DC_GOVERNMENT_KEY, measure.id)).toBe(
      overrideDeadline(world, DC_GOVERNMENT_KEY, measure.id),
    );
    expect(
      municipalSeats(continued, DC_GOVERNMENT_KEY).map((seat) => seat.personId),
    ).toEqual(members.map((member) => member.personId));
    expect(continued.history.executiveDispositions).toEqual(
      world.history.executiveDispositions,
    );
  }, 120_000);

  it("reenacts a supported returned act during an ordinary council sitting without a player command", () => {
    const { world, measure, members, mayor } = vetoedAct(
      "A82 recorded NPC override",
    );
    const votes = decideCouncilVote(world, {
      stableKey: `${measure.stableKey}:fixture-vote`,
      measureId: measure.id,
      jurisdictionId: measure.jurisdictionId,
      members,
      playerPersonId: null,
      questionLabel: `Reenact ${measure.designation}`,
      executivePersonId: mayor,
      nonpartisan: false,
    });
    expect(
      votes.filter((vote) => vote.disposition === "yea").length,
    ).toBeGreaterThanOrEqual(9);
    expect(
      world.currentDate <=
        overrideDeadline(world, DC_GOVERNMENT_KEY, measure.id)!,
    ).toBe(true);
    const finished = dcCouncilSittingHandler(world).world;
    expect(
      measureActions(finished, measure.id).some(
        (action) => action.kind === "override-succeeded",
      ),
    ).toBe(true);
    expect(measurePosition(finished, measure.id).phase).not.toBe(
      "awaiting-override",
    );
  }, 120_000);

  it("continues to refuse the player command without a controlled council member", () => {
    const { world, measure, dispositions, provenance } =
      vetoedAct("A82 actor guard");
    const result = overrideCouncilVeto(world, {
      governmentKey: DC_GOVERNMENT_KEY,
      measureId: measure.id,
      dispositions,
      provenance,
    });
    expect(result.ok).toBe(false);
    expect(result.world).toBe(world);
  }, 120_000);
});
