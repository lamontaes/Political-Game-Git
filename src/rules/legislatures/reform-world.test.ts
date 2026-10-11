import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { reformCause as nativeGovernor } from "../../simulation/living-world/constitutional-reform";
import { federalReformCause as nativePresident } from "../../simulation/living-world/federal-reform";
import {
  currentStateExecutiveHolders,
  stateExecutiveOffice,
} from "../../simulation/nationwide-world/state-executives";
import { nextFilableStateExecutiveTerm } from "../../simulation/nationwide-world/state-executive-turnover-calendar";
import { executiveTermLimitInWorld } from "../../simulation/nationwide-world/executive-term-limits";
import { datedTermsInOffice } from "../../simulation/nationwide-world/prior-terms";
import { currentPresidentOf } from "../../simulation/crisis/offices";
import { presidentialTermLimitAt } from "../../simulation/nationwide-world/presidential-turnover";
import { constitutionalMemberBody } from "../../simulation/constitutional-process";
import { NATIONAL_ELECTION_JURISDICTION } from "../../simulation/national-election-geography";
import { recordWorldEvent } from "../../simulation/world";
import { makeIsoDate } from "../../simulation/dates";
import type { World, EntityId } from "../../simulation/types";
import { reformCause, type GovernorReformFacts } from "./governor-reform";
import {
  federalReformCause,
  nextTermStart,
  type PresidentReformFacts,
} from "./president-reform";

// These controls write fictional prior-tenure events through the native writer.
// They check restore/extend math, not spontaneous constitutional proposals.
function tenure(world: World, personId: EntityId, officeKey: string): World {
  let next = world;
  for (const year of [2013, 2017, 2021])
    next = recordWorldEvent(next, {
      stableKey: `rules2:reform:${officeKey}:${year}`,
      type: "world.office-tenure",
      occurredAt: makeIsoDate(`${year}-01-20`),
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [personId],
      participants: [{ personId, role: "focus:subject", detail: null }],
      personFactConstraints: [],
      visibility: "public",
      summary: "Authored prior-tenure equivalence control.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
      tags: [`office:${officeKey}`, `term-end:${year + 4}-01-20`],
    });
  return next;
}
function governorFacts(world: World, place: string): GovernorReformFacts {
  const office = stateExecutiveOffice(place),
    holders = currentStateExecutiveHolders(world);
  const nextTerm = nextFilableStateExecutiveTerm(world, place);
  const limit = nextTerm
    ? executiveTermLimitInWorld(world, place, nextTerm.startsAt)
    : null;
  const holder = office
    ? holders.find((row) => row.officeKey === office.officeKey)
    : null;
  return {
    playerPersonId:
      world.control.kind === "person" ? world.control.personId : null,
    offices: new Map(office ? [[place, office]] : []),
    holders,
    nextTerm,
    limit,
    // The office owner's dated tenure rows are input records; the new election
    // kernel counts consecutive/lifetime service and applies the dated rule.
    terms:
      holder && limit
        ? datedTermsInOffice(world, holder.personId, limit.officeKey)
        : [],
  };
}
function presidentFacts(world: World): PresidentReformFacts {
  const base = {
    onDate: world.currentDate,
    events: world.history.events,
    records: world.history.nationalElectionRecords ?? [],
    presidentPersonId: currentPresidentOf(world)?.personId ?? null,
    playerPersonId:
      world.control.kind === "person" ? world.control.personId : null,
    playerBodyKey:
      world.control.kind === "person"
        ? constitutionalMemberBody(
            world,
            world.control.personId,
            NATIONAL_ELECTION_JURISDICTION.id,
          )
        : null,
  };
  // Dated limits come from the upstream enacted-law reader, not a reform oracle.
  const year = Number(world.currentDate.slice(0, 4));
  const startsAt = makeIsoDate(`${Math.ceil(year / 4) * 4 + 1}-01-20`);
  return { ...base, limit: presidentialTermLimitAt(world, startsAt) };
}
describe("legislatures: executive reform causes at native World boundaries", () => {
  it.each(Object.keys(STATES))(
    "matches current and prior-tenure controls in %s",
    (place) => {
      let world = smallWorld({
        place: `US-${place}`,
        seed: `rules2-reform:${place}`,
        offices: ["governor", "congress"],
      }).world;
      world = { ...world, control: { kind: "observer" } };
      const check = (snapshot: World) => {
        expect(reformCause(governorFacts(snapshot, place), place)).toEqual(
          nativeGovernor(snapshot, place),
        );
        const facts = presidentFacts(snapshot);
        expect(nextTermStart(facts)).toBe(
          makeIsoDate(
            `${Math.ceil(Number(snapshot.currentDate.slice(0, 4)) / 4) * 4 + 1}-01-20`,
          ),
        );
        expect(federalReformCause(facts)).toEqual(nativePresident(snapshot));
      };
      check(world);
      const governor = governorFacts(world, place).holders.find(
        (row) => row.officeKey === stateExecutiveOffice(place)?.officeKey,
      );
      if (governor)
        world = tenure(world, governor.personId, governor.officeKey);
      const president = currentPresidentOf(world)?.personId;
      if (president) world = tenure(world, president, "us-president");
      check(world);
      if (governor)
        check({
          ...world,
          control: { kind: "person", personId: governor.personId },
        });
      if (president)
        check({ ...world, control: { kind: "person", personId: president } });
    },
    30000,
  );
});
