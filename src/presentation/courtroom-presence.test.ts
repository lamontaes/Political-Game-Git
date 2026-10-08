import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { SeededRng, pickDistinct } from "../simulation/rng";
import { addDays } from "../simulation/dates";
import {
  cancelFutureDueItem,
  futureDueItemStateAt,
  resolveFutureDueItemsThrough,
} from "../simulation/future-transitions";
import { courtFor } from "../simulation/judiciary/court-for";
import {
  buildOpeningCourtCatalog,
  seatJudge,
  seatsForCourt,
} from "../simulation/judiciary/courts";
import { currentLifeCutoff } from "../simulation/life-queries";
import { courtroomSittingToday } from "../simulation/justice/courtroom-sitting";
import {
  enterPlea,
  referForProsecution,
} from "../simulation/justice/prosecution";
import { prosecutionTimingFor } from "../simulation/justice/prosecution-timing";
import { createProsecutionTransitionRegistry } from "../simulation/justice/prosecution-transitions";
import { createOrganization, createWorkRelationship } from "../simulation/life";
import type { EntityId, World } from "../simulation/types";
import {
  courtroomLocationKey,
  courtroomPresentPeople,
} from "./courtroom-presence";
import { placeForLocationKey } from "./place-backdrops";

const SEED = "co8-county-courtroom-20261006b";
const states = pickDistinct(new SeededRng(SEED), lifePlaceStateIdentities(), 3);

/**
 * Ordinary worlds seat no prosecutor yet, so this one is appointed through the
 * existing life writers, the same way the court-clock test does it.
 */
function withProsecutor(world: World, defendantId: EntityId, venue: EntityId) {
  const person = world.people[world.personOrder[1]!]!;
  const provenance = {
    kind: "authored" as const,
    note: "Controlled recorded prosecutor appointment fixture; no opening official is invented.",
  };
  let next = createOrganization(world, {
    stableKey: "co8:fixture:office",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Recorded prosecution office",
      classification: "sector:government",
      locationJurisdictionId: venue,
    },
  });
  const organizationId = next.history.organizations.at(-1)!.id;
  next = createWorkRelationship(next, {
    stableKey: "co8:fixture:appointment",
    personId: person.id,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:executive-office",
    compensation: "unpaid",
    authority: "self-directed",
    dependency: "independent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Prosecutor",
      occupationClassification: "profession:prosecutor",
      locationJurisdictionId: venue,
      timeDemand: {
        expectedWeekly: { minimumHours: 0, maximumHours: 0 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: venue,
      },
    },
  });
  return { world: next, prosecutorId: person.id };
}

describe("the county courtroom shows the court's own day", () => {
  it.each(states)(
    `places the prosecutor and jurors the saved records name, only on the day the court sat in $jurisdictionKey (seed ${SEED})`,
    (state) => {
      const place = { key: state.jurisdictionKey };
      // Three residents: the court summons its estimated county jury itself.
      const small = smallWorld({
        place: place.key,
        people: 3,
        seed: SEED,
        date: "2026-01-01",
      });
      let judged = buildOpeningCourtCatalog(small.world);
      const court = courtFor(
        judged,
        small.jurisdictionId,
        "local-general-trial",
        "criminal",
      )!;
      judged = seatJudge(judged, {
        seatId: seatsForCourt(judged, court.courtId)[0]!.seatId,
        personId: judged.personOrder.at(-1)!,
        startedAt: judged.currentDate,
        selection: {
          path: "initial-world",
          selectionRecordId: null,
          decisionRecordId: null,
          selectingPersonId: null,
          contestId: null,
          note: "Authored small-world court fixture; actual generated resident seated through seatJudge.",
        },
        termEndsAt: null,
        retentionDueAt: null,
      });
      for (const item of judged.history.futureDueItems)
        if (
          futureDueItemStateAt(judged, item.id, currentLifeCutoff(judged))
            ?.status === "scheduled"
        )
          judged = cancelFutureDueItem(judged, {
            stableKey: `co8-isolate:${item.id}`,
            dueItemId: item.id,
            effectiveAt: judged.currentDate,
            reasonKey: "fixture:isolated-court",
            context:
              "Isolate this saved court case from unrelated commitments.",
          });
      const defendant = judged.personOrder[0]!;
      const { world: base, prosecutorId } = withProsecutor(
        judged,
        defendant,
        small.jurisdictionId,
      );
      const referred = referForProsecution(base, {
        stableKey: `co8:${place.key}`,
        subjectPersonId: defendant,
        jurisdictionId: base.people[defendant]!.homeJurisdictionId,
        offenseKey: "crime:robbery",
        evidence: "documentary",
        standingFindings: 6,
        basisEventIds: [],
        referredBy: { kind: "police", label: "police", personId: null },
      });
      const timing = prosecutionTimingFor(place.key);
      const registry = createProsecutionTransitionRegistry();
      const chargedAt = addDays(base.currentDate, timing.chargeDecisionDays);
      const charged = resolveFutureDueItemsThrough(
        referred.world,
        chargedAt,
        registry,
      );
      // Charged, nothing has sat yet: a quiet day with no room.
      expect(courtroomSittingToday(charged, defendant)).toBeNull();
      expect(courtroomLocationKey(charged, defendant)).toBeNull();
      expect(courtroomPresentPeople(charged, defendant)).toEqual([]);

      const pleaded = enterPlea(charged, {
        personId: defendant,
        referralId: referred.referralId,
        plea: "not-guilty",
      });
      expect(pleaded.ok, `${SEED} ${place.key}`).toBe(true);
      const tried = resolveFutureDueItemsThrough(
        pleaded.world,
        addDays(chargedAt, timing.resolveAfterDays),
        registry,
      );
      const sitting = courtroomSittingToday(tried, defendant);
      expect(sitting, `${SEED} ${place.key}`).not.toBeNull();
      expect(sitting!.prosecutorId).toBe(prosecutorId);
      const present = courtroomPresentPeople(tried, defendant);
      // Everyone placed is a real person of this world and never the defendant.
      for (const person of present) {
        expect(tried.people[person.personId]).toBeDefined();
        expect(person.personId).not.toBe(defendant);
      }
      expect(present.filter((p) => p.role === "counsel")).toHaveLength(1);
      expect(present.filter((p) => p.role === "jury")).toHaveLength(
        sitting!.jurorIds.length,
      );
      const key = courtroomLocationKey(tried, defendant)!;
      expect(placeForLocationKey(tried, defendant, key)).toBe(
        "county-courtroom",
      );
      // The next day the court has not sat, so the room clears.
      const later = { ...tried, currentDate: addDays(tried.currentDate, 1) };
      expect(courtroomSittingToday(later, defendant)).toBeNull();
    },
    120_000,
  );
});
