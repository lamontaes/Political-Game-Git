import { describe, expect, it, vi } from "vitest";
import {
  termLimitCount as nativeCount,
  termLimitConsiderations as nativeConsiderations,
} from "../../simulation/living-world/federal-reform";
import {
  termLimitCount,
  termLimitConsiderations,
  type TermLimitVoteFacts,
} from "./term-limit-votes";
import * as amendmentWriter from "../../simulation/governing/constitutional-amendments";
import * as nativeVotes from "../../simulation/governing/chamber-votes";
import * as ownVotes from "./chamber-vote";
import { congressVoters } from "../../simulation/governing/article-v";
import { seatedCongressChamber } from "../../simulation/governing/congress-chambers";
import { readRelationshipStanding } from "../../simulation/relationship-standing";
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
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../../simulation/national-election-geography";
import { recordWorldEvent } from "../../simulation/world";
import { makeIsoDate, addDays } from "../../simulation/dates";
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
      // Move date and moment together for this authored late-year proposal edge.
      // The owning review caller registers the national jurisdiction before
      // reaching the public count; reproduce that native preparation here.
      const countingDate = addDays(world.currentDate, 300);
      world = {
        ...world,
        currentDate: countingDate,
        currentMoment: { ...world.currentMoment, date: countingDate },
      };
      world = ensureNationalElectionJurisdiction(world);
      const cause = nativePresident(world);
      if (!cause)
        throw new Error(
          "The authored prior-service control needs a native cause.",
        );
      const voters = [
        ...congressVoters(world, "house"),
        ...congressVoters(world, "senate"),
      ];
      const parties = new Map(
        [...voters.map((row) => row.personId), cause.holderPersonId].map(
          (id) => [id, nativeVotes.publicPartyOf(world, id)],
        ),
      );
      const relationships = new Map(
        voters.map((row) => [
          `${row.personId}:${cause.holderPersonId}`,
          readRelationshipStanding(world, row.personId, cause.holderPersonId),
        ]),
      );
      const requests: Parameters<typeof amendmentWriter.proposeAmendment>[] =
        [];
      const receipts: {
        input: Parameters<typeof nativeVotes.decideChamberVote>[1];
        rows: ReturnType<typeof nativeVotes.decideChamberVote>;
      }[] = [];
      const proposalOriginal = amendmentWriter.proposeAmendment,
        voteOriginal = nativeVotes.decideChamberVote;
      const proposalCapture = vi
        .spyOn(amendmentWriter, "proposeAmendment")
        .mockImplementation((...args) => {
          requests.push(args);
          return proposalOriginal(...args);
        });
      const voteCapture = vi
        .spyOn(nativeVotes, "decideChamberVote")
        .mockImplementation((at, input, options) => {
          const rows = voteOriginal(at, input, options);
          receipts.push({ input, rows });
          return rows;
        });
      let counted;
      try {
        counted = nativeCount(world, 2026, cause);
      } finally {
        proposalCapture.mockRestore();
        voteCapture.mockRestore();
      }
      expect(requests).toHaveLength(1);
      expect(receipts).toHaveLength(2);
      const raw: TermLimitVoteFacts = {
        onDate: world.currentDate,
        playerPersonId: null,
        parties,
        relationships,
        measures: world.history.constitutionalMeasures ?? [],
        bodies: new Map(
          ["house", "senate"].map((key) => [
            key,
            seatedCongressChamber(world, key)?.body ?? null,
          ]),
        ),
        // The public parent protocol replays independently checked child ballots;
        // no second chooser or invented member evaluation is used here.
        votes: new Map(),
        federalJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        proposalText: requests[0]![1].text,
      };
      for (const voter of voters)
        expect(termLimitConsiderations(raw, voter, cause)).toEqual(
          nativeConsiderations(world, voter, cause),
        );
      expect(termLimitCount(raw, 2026, cause)).toEqual({
        kind: "prepare",
        commands: [{ command: "proposeAmendment", input: requests[0]![1] }],
      });
      let cursor = 0;
      const replay = vi
        .spyOn(ownVotes, "decideChamberVote")
        .mockImplementation((_facts, input) => {
          const receipt = receipts[cursor++]!;
          expect(input).toEqual(receipt.input);
          return receipt.rows;
        });
      try {
        expect(
          termLimitCount(
            {
              ...raw,
              measures: counted.world.history.constitutionalMeasures ?? [],
            },
            2026,
            cause,
          ),
        ).toEqual({
          kind: "counted",
          measureId: counted.measureId,
          houses: counted.houses,
          carries: counted.carries,
        });
        expect(cursor).toBe(2);
      } finally {
        replay.mockRestore();
      }
    },
    30000,
  );
});
