import { randomInt } from "node:crypto";
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { projectCongress } from "../../simulation/living-world/congress";
import { readRelationshipStanding } from "../../simulation/relationship-standing";
import * as native from "../../simulation/governing/joint-assembly";
import {
  electPresidingOfficer as nativePresiding,
  type ChamberMember,
} from "../../simulation/governing/presiding-officers";
import { principleAgreement as nativeAgreement } from "../../simulation/governing/officeholder-principles";
import { electPresidingOfficer } from "./presiding-officers";
import { jointAssemblyVote, type BallotFacts } from "./ballots";
import { principleAgreement } from "./principle-agreement";
import { totalsFor } from "./congress-totals";
const watchedPlace =
  Object.keys(STATES)[randomInt(Object.keys(STATES).length)]!;
describe("legislatures: native presiding and joint-assembly callers in generated Worlds", () => {
  it.each(Object.keys(STATES))(
    "matches both ballot rounds, full congressional counts and joint assembly in %s",
    (place) => {
      const base = smallWorld({
        place: `US-${place}`,
        seed: `rules2-sendback-legislature-ballots:${place}`,
        offices: ["congress", "state-legislature"],
      }).world;
      const congress = projectCongress(base)!;
      for (const chamber of [congress.house, congress.senate])
        expect(totalsFor(chamber.seats)).toEqual(chamber.totals);
      const members: ChamberMember[] = congress.senate.seats.flatMap((seat) =>
        seat.occupant.kind === "member"
          ? [
              {
                personId: seat.occupant.member.personId,
                party: seat.occupant.member.partyOrganizationId ?? "No party",
                serviceSince: seat.occupant.member.startedAt,
              },
            ]
          : [],
      );
      const input = {
        stableKey: `rules2-sendback:${place}:presiding`,
        officeTitle: "President pro tempore",
        members,
      };
      const old = nativePresiding(base, input),
        world = old.world;
      const relationships = new Map<
        string,
        ReturnType<typeof readRelationshipStanding>
      >();
      for (const viewer of members)
        for (const subject of members)
          if (viewer.personId !== subject.personId)
            relationships.set(
              `${viewer.personId}:${subject.personId}`,
              readRelationshipStanding(
                world,
                viewer.personId,
                subject.personId,
              ),
            );
      const selectedOptions = new Map<string, string | null>();
      for (const round of old.election.caucusVotes)
        for (const ballot of round.vote.ballots)
          selectedOptions.set(
            `${input.stableKey}:caucus:${round.caucus}:${ballot.personId}`,
            ballot.candidateKey,
          );
      for (const ballot of old.election.floorVote.ballots)
        selectedOptions.set(
          `${input.stableKey}:floor:${ballot.personId}`,
          ballot.candidateKey,
        );
      const facts: BallotFacts = {
        onDate: world.currentDate,
        principles: world.history.principles,
        propositionBearings: undefined,
        playerPersonId:
          world.control.kind === "person" ? world.control.personId : null,
        relationships,
        selectedOptions,
      };
      expect(electPresidingOfficer(facts, input)).toEqual(old.election);
      for (const viewer of members.slice(0, 3))
        for (const subject of members.slice(0, 3))
          expect(
            principleAgreement(facts, viewer.personId, subject.personId),
          ).toEqual(nativeAgreement(world, viewer.personId, subject.personId));
      const assembly = native.seatedStateLegislators(world, place);
      if (assembly) {
        const candidates = native.jointAssemblyCandidates(assembly, null);
        const jointInput = {
          stableKey: `rules2-sendback:${place}:joint`,
          members: assembly,
          candidates,
        };
        const oldVote = native.jointAssemblyVote(world, jointInput);
        for (const ballot of oldVote.ballots)
          selectedOptions.set(
            `${jointInput.stableKey}:${ballot.personId}`,
            ballot.candidateKey,
          );
        expect(jointAssemblyVote(facts, jointInput)).toEqual(oldVote);
      }
      if (place === watchedPlace)
        writeFileSync(
          "/tmp/rules2-legislatures-watch.json",
          JSON.stringify(
            {
              place,
              seed: world.seed,
              worldId: world.id,
              caucuses: old.election.caucusVotes.length,
              winnerPersonId: old.election.winnerPersonId,
              floorBallots: old.election.floorVote.ballots.length,
              time: new Date().toISOString(),
            },
            null,
            2,
          ),
        );
    },
    30000,
  );
});
