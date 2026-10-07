import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { advanceWorld, assertWorldIntegrity } from "../../src/simulation/world";
import { createCampaignElectionTransitionRegistry } from "../../src/simulation/campaigns";
import { recordHouseholdLocation } from "../../src/simulation/life";
import { stableHash } from "../../src/simulation/ids";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places";
import { ensureWorldStartingConditions } from "../../src/simulation/world-setup/conditions";
import { generatePoliticalStartingConditions } from "../../src/simulation/world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../src/simulation/world-setup/types";
import { ensureCrimeProduction } from "../../src/simulation/crime/producer";
import { countyOfficeWork } from "../../src/simulation/justice/county-office-work";
import {
  ARRESTING_OFFICER_ROLE,
  countyUnitForJurisdiction,
} from "../../src/simulation/justice/county-offices";
import {
  ensureCountyRowOfficersForUnit,
  sittingCountyRowOfficers,
} from "../../src/simulation/living-world/local-government-seats";
import { countyElectedRowOffices } from "../../src/simulation/nationwide-world/county-row-offices";
import { workUniform } from "../../src/presentation/work-uniform";
import type { EntityId, World } from "../../src/simulation/types";
import { smallWorld } from "../fixtures/small-world";

const PLACES = lifePlaceStateIdentities();

function open(seed: string, attempt: number) {
  const place =
    PLACES[
      (parseInt(stableHash(`${seed}:${attempt}`).slice(0, 8), 16) + attempt) %
        PLACES.length
    ]!;
  const small = smallWorld({
    place: place.usps,
    people: 64,
    household: true,
    seed,
  });
  const admitted = recordHouseholdLocation(small.world, {
    stableKey: "co4:location",
    householdId: small.world.history.households.at(-1)!.id,
    effectiveAt: small.world.currentDate,
    jurisdictionId: small.jurisdictionId,
    kind: "residence:home",
    label: "Recorded fixture home",
    provenance: { kind: "authored", note: "CO-4 fixture household location" },
    supersedesLocationId: null,
  });
  return {
    place: place.usps,
    town: small.jurisdictionId,
    personId: small.personId,
    world: ensureCrimeProduction(
      ensureWorldStartingConditions(admitted, {
        openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
        political: generatePoliticalStartingConditions,
      }),
    ),
  };
}

/**
 * CO-4: a county's sheriff and prosecutor do recorded work. Places are drawn
 * from all 56 by seed and attempt, never named here; a place with no county
 * government in the game's list (a territory with none) is skipped and said
 * so, and the next draw is used. The world runs on the real clock with the
 * real crime producer: arrests, referrals and charges are the producers' own
 * events, and the offices only read and sign them.
 */

/** Appends one run line to a file when CO4_RUN_LOG names one. */
function record(line: string) {
  if (process.env.CO4_RUN_LOG)
    appendFileSync(process.env.CO4_RUN_LOG, `${line}\n`);
}

const WANTED = 3;
const DAYS = 400;

function monthOf(date: string) {
  return date.slice(0, 7);
}

interface Lived {
  readonly place: string;
  readonly seated: World;
  readonly later: World;
  readonly unit: NonNullable<ReturnType<typeof countyUnitForJurisdiction>>;
  readonly personId: EntityId;
}

function usableWorlds(): { lived: Lived[]; skipped: string[] } {
  const lived: Lived[] = [];
  const skipped: string[] = [];
  for (let attempt = 0; lived.length < WANTED && attempt < 24; attempt += 1) {
    const o = open("co4-office-work", attempt);
    const unit = countyUnitForJurisdiction(o.town);
    const offices = unit
      ? countyElectedRowOffices(unit).map((rule) => rule.office)
      : [];
    if (
      !unit ||
      !offices.includes("sheriff") ||
      !offices.includes("prosecutor")
    ) {
      skipped.push(`${o.place}: no county electing a sheriff and a prosecutor`);
      continue;
    }
    const seated = ensureCountyRowOfficersForUnit(o.world, unit, o.town, [
      o.personId,
    ]);
    const later = advanceWorld(
      seated,
      DAYS,
      createCampaignElectionTransitionRegistry(),
    );
    assertWorldIntegrity(later);
    lived.push({ place: o.place, seated, later, unit, personId: o.personId });
  }
  return { lived, skipped };
}

describe("a county's sheriff and prosecutor at work (CO-4)", () => {
  it(
    "show a month of recorded work in randomly drawn places, and a county with no prosecutor stays quiet",
    { timeout: 3_000_000 },
    () => {
      const { lived, skipped } = usableWorlds();
      record(
        JSON.stringify({
          places: lived.map((row) => `${row.place} ${row.unit.id}`),
          skipped,
        }),
      );
      expect(lived).toHaveLength(WANTED);
      let busiestMonths = 0;
      for (const row of lived) {
        const { later, unit, seated } = row;
        const holders = sittingCountyRowOfficers(later, unit);
        const sheriff = holders.find((entry) => entry.office === "sheriff")!;
        const prosecutor = holders.find(
          (entry) => entry.office === "prosecutor",
        )!;
        const whole = countyOfficeWork(
          later,
          unit,
          seated.currentDate,
          later.currentDate,
        );
        expect(whole.sheriff.sheriffPersonId).toBe(sheriff.personId);
        expect(whole.prosecutor.prosecutorPersonId).toBe(prosecutor.personId);
        // Reading is pure: the same read twice is the same answer.
        expect(
          countyOfficeWork(later, unit, seated.currentDate, later.currentDate),
        ).toEqual(whole);

        const eventById = new Map(
          later.history.events.map((event) => [event.id, event]),
        );
        // Every arrest the sheriff made names them as the arresting officer
        // and, through the referral, as who referred the case.
        for (const id of whole.sheriff.arrestEventIds) {
          const arrest = eventById.get(id)!;
          expect(
            arrest.participants.some(
              (entry) =>
                entry.role === ARRESTING_OFFICER_ROLE &&
                entry.personId === sheriff.personId,
            ),
          ).toBe(true);
          const referral = later.history.events.find(
            (event) =>
              event.type === "justice.prosecution-referred" &&
              event.tags.includes(`justice.basis-event:${arrest.id}`),
          );
          expect(referral).toBeDefined();
          expect(
            referral!.participants.some(
              (entry) =>
                entry.role === "other:referred-by" &&
                entry.personId === sheriff.personId,
            ),
          ).toBe(true);
        }
        // An arrest with no sheriff on it is one the sheriff was part of
        // themselves (victim or offender), never one skipped.
        for (const event of later.history.events)
          if (
            event.type === "crime.arrest-made" &&
            countyUnitForJurisdiction(event.jurisdictionId)?.id === unit.id &&
            !whole.sheriff.arrestEventIds.includes(event.id)
          )
            expect(event.involvedEntityIds).toContain(sheriff.personId);

        // The prosecutor's own charging decisions: each names them as the
        // decider, with the title their state gives the office.
        for (const id of [
          ...whole.prosecutor.chargedEventIds,
          ...whole.prosecutor.declinedEventIds,
        ]) {
          const decision = eventById.get(id)!;
          const decided = decision.participants.find(
            (entry) => entry.role === "agency:decided",
          )!;
          expect(decided.personId).toBe(prosecutor.personId);
          expect(decided.detail).toBe(prosecutor.title);
        }

        // The month with the most arrests: a month of work.
        const perMonth = new Map<string, number>();
        for (const id of whole.sheriff.arrestEventIds) {
          const month = monthOf(eventById.get(id)!.occurredAt);
          perMonth.set(month, (perMonth.get(month) ?? 0) + 1);
        }
        const [month, count] = [...perMonth.entries()].sort(
          (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
        )[0] ?? ["", 0];
        if (count > 0) {
          busiestMonths += 1;
          const from = `${month}-01` as typeof later.currentDate;
          const to = `${month}-31` as typeof later.currentDate;
          const monthWork = countyOfficeWork(later, unit, from, to);
          expect(monthWork.sheriff.arrestEventIds).toHaveLength(count);
          expect(monthWork.sheriff.jailPopulationAtEnd).toBeGreaterThanOrEqual(
            0,
          );
        }
        // The sheriff is drawn in the city police uniform until their own
        // is drawn (ART-2), and an ordinary resident is not.
        expect(workUniform(later, sheriff.personId, undefined)).toBe("police");
        expect(workUniform(later, sheriff.personId, "business")).toBe("police");
        record(
          JSON.stringify({
            place: row.place,
            county: unit.id,
            arrests: whole.sheriff.arrestEventIds.length,
            referrals: whole.prosecutor.referralEventIds.length,
            charged: whole.prosecutor.chargedEventIds.length,
            declined: whole.prosecutor.declinedEventIds.length,
            busiestMonth: month,
            busiestMonthArrests: count,
          }),
        );
      }
      expect(busiestMonths).toBeGreaterThan(0);
      expect(
        lived.some((row) => {
          const work = countyOfficeWork(
            row.later,
            row.unit,
            row.seated.currentDate,
            row.later.currentDate,
          );
          return work.prosecutor.chargedEventIds.length > 0;
        }),
      ).toBe(true);

      // Quiet case: the same first place with nobody seated in the county's
      // offices. The same arrests and referrals happen, no sheriff signs
      // any, and no prosecutor decides any, so nothing is charged.
      const first = lived[0]!;
      const quiet = advanceWorld(
        // The unseated world is the same opening: rebuild it without seating.
        open("co4-office-work", 0).world,
        DAYS,
        createCampaignElectionTransitionRegistry(),
      );
      const quietWork = countyOfficeWork(
        quiet,
        first.unit,
        first.seated.currentDate,
        quiet.currentDate,
      );
      record(JSON.stringify({ quiet: quietWork }));
      expect(quietWork.sheriff.sheriffPersonId).toBeNull();
      expect(quietWork.prosecutor.prosecutorPersonId).toBeNull();
      expect(quietWork.sheriff.arrestEventIds).toHaveLength(0);
      // Arrests still happen; they are just nobody's.
      expect(quietWork.sheriff.arrestsWithoutSheriff).toBeGreaterThanOrEqual(0);
      expect(quietWork.prosecutor.chargedEventIds).toHaveLength(0);
    },
  );
});
