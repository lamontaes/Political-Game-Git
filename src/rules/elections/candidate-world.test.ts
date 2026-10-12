import * as nativeNominations from "../../simulation/nominations/party-nominations";
import {
  filedNominationDue,
  filedPrimaryEntrants,
  filedRunoffDue,
} from "./filed-nominations";
import { holdNominationPrimary, countNominationRunoff } from "./primary";
import { stateJurisdictionForKey } from "../../simulation/life-places";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  makeIsoDate,
  simulationMomentAtLocalTime,
} from "../../simulation/dates";
import { stateCandidacyPack } from "../../simulation/candidacy-packs";
import {
  stateLegislativeSeats,
  planStateChambers,
} from "../../simulation/nationwide-world/state-legislature-opening";
import * as oldCandidate from "../../simulation/nationwide-world/state-legislature-candidates";
import { nominationPlan } from "../../simulation/nominations/nomination-rules";
import { stateLegislativeElectionRule } from "../../simulation/nationwide-world/state-legislative-election-calendar";
import { generalElectionDay } from "../../simulation/nationwide-world/state-executive-term-rules";
import { filingWindowOpens } from "../../simulation/nominations/field-entry";
import { bindingFromIdentity } from "../../districts/query";
import { stateResidenceSince } from "../../simulation/nationwide-world/residence-duration";
import { districtResidenceSince } from "../../simulation/district-residence";
import { candidateQualificationRuleSet } from "../../simulation/candidate-qualification";
import {
  officeFamilyForChamberKey,
  officeQualifications,
} from "../../simulation/office-qualification-rules";
import { standInQualification } from "../../simulation/office-qualification-profile";
import {
  selfStarterParties,
  satisfiesKnownQualifications,
} from "./candidate-standing";
describe("elections: private state candidate predicates through native slate writer", () => {
  it.each(Object.keys(STATES))(
    "matches native qualification and generated self-starter pools in %s",
    (place) => {
      const base = smallWorld({
        place: `US-${place}`,
        seed: `rules2-sendback-candidate:${place}`,
        offices: ["congress", "state-legislature"],
      });
      const pack = stateCandidacyPack(`US-${place}`);
      if (!pack) return;
      const date = makeIsoDate("2026-03-01");
      const clocked = {
        ...base.world,
        currentDate: date,
        currentMoment: simulationMomentAtLocalTime({
          date,
          minuteOfDay: 0,
          timeZone: base.world.currentMoment.timeZone,
        }),
      };
      const chambers = planStateChambers(pack).chambers;
      const seats = stateLegislativeSeats(clocked, pack.packId).filter(
        (row) => row.ordinal === 1,
      );
      const plans: oldCandidate.StateCandidateSeatPlan[] = seats.map((seat) => {
        const office = pack.offices.find(
          (row) => row.officeKey === seat.officeKey,
        )!;
        const district = chambers.find(
          (chamber) => chamber.officeKey === seat.officeKey,
        )?.districts[seat.ordinal - 1];
        return {
          packId: pack.packId,
          jurisdictionKey: pack.jurisdictionKey,
          officeKey: seat.officeKey,
          ordinal: seat.ordinal,
          title: seat.title,
          minimumAge:
            office.qualification.minimumAge.kind === "known"
              ? office.qualification.minimumAge.value
              : oldCandidate.STATE_LEGISLATURE_CANDIDATE_PROFILE
                  .unknownMinimumAge,
          usesGeneratedResidencyRule:
            office.qualification.residency.kind === "known" &&
            office.qualification.residency.source?.authority === "game-profile",
          districtBinding: district ? bindingFromIdentity(district) : null,
          democraticShare: oldCandidate.stateSeatDemocraticShare(
            clocked,
            pack.packId,
            seat.officeKey,
            seat.ordinal,
          ),
          incumbentPersonId: null,
          incumbentParty: null,
          incumbentSeeking: false,
          intakeDate: date,
          nomination: nominationPlan(clocked, {
            stateUsps: place,
            family: "state-legislature",
            year: 2026,
            onDate: filingWindowOpens(2026),
            generalDay: generalElectionDay(
              stateLegislativeElectionRule(place),
              2026,
            ),
          }),
        };
      });
      const world = oldCandidate.prepareStateCandidateSlates(
        clocked,
        2026,
        plans,
      );
      const after = makeIsoDate("2027-01-01");
      const later = {
        ...world,
        currentDate: after,
        currentMoment: simulationMomentAtLocalTime({
          date: after,
          minuteOfDay: 0,
          timeZone: world.currentMoment.timeZone,
        }),
      };
      const seatsByKey = new Map(
        plans.map((plan) => [
          oldCandidate.stateCandidateSeatKey(
            plan.packId,
            plan.officeKey,
            plan.ordinal,
          ),
          plan,
        ]),
      );
      const nominated = nativeNominations.holdFiledNominations(date, later, {
        fieldType: "election.state-legislative-candidate-slate",
        stableKeySuffix: ":2026",
        seatFor: (field) => {
          const key = field.tags
            .find((tag) => tag.startsWith("seat:"))
            ?.slice(5);
          const plan = key ? seatsByKey.get(key) : null;
          if (!plan || !key) return null;
          return {
            seatKey: key,
            title: plan.title,
            jurisdictionId: stateJurisdictionForKey(pack.jurisdictionKey)!.id,
            involvedEntityIds: [],
            plan: () => plan.nomination!,
            partyShare: (party) =>
              plan.democraticShare === null
                ? null
                : party === "democratic"
                  ? plan.democraticShare
                  : party === "republican"
                    ? 1 - plan.democraticShare
                    : null,
            aliveOn: (id, on) =>
              !!later.people[id] &&
              !later.history.personDeaths.some(
                (death) => death.personId === id && death.diedAt <= on,
              ),
          };
        },
      });
      for (const field of world.history.events.filter(
        (event) => event.type === "election.state-legislative-candidate-slate",
      )) {
        const key = field.tags.find((tag) => tag.startsWith("seat:"))!.slice(5);
        const plan = seatsByKey.get(key)!;
        const due = filedNominationDue(
          date,
          after,
          field,
          "election.state-legislative-candidate-slate",
          ":2026",
          null,
        );
        const primary = nativeNominations.nominationPrimaryRecord(
          nominated,
          field.stableKey,
        );
        if (due?.primaryDue && plan.nomination?.known) {
          const living = new Set(
            world.personOrder.filter(
              (id) =>
                !!world.people[id] &&
                !world.history.personDeaths.some(
                  (death) =>
                    death.personId === id && death.diedAt <= due.primaryDate,
                ),
            ),
          );
          const entrants = filedPrimaryEntrants(
            field,
            due.primaryDate,
            plan.nomination,
            living,
          );
          if (entrants.length) {
            expect(primary).toBeTruthy();
            const counted = holdNominationPrimary({
              plan: plan.nomination,
              entrants,
              partyShare: (party) =>
                plan.democraticShare === null
                  ? null
                  : party === "democratic"
                    ? plan.democraticShare
                    : party === "republican"
                      ? 1 - plan.democraticShare
                      : null,
              runoffRequested: (party) =>
                primary!.tags.includes("runoff-party:" + party),
            });
            expect(
              primary!.participants.map((row) => ({
                personId: row.personId,
                detail: row.detail,
              })),
            ).toEqual(
              counted.rows
                .map((row) => ({
                  personId: row.tally.entrant.personId,
                  detail:
                    row.tally.entrant.party +
                    "|" +
                    row.tally.permille +
                    "|" +
                    row.status,
                }))
                .sort((a, b) => a.personId.localeCompare(b.personId)),
            );
          }
        } else expect(primary).toBeNull();
        if (primary) {
          const runoffOn = nativeNominations.runoffDateOf(primary);
          const runoff = nominated.history.events.find(
            (event) => event.stableKey === field.stableKey + ":runoff",
          );
          expect(!!runoff).toBe(filedRunoffDue(date, after, runoffOn));
          if (runoff)
            expect(
              runoff.participants.map((row) => ({
                personId: row.personId,
                detail: row.detail,
              })),
            ).toEqual(
              countNominationRunoff(
                primary,
                (id) =>
                  !!nominated.people[
                    world.personOrder.find((person) => person === id)!
                  ],
              ).rows.sort((a, b) => a.personId.localeCompare(b.personId)),
            );
        }
      }
      for (const plan of plans) {
        const seatKey = oldCandidate.stateCandidateSeatKey(
          plan.packId,
          plan.officeKey,
          plan.ordinal,
        );
        const prefix = `life-context-v1:${oldCandidate.STATE_LEGISLATURE_CANDIDATE_VERSION}:${seatKey}:2026:`;
        const people = world.personOrder.filter((id) =>
          world.people[id]?.generationKey?.startsWith(prefix),
        );
        const generatedSelfStarters = people.flatMap((id) => {
          const key = world.people[id]!.generationKey!;
          return key.endsWith(":self-starter")
            ? [key.slice(prefix.length).split(":")[0]!]
            : [];
        });
        expect(generatedSelfStarters.sort()).toEqual(
          [...selfStarterParties(plan)].sort(),
        );
        for (const personId of people.filter((id) =>
          world.people[id]!.generationKey!.endsWith(":prospect"),
        )) {
          const family = officeFamilyForChamberKey(
            plan.officeKey.split(":").at(-1) ?? "",
          );
          const qualified = satisfiesKnownQualifications(
            {
              person: world.people[personId]!,
              stateSince: stateResidenceSince(
                world,
                personId,
                plan.jurisdictionKey,
                date,
              ),
              districtSince: plan.districtBinding
                ? districtResidenceSince(
                    world,
                    personId,
                    plan.districtBinding,
                    date,
                  )
                : null,
              rules: candidateQualificationRuleSet(
                plan.packId,
                plan.officeKey,
                date,
              ),
              family,
              supportedRows: family
                ? officeQualifications(plan.jurisdictionKey, family, date)
                : [],
              drawn: family
                ? standInQualification(
                    plan.jurisdictionKey,
                    "STATE_RESIDENCE",
                    family,
                  )
                : null,
            },
            plan,
          );
          const recruited = world.history.events.some(
            (event) =>
              event.type === "election.state-legislative-recruitment" &&
              event.tags.includes(`seat:${seatKey}`) &&
              event.participants.some((p) => p.personId === personId),
          );
          expect(qualified).toBe(recruited);
        }
      }
    },
  );
});
