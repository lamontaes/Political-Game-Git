import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  stateCandidacyPack,
  candidacyPacks,
} from "../../simulation/candidacy-packs";
import {
  stateLegislators,
  STATE_LEGISLATURE_KEYS,
} from "../../simulation/nationwide-world/state-legislature-opening";
import { stateJurisdictionForKey } from "../../simulation/life-places";
import { institutionOfficeBindingAt } from "../../simulation/enacted-rule-changes";
import { workRoleAt, workStatusAt } from "../../simulation/life-queries";
import { stateMemberSeatingEvidence as nativeEvidence } from "../../simulation/governing/member-seating";
import {
  legislativeTermForRelationship as nativeTerm,
  activeLegislativeTermEvidence as nativeActive,
} from "../../simulation/legislative-office-terms";
import {
  SUPPORTED_LEGISLATIVE_TERM_RULES,
  REVIEWED_LEGISLATIVE_TERM_PROFILES,
  BLANKET_LEGISLATIVE_TERM_RULE_VERSION,
} from "../../simulation/legislative-term-rules";
import { stateMemberSeatingEvidence } from "./seating-evidence";
import {
  legislativeTermForRelationship,
  activeLegislativeTermEvidence,
  type LegislativeEvidenceFacts,
} from "./term-evidence";
import { lateTermEntryKey } from "../../simulation/late-term-entry-events";
import type { EntityId } from "../../simulation/types";
describe("legislatures: saved state seating evidence", () => {
  it.each(Object.keys(STATES))(
    "matches native opening proof and term evidence in %s",
    (place) => {
      const world = smallWorld({
        place: `US-${place}`,
        seed: `rules2-leg-seating:${place}`,
        offices: ["congress", "state-legislature"],
      }).world;
      const pack = stateCandidacyPack(`US-${place}`),
        jurisdiction = stateJurisdictionForKey(`US-${place}`)!;
      const packs = new Map(candidacyPacks().map((row) => [row.packId, row]));
      const raw: LegislativeEvidenceFacts = {
        onDate: world.currentDate,
        nextSequence: world.history.nextSequence,
        people: world.people,
        deaths: world.history.personDeaths,
        dueItems: world.history.futureDueItems,
        dueStates: world.history.futureDueItemStates,
        relationships: world.history.workRelationships,
        contests: world.history.electionContests ?? [],
        results: world.history.electionContestResults ?? [],
        campaigns: world.history.campaigns ?? [],
        organizations: world.history.organizations,
        jurisdictionsByKey: new Map(
          Object.keys(STATES).flatMap((key) => {
            const row = stateJurisdictionForKey(`US-${key}`);
            return row ? [[`US-${key}`, row] as const] : [];
          }),
        ),
        termFacts: new Map(
          [...packs.values()].flatMap((row) =>
            row.offices.map(
              (office) =>
                [
                  office.officeKey,
                  {
                    supported: SUPPORTED_LEGISLATIVE_TERM_RULES,
                    reviewed: REVIEWED_LEGISLATIVE_TERM_PROFILES,
                    officeExists: true,
                    knownTermYears:
                      office.qualification.termYears.kind === "known"
                        ? office.qualification.termYears.value
                        : null,
                    blanketVersion: BLANKET_LEGISLATIVE_TERM_RULE_VERSION,
                  },
                ] as const,
            ),
          ),
        ),
        workRoles: new Map(
          world.history.workRelationships.flatMap((row) => {
            const role = workRoleAt(world, row.id);
            return role ? [[row.id, role] as const] : [];
          }),
        ),
        workStatuses: new Map(
          world.history.workRelationships.flatMap((row) => {
            const status = workStatusAt(world, row.id);
            return status ? [[row.id, status] as const] : [];
          }),
        ),
        events: world.history.events,
        packs,
        intervals: world.history.districtResidenceIntervals ?? [],
        resolutions: new Map(),
        chamberFacts: new Map(),
      };
      for (const relationship of world.history.workRelationships.filter(
        (row) => row.kind === "employment:legislative-member",
      )) {
        expect(legislativeTermForRelationship(raw, relationship.id)).toEqual(
          nativeTerm(world, relationship.id),
        );
        expect(activeLegislativeTermEvidence(raw, relationship.id)).toEqual(
          nativeActive(world, relationship.id),
        );
      }
      if (!pack) {
        expect(
          world.history.events.some(
            (row) =>
              row.stableKey ===
              STATE_LEGISLATURE_KEYS.opening(`missing:${place}`),
          ),
        ).toBe(false);
        return;
      }
      const members = stateLegislators(world, pack.packId);
      expect(members.length).toBeGreaterThan(0);
      const cutoff = {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      };
      for (const member of members.slice(0, 8)) {
        const facts = {
          cutoff,
          holders: members,
          workRelationships: world.history.workRelationships,
          binding: institutionOfficeBindingAt(
            world,
            member.officeKey,
            jurisdiction.id,
            cutoff,
          ),
          workStatuses: raw.workStatuses,
          events: world.history.events,
          openingStableKey: STATE_LEGISLATURE_KEYS.opening(pack.packId),
          seatStableKey: STATE_LEGISLATURE_KEYS.seat(
            member.officeKey,
            member.ordinal,
          ),
          lateStableKey: lateTermEntryKey(member.workRelationshipId),
          termEvidenceFacts: raw,
        };
        const expected = nativeEvidence(
          world,
          pack.packId,
          jurisdiction.id,
          member,
        );
        expect(
          stateMemberSeatingEvidence(
            facts,
            pack.packId,
            jurisdiction.id,
            member,
          ),
        ).toEqual(expected);
        expect(expected?.kind).toBe("opening-seating");
        expect(
          stateMemberSeatingEvidence(facts, pack.packId, jurisdiction.id, {
            ...member,
            workRelationshipId: "missing" as EntityId,
          }),
        ).toEqual(
          nativeEvidence(world, pack.packId, jurisdiction.id, {
            ...member,
            workRelationshipId: "missing" as EntityId,
          }),
        );
      }
    },
    30000,
  );
});
