import { establishDistrictResidence } from "../../simulation/district-residence";
import { districtIdentityCatalog } from "../../districts/catalog";
import {
  listDistrictIdentities,
  resolveDistrictBinding,
  gazetteerChamberForOfficeChamberKey,
} from "../../districts/query";
import { membersInDistrict } from "../../districts/members-per-district";
import { afterAll, describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  stateCandidacyPack,
  candidacyPacks,
} from "../../simulation/candidacy-packs";
import {
  stateLegislators,
  STATE_LEGISLATURE_KEYS,
  planStateChambers,
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
import { bindingFromIdentity } from "../../districts/query";
import { candidacyEligibility } from "../../simulation/candidacy";
import {
  fileCampaign,
  resolveCampaignElectionFromRecordedInput,
} from "../../simulation/campaigns";
import { makeCurrencyCode } from "../../simulation/resources";
import { addDays } from "../../simulation/dates";
import { legislativeTermTransitionHandler } from "../../simulation/legislative-office-terms";
import { setFutureDueItemTerminalState } from "../../simulation/future-transitions";
import type { EntityId, World } from "../../simulation/types";
describe("legislatures: saved state seating evidence", () => {
  let positiveTerms = 0;
  let activeTerms = 0;
  afterAll(() => {
    expect(positiveTerms).toBeGreaterThan(0);
    expect(activeTerms).toBeGreaterThan(0);
  });
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
      const evidenceFacts = (world: World): LegislativeEvidenceFacts => ({
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
        resolutions: new Map(
          (world.history.districtResidenceIntervals ?? []).map((row) => [
            row.id,
            resolveDistrictBinding(districtIdentityCatalog(), row.binding),
          ]),
        ),
        chamberFacts: new Map(
          [...packs.values()].map((pack) => {
            const districts = Object.fromEntries(
              pack.offices.map((office) => {
                const key = office.officeKey.split(":").at(-1)!,
                  chamber = gazetteerChamberForOfficeChamberKey(key);
                return [
                  key,
                  chamber
                    ? listDistrictIdentities(districtIdentityCatalog(), {
                        stateUsps: pack.jurisdictionKey.slice(3),
                        chamber,
                      })
                    : [],
                ];
              }),
            );
            return [
              pack.packId,
              {
                districts,
                memberCounts: Object.fromEntries(
                  Object.values(districts).flatMap((rows) =>
                    rows.map((row) => [
                      row.recordId,
                      membersInDistrict(
                        row.stateUsps,
                        row.chamber,
                        row.districtCode,
                      ),
                    ]),
                  ),
                ),
                atLargeSeats: { "US-PR": { house: 11, senate: 11 } },
              },
            ];
          }),
        ),
      });
      const raw = evidenceFacts(world);
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
      const plans = planStateChambers(pack).chambers;
      const candidate = members.slice(0, 24).flatMap((member) => {
        const district = plans.find((row) => row.officeKey === member.officeKey)
          ?.districts[member.ordinal - 1];
        if (!district) return [];
        const districtBinding = bindingFromIdentity(district);
        const home = world.people[member.personId]!.homeJurisdictionId;
        const eligibility = candidacyEligibility(world, {
          personId: member.personId,
          jurisdictionId: home,
          officeKey: member.officeKey,
          alreadyACandidate: false,
          districtBinding,
        });
        return eligibility.eligible ? [{ member, home, districtBinding }] : [];
      })[0];
      // Source-unadmitted home/qualification data never becomes a fake winner.
      if (!candidate) return;
      const electionDate = addDays(world.currentDate, 1);
      const filed = fileCampaign(
        {
          ...world,
          control: { kind: "person", personId: candidate.member.personId },
        },
        {
          stableKey: `rules2:${place}:term-campaign`,
          candidatePersonId: candidate.member.personId,
          jurisdictionId: candidate.home,
          officeKey: candidate.member.officeKey,
          districtBinding: candidate.districtBinding,
          electionDate,
          rivalPersonIds: [
            world.personOrder.find((id) => id !== candidate.member.personId)!,
          ],
          existingContestId: null,
          committeeName: "Authored term committee",
          donorPoolName: "Authored contributors",
          advertisingVendorName: "Authored vendor",
          staffPersonIds: [],
          treasuryCurrency: makeCurrencyCode("USD"),
        },
      );
      const clocked = {
        ...filed.world,
        currentDate: electionDate,
        currentMoment: { ...filed.world.currentMoment, date: electionDate },
      };
      const contest = clocked.history.electionContests!.find(
        (row) => row.id === filed.campaign.contestId,
      )!;
      // Supplied results are an explicit edge input, never a vote prediction.
      const decided = resolveCampaignElectionFromRecordedInput(clocked, {
        contestId: contest.id,
        winnerPersonId: candidate.member.personId,
        tallies: contest.candidatePersonIds.map((id) => ({
          candidatePersonId: id,
          votes: 1,
          voteShare: 1 / contest.candidatePersonIds.length,
        })),
        provenance: {
          method: "authored",
          sourceEntityIds: [],
          note: "Authored provenance edge with supplied equal counts and winner; no tie law inferred.",
        },
      });
      const work = decided.history.workRelationships.find(
        (row) => nativeTerm(decided, row.id)?.contest.id === contest.id,
      )!;
      expect(work).toBeDefined();
      const term = nativeTerm(decided, work.id)!;
      expect(term).not.toBeNull();
      positiveTerms++;
      expect(
        legislativeTermForRelationship(evidenceFacts(decided), work.id),
      ).toEqual(term);
      expect(
        activeLegislativeTermEvidence(evidenceFacts(decided), work.id),
      ).toEqual(nativeActive(decided, work.id));
      // Authored legacy-save edge: erase only the saved contest binding so
      // the unchanged term reader must derive the single district from native
      // residence intervals. This is not a new unbound campaign producer.
      const residence = establishDistrictResidence(decided, {
        personId: candidate.member.personId,
        binding: candidate.districtBinding,
        startedOn: world.currentDate,
        provenance: {
          method: "authored",
          sourceEventId: null,
          note: "Explicit legacy-save district membership edge.",
        },
      });
      expect(residence.kind).toBe("recorded");
      const legacy = {
        ...residence.world,
        history: {
          ...residence.world.history,
          electionContests: residence.world.history.electionContests!.map(
            (row) =>
              row.id !== contest.id
                ? row
                : {
                    ...row,
                    office: {
                      ...row.office,
                      districtBinding: null,
                      seatKey: null,
                    },
                  },
          ),
        },
      };
      const legacyTerm = nativeTerm(legacy, work.id)!;
      expect(legacyTerm.seatKey).toBe(candidate.districtBinding.recordId);
      expect(
        legislativeTermForRelationship(evidenceFacts(legacy), work.id),
      ).toEqual(legacyTerm);
      // Isolate this authored entry edge by canceling unrelated scheduled
      // work before moving the date; a date jump must not skip active dues.
      let isolated = decided;
      for (const item of isolated.history.futureDueItems)
        if (
          item.id !== term.entry.id &&
          item.id !== term.expiry.id &&
          item.dueAt < term.startsAt &&
          isolated.history.futureDueItemStates
            .filter((row) => row.dueItemId === item.id)
            .at(-1)?.status === "scheduled"
        )
          isolated = setFutureDueItemTerminalState(isolated, {
            stableKey: `rules2:${place}:isolate-entry:${item.id}`,
            dueItemId: item.id,
            effectiveAt: isolated.currentDate,
            status: item.entityIds.includes(contest.id)
              ? "resolved"
              : "cancelled",
            reasonKey: null,
            context:
              "Authored isolated entry control records its supplied result and cancels unrelated dues.",
            outcomeEventId: item.entityIds.includes(contest.id)
              ? term.result.outcomeEventId
              : null,
          });
      const enteredAt = {
        ...isolated,
        currentDate: term.startsAt,
        currentMoment: { ...isolated.currentMoment, date: term.startsAt },
      };
      const transition = legislativeTermTransitionHandler(
        enteredAt,
        term.entry,
      );
      const entered = setFutureDueItemTerminalState(transition.world, {
        stableKey: `rules2:${place}:term-entry-state`,
        dueItemId: term.entry.id,
        effectiveAt: term.entry.dueAt,
        status: transition.status,
        reasonKey: transition.reasonKey,
        context: transition.context,
        outcomeEventId: transition.outcomeEventId,
      });
      const active = nativeActive(entered, work.id);
      if (active) activeTerms++;
      expect(
        activeLegislativeTermEvidence(evidenceFacts(entered), work.id),
      ).toEqual(active);
      for (const mutate of [
        { ...evidenceFacts(entered), results: [] },
        { ...evidenceFacts(entered), campaigns: [] },
        {
          ...evidenceFacts(entered),
          dueItems: entered.history.futureDueItems.filter(
            (row) => row.id !== term.expiry.id,
          ),
        },
      ])
        expect(legislativeTermForRelationship(mutate, work.id)).toBeNull();
    },
    30000,
  );
});
