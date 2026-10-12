import { institutionOfficeBindingAt } from "../../simulation/enacted-rule-changes";
import { stateJurisdictionForKey } from "../../simulation/life-places";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { SeededRng } from "../../simulation/rng";
import { makeIsoDate } from "../../simulation/dates";
import { stateCandidacyPack } from "../../simulation/candidacy-packs";
import {
  STATE_LEGISLATURE_KEYS,
  planStateChambers,
  stateLegislators,
  recordedChamberParties,
} from "../../simulation/nationwide-world/state-legislature-opening";
import { congressSeats } from "../../simulation/living-world/congress-seats";
import { politicalStartingConditions } from "../../simulation/world-setup/conditions";
import { inventedPersonAge } from "../../simulation/invented-person-age";
import { standardNormal } from "../../simulation/world-setup/deterministic-math";
import {
  LIVING_WORLD_KEYS,
  livingWorldOrganizationId,
  PARTY_AFFILIATION_KIND,
} from "../../simulation/living-world/opening";
import * as oldLimits from "../../simulation/nationwide-world/state-legislative-term-limits";
import {
  workStatusHistory,
  organizationProfileAt,
  currentLifeCutoff,
} from "../../simulation/life-queries";
import { createStableId } from "../../simulation/ids";
import {
  legislativeTermForRelationship,
  legislativeTermDates as oldTermDates,
} from "../../simulation/legislative-office-terms";
import {
  SUPPORTED_LEGISLATIVE_TERM_RULES,
  REVIEWED_LEGISLATIVE_TERM_PROFILES,
  BLANKET_LEGISLATIVE_TERM_RULE_VERSION,
} from "../../simulation/legislative-term-rules";
import * as oldFilling from "../../simulation/nationwide-world/state-legislature-turnover";
import * as oldCalendars from "../../simulation/nationwide-world/state-legislative-election-calendar";
import { GOVERNOR_TURNOVER_PROFILE } from "../../simulation/nationwide-world/state-executive-turnover-calendar";
import {
  stateOpeningBaseline,
  ensureStateLegislatureOpening,
  affiliationIndexes,
  stateInstitutionSeats,
  stateInstitutionBinding,
  type OpeningDraw,
} from "./state-opening";
import { legislativeTermLimitBar } from "./legislative-term-limits";
import { nextStateSeatFilling } from "./state-filling";
import {
  legislativeTermDates,
  type LegislativeTermFacts,
} from "./legislative-terms";
const calendar = {
  reviewedCycles: oldCalendars.REVIEWED_REGULAR_SEAT_CYCLES,
  fieldClosesDaysBefore: GOVERNOR_TURNOVER_PROFILE.fieldClosesDaysBefore,
};
describe("elections: state opening and term-limit math from native generated records", () => {
  it.each(Object.keys(STATES))(
    "matches the opening and each chamber's service in %s",
    (place) => {
      const { world, personId } = smallWorld({
        place: `US-${place}`,
        seed: `rules2-sendback-state:${place}`,
        offices: ["congress", "state-legislature"],
      });
      const pack = stateCandidacyPack(`US-${place}`);
      if (!pack) {
        expect(
          ensureStateLegislatureOpening({
            date: world.currentDate,
            pack: null,
            established: false,
            subjectExists: true,
            politicalExists: true,
            jurisdictionExists: true,
            chambers: [],
            center: null,
            spread: 0,
            partyIds: [],
            limit: null,
            draws: new Map(),
            recordedParties: {},
          }),
        ).toBeNull();
        return;
      }
      const political = politicalStartingConditions(world)!;
      const baseline = stateOpeningBaseline(
        { seats: congressSeats(), conditions: political.seats },
        place,
      );
      const chambers = planStateChambers(pack).chambers;
      const partyIds = ["democratic", "republican"].filter((party) =>
        world.history.organizations.some(
          (org) =>
            org.id ===
            livingWorldOrganizationId(
              world,
              LIVING_WORLD_KEYS.nationalParty(party),
            ),
        ),
      );
      const rng = new SeededRng(world.seed).fork(
        STATE_LEGISLATURE_KEYS.opening(pack.packId),
      );
      const draws = new Map<string, OpeningDraw>();
      for (const chamber of chambers) {
        const office = pack.offices.find(
          (row) => row.officeKey === chamber.officeKey,
        )!;
        const minimumAge =
          office.qualification.minimumAge.kind === "known"
            ? office.qualification.minimumAge.value
            : 18;
        for (let ordinal = 1; ordinal <= chamber.size; ordinal++) {
          const seatRng = rng.fork(`seat:${chamber.officeKey}:${ordinal}`);
          const lean =
            baseline.center !== null && partyIds.length === 2
              ? standardNormal(seatRng.fork("lean"))
              : 0;
          const age = inventedPersonAge(
            seatRng,
            "sitting-legislator-at-opening",
            { legalMinimumAge: minimumAge },
          );
          draws.set(`${chamber.officeKey}|${ordinal}`, {
            lean,
            age,
            drawnYears: seatRng.integer(0, 13),
          });
        }
      }
      const predicted = ensureStateLegislatureOpening({
        date: world.currentDate,
        pack,
        established: false,
        subjectExists: !!world.people[personId],
        politicalExists: !!political,
        jurisdictionExists:
          !!world.jurisdictions[world.people[personId]!.homeJurisdictionId],
        chambers,
        ...baseline,
        partyIds,
        limit: oldLimits.legislativeTermLimitInForce(
          world,
          place,
          world.currentDate,
        ),
        draws,
        recordedParties: Object.fromEntries(
          chambers.map((chamber) => [
            chamber.chamberKey,
            recordedChamberParties(place, chamber.chamberKey),
          ]),
        ),
      })!;
      const saved = stateLegislators(world, pack.packId);
      const institutions = stateInstitutionSeats(
        saved,
        new Map(world.history.workRelationships.map((row) => [row.id, row])),
      );
      const jurisdictionId = stateJurisdictionForKey(pack.jurisdictionKey)!.id;
      for (const [officeKey, institution] of institutions) {
        const organization = world.history.organizations.find(
          (row) => row.id === institution.organizationId,
        );
        const profile =
          organizationProfileAt(world, institution.organizationId) ?? undefined;
        const actual = institutionOfficeBindingAt(
          world,
          officeKey,
          jurisdictionId,
          currentLifeCutoff(world),
        )!;
        const planned = stateInstitutionBinding({
          openingKey: STATE_LEGISLATURE_KEYS.opening(pack.packId),
          officeKey,
          jurisdictionId,
          date: world.currentDate,
          organization,
          profile,
          priorBindingId: null,
          tenureIds: institution.tenureIds,
        });
        expect(actual).toMatchObject({
          ...planned,
          sourceRecordIds: planned.sourceRecordIds,
        });
      }

      expect(predicted.members).toHaveLength(saved.length);
      const opening = world.history.events.find(
        (event) =>
          event.stableKey === STATE_LEGISLATURE_KEYS.opening(pack.packId),
      )!;
      expect(
        opening.tags.filter((tag) => tag.startsWith("seat-share:")),
      ).toEqual(
        predicted.seatShares
          .map(
            (row) => `seat-share:${row.officeKey}|${row.ordinal}|${row.share}`,
          )
          .sort(),
      );
      for (const member of predicted.members) {
        const actual = saved.find(
          (row) =>
            row.officeKey === member.officeKey &&
            row.ordinal === member.ordinal,
        )!;
        expect(actual.party).toBe(member.party);
        const work = world.history.workRelationships.find(
          (row) => row.id === actual.workRelationshipId,
        )!;
        expect(work.startedAt).toBe(member.serviceSince);
      }
      const index = affiliationIndexes(
        world.history.organizationParticipations,
        PARTY_AFFILIATION_KIND,
      );
      for (const member of saved) {
        const first = world.history.organizationParticipations.find(
          (row) =>
            row.personId === member.personId &&
            row.kind === PARTY_AFFILIATION_KIND,
        );
        expect(index.firstPartyByPerson.get(member.personId)).toEqual(first);
      }
      for (const office of pack.offices) {
        const term: LegislativeTermFacts = {
          supported: SUPPORTED_LEGISLATIVE_TERM_RULES,
          reviewed: REVIEWED_LEGISLATIVE_TERM_PROFILES,
          officeExists: true,
          knownTermYears:
            office.qualification.termYears.kind === "known"
              ? office.qualification.termYears.value
              : null,
          blanketVersion: BLANKET_LEGISLATIVE_TERM_RULE_VERSION,
        };
        for (const day of ["2026-11-03", "2028-11-07", "2030-11-05"]) {
          const date = makeIsoDate(day),
            legacy = oldTermDates(office.officeKey, date);
          expect(legislativeTermDates(term, office.officeKey, date)).toEqual(
            legacy && {
              startsAt: legacy.startsAt,
              endsAt: legacy.endsAt,
              ruleVersion: legacy.ruleVersion,
              basis: legacy.basis,
            },
          );
        }
        const bodyId = createStableId(
          "organization",
          `${world.id}:${STATE_LEGISLATURE_KEYS.body(pack.packId)}`,
        );
        for (const member of saved
          .filter((row) => row.officeKey === office.officeKey)
          .slice(0, 5)) {
          const input = {
            stateUsps: place,
            packId: pack.packId,
            officeKey: office.officeKey,
            personId: member.personId,
            termStartsAt: makeIsoDate("2033-01-01"),
            termEndsAt: makeIsoDate("2037-01-01"),
          };
          const facts = {
            bodyId,
            work: world.history.workRelationships,
            states: new Map(
              world.history.workRelationships.map((work) => [
                work.id,
                workStatusHistory(world, work.id),
              ]),
            ),
            contestOfficeKeys: new Map(
              world.history.workRelationships.flatMap((work) => {
                const term = legislativeTermForRelationship(world, work.id);
                return term
                  ? [[work.id, term.contest.office.officeKey] as const]
                  : [];
              }),
            ),
            rule: oldLimits.legislativeTermLimitInForce(
              world,
              place,
              input.termStartsAt,
            ),
          };
          const result = legislativeTermLimitBar(facts, input),
            old = oldLimits.legislativeTermLimitBar(world, input);
          expect(result !== null).toBe(old !== null);
          if (result) expect(old).toContain(`served ${result.served} years`);
          expect(
            nextStateSeatFilling(
              {
                pack,
                currentDate: world.currentDate,
                calendar,
                term,
                results: new Map(
                  world.history.events
                    .filter(
                      (event) =>
                        event.type ===
                          oldFilling.STATE_LEGISLATIVE_RESULTS_EVENT &&
                        event.tags.includes(`pack:${pack.packId}`),
                    )
                    .map((event) => [event.occurredAt, event]),
                ),
                contestResults: new Map(
                  (world.history.electionContestResults ?? []).map((row) => [
                    row.contestId,
                    row,
                  ]),
                ),
                deaths: new Set(
                  world.history.personDeaths.map((death) => death.personId),
                ),
              },
              pack.packId,
              office.officeKey,
              member.ordinal,
            ),
          ).toEqual(
            oldFilling.nextStateSeatFilling(
              world,
              pack.packId,
              office.officeKey,
              member.ordinal,
            ),
          );
        }
      }
    },
  );
});
