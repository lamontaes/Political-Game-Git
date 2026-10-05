// Load the existing world entrypoint first, as the game and A131 exposure fixture do.
import { advanceWorld, assertWorldIntegrity } from "../world";
import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { recordHouseholdLocation } from "../life";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { stableHash } from "../ids";
import {
  lifePlaceByJurisdictionId,
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../life-places";
import { ensureJurisdiction } from "../national-election-geography";
import {
  materializeTownHousehold,
  townRoster,
} from "../living-world/town-residents";
import { ensureWorldStartingConditions } from "../world-setup/conditions";
import { generatePoliticalStartingConditions } from "../world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { addDays, ageOnDate, makeIsoDate } from "../dates";
import { storyLeads } from "../press/desk";
import { jailTermOn } from "../justice/jail-terms";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { causesInPeriod } from "../pressure/causes";
import { projectWorld39News } from "../../presentation/world39-news";
import { projectWorld39Journal } from "../../presentation/world39-journal";
import { personName } from "../people";
import {
  CRIME_CAUSE_SEAMS,
  crimeRateMultiplier,
  CRIME_EVENT_TYPES,
  CRIME_SAMPLE_TRANSITION_KEY,
  crimeIncidents,
  localCrimeFigures,
  sampleMonthlyCrime,
  UNRESEARCHED_LOCAL_CRIME,
} from "./index";
import { arrestReferral, ensureCrimeProduction, offenseOf } from "./producer";
import { adultCourtAgeAt } from "../justice/juvenile-court";
import { referForProsecution } from "../justice/prosecution";

const LONG = 900_000;

/** Charlottesville, Virginia; Kentucky is deliberately not the test place. */
const VIRGINIA_TOWN = "5114968";

function open(seed: string) {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: VIRGINIA_TOWN,
      startAge: 30,
      depth: "summarize-earlier-life",
    }),
  ).game!;
}

/** Same real clock and starting-condition writers, without the full life opening. */
function openCrimeSmallWorld(seed: string) {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  const place =
    places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;
  const small = smallWorld({
    place: place.usps,
    people: 64,
    household: true,
    seed,
  });
  const admitted = recordHouseholdLocation(small.world, {
    stableKey: "crime-small-world:location",
    householdId: small.world.history.households.at(-1)!.id,
    effectiveAt: small.world.currentDate,
    jurisdictionId: small.jurisdictionId,
    kind: "residence:home",
    label: "Recorded fixture home",
    provenance: { kind: "authored", note: "Crime fixture household location" },
    supersedesLocationId: null,
  });
  const world = ensureCrimeProduction(
    ensureWorldStartingConditions(admitted, {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      political: generatePoliticalStartingConditions,
    }),
  );
  console.info(
    JSON.stringify({
      fixture: "crime-small-world",
      seed,
      place: place.usps,
      people: 64,
    }),
  );
  return { world, playerPersonId: small.personId, stateUsps: place.usps };
}

describe("ordinary local crime", () => {
  it("every rate is marked as an unresearched placeholder", () => {
    expect(UNRESEARCHED_LOCAL_CRIME.provenance).toBe(
      "unresearched-blanket-rule",
    );
    for (const rule of UNRESEARCHED_LOCAL_CRIME.offenses) {
      for (const share of [rule.reportedShare, rule.arrestShare]) {
        expect(share).toBeGreaterThan(0);
        expect(share).toBeLessThan(1);
      }
    }
  });

  it(
    "a year of ordinary time in a small world produces reported, unreported and solved crime that the local paper can see",
    () => {
      const life = openCrimeSmallWorld("local-crime-virginia");
      const town = life.world.people[life.playerPersonId]!.homeJurisdictionId;
      expect(
        life.world.history.futureDueItems.filter(
          (item) => item.transitionKey === CRIME_SAMPLE_TRANSITION_KEY,
        ).length,
      ).toBe(1);

      const later = advanceWorld(
        life.world,
        400,
        createCampaignElectionTransitionRegistry(),
      );
      assertWorldIntegrity(later);
      const incidents = crimeIncidents(later);
      const reported = incidents.filter(
        (event) => event.type === CRIME_EVENT_TYPES.reported,
      );
      const unreported = incidents.filter(
        (event) => event.type === CRIME_EVENT_TYPES.unreported,
      );
      const arrests = later.history.events.filter(
        (event) => event.type === CRIME_EVENT_TYPES.arrest,
      );
      const crimeEventIds = new Set(
        [...reported, ...arrests].map((event) => event.id),
      );
      const leads = storyLeads(later).filter((lead) =>
        lead.basisEventIds.some((id) => crimeEventIds.has(id)),
      );
      const figures = localCrimeFigures(
        later,
        town,
        life.world.currentDate,
        later.currentDate,
      );
      console.info(
        JSON.stringify({
          people: Object.keys(later.people).length,
          households: later.history.households.length,
          reported: reported.length,
          townLog: reported.filter((event) =>
            event.tags.includes("crime:town-log"),
          ).length,
          unreported: unreported.length,
          arrests: arrests.length,
          storyLeads: leads.length,
          homeTownFigures: figures,
          burglaryMultiplierAtEnd: crimeRateMultiplier(
            later,
            town,
            "burglary",
            later.currentDate,
          ),
          sample: reported.slice(0, 3).map((event) => event.summary),
        }),
      );

      expect(incidents.length).toBeGreaterThan(0);
      expect(reported.length).toBeGreaterThan(0);
      for (const event of reported) {
        expect(event.visibility).toBe("public");
        // Victims are never named in what the public reads.
        for (const participant of event.participants) {
          const person = later.people[participant.personId]!;
          expect(event.summary).not.toContain(person.familyName);
        }
      }
      // Nobody reported it, so only the victims know, and their Journal says
      // what happened to them rather than a crime they could not have heard of.
      expect(unreported.length).toBeGreaterThan(0);
      for (const event of unreported) {
        expect(event.visibility).toBe("private");
        expect(event.summary).not.toContain("went unreported");
        for (const participant of event.participants) {
          const name = personName(later.people[participant.personId]!);
          expect(event.summary).toContain(name);
          const journal = projectWorld39Journal(later, participant.personId);
          expect(
            journal.entries.some((entry) => entry.sourceId === event.id),
          ).toBe(true);
        }
      }
      // A crime reaches a person's own Journal only if it happened to them
      // (direct knowledge requires being in the record), and then it says so
      // in their words rather than as a town police item.
      const crimeById = new Map(
        [...incidents, ...arrests].map((event) => [event.id, event]),
      );
      let victimLines = 0;
      for (const { id: personId } of Object.values(later.people)) {
        for (const entry of projectWorld39Journal(later, personId).entries) {
          const event = crimeById.get(entry.sourceId as never);
          if (!event) continue;
          expect(
            event.participants.some((row) => row.personId === personId),
          ).toBe(true);
          expect(entry.text).toMatch(/\byou(r)?\b/i);
          victimLines += 1;
        }
      }
      expect(victimLines).toBeGreaterThan(0);
      // Every victim knows what happened to them.
      for (const event of incidents) {
        for (const participant of event.participants) {
          expect(
            later.history.knowledge.some(
              (record) =>
                record.eventId === event.id &&
                record.personId === participant.personId,
            ),
          ).toBe(true);
        }
      }
      // Only reports beyond the town's ordinary police log frighten its
      // state, and only as fear: leaving a town is migration's town push.
      const crimeContributions = [
        ...causesInPeriod(
          later,
          life.world.currentDate,
          later.currentDate,
        ).values(),
      ]
        .flat()
        .filter((row) => row.causeKey.startsWith("crime:"));
      expect(crimeContributions.every((row) => row.kind === "fear")).toBe(true);
      expect(crimeContributions.length).toBeLessThan(reported.length);
      // The yearly window may have no excess reports (the preserved ND receipt
      // has 26 home-town reports against 26 ordinary reports). The positive
      // fixture reads an actual saved report on its recorded occurrence day.
      // This is a source-record join, not evidence of excess quarterly crime.
      const orderedReports = [...reported].sort(
        (a, b) =>
          a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id),
      );
      const recordedReport =
        orderedReports.find((event) => event.participants.length > 0) ??
        orderedReports[0]!;
      for (const participant of recordedReport.participants)
        expect(later.people[participant.personId]).toBeDefined();
      const place = lifePlaceByJurisdictionId(recordedReport.jurisdictionId!);
      expect(place).toBeDefined();
      const stateKey = place!.stateJurisdictionKey;
      expect(stateKey).not.toBeNull();
      if (stateKey === null)
        throw new Error("Recorded crime place has no governing state");
      const dayContributions =
        causesInPeriod(
          later,
          recordedReport.occurredAt,
          recordedReport.occurredAt,
        ).get(stateKey) ?? [];
      const fear = dayContributions.find(
        (row) => row.sourceId === recordedReport.id,
      );
      expect(fear).toBeDefined();
      expect(fear!.kind).toBe("fear");
      expect(fear!.amount).toBeGreaterThan(0);
      expect(fear!.causeKey).toBe(`crime:${offenseOf(recordedReport)}`);
      expect(
        later.history.events.find((row) => row.id === fear!.sourceId),
      ).toBe(recordedReport);
      const fearReceipt = {
        fixture: "recorded-crime-fear-day",
        worldSeed: later.seed,
        event: recordedReport,
        stateKey: place!.stateJurisdictionKey,
        participants: recordedReport.participants.map(
          (row) => later.people[row.personId],
        ),
        contribution: fear,
        yearlyFearCount: crimeContributions.length,
      };
      console.info(JSON.stringify(fearReceipt));
      if (process.env.A131_FEAR_RECEIPT_PATH)
        writeFileSync(
          process.env.A131_FEAR_RECEIPT_PATH,
          JSON.stringify(fearReceipt, null, 2),
        );

      // Nothing is dated before the life was opened.
      for (const event of incidents) {
        expect(event.occurredAt >= life.world.currentDate).toBe(true);
      }
    },
    LONG,
  );

  it("an arrest with an offender is a referral the justice route accepts", () => {
    const life = open("local-crime-referral");
    const town = life.world.people[life.playerPersonId]!.homeJurisdictionId;
    const incident = {
      id: "event_incident",
      stableKey: "crime:test",
      jurisdictionId: town,
    } as unknown as Parameters<typeof arrestReferral>[0];
    const arrest = {
      id: "event_arrest",
      stableKey: "crime:test:arrest",
    } as unknown as Parameters<typeof arrestReferral>[1];
    expect(arrestReferral(incident, arrest, "robbery", null)).toBeNull();
    const referral = arrestReferral(
      incident,
      arrest,
      "robbery",
      life.playerPersonId,
    )!;
    expect(referral.offenseKey).toBe("crime:robbery");
    const referred = referForProsecution(life.world, referral);
    expect(referred.referralId).toBeTruthy();
    // The route names the offense rather than falling back to "a crime".
    expect(
      referred.world.history.events.some(
        (event) =>
          event.id === referred.referralId || event.summary.includes("robbery"),
      ),
    ).toBe(true);
  });

  it(
    "the Around you feed shows only the player's own town's crime",
    () => {
      const life = openCrimeSmallWorld("feed-2813820");
      const homeTown =
        life.world.people[life.playerPersonId]!.homeJurisdictionId;
      const other = searchLifePlaces("", 2, {
        stateJurisdictionKey: `US-${life.stateUsps}`,
        scope: "locality",
      }).find((place) => place.context.jurisdiction.id !== homeTown);
      expect(
        other,
        "a second actual locality in the drawn state",
      ).toBeDefined();
      let world = ensureJurisdiction(life.world, other!.context.jurisdiction);
      const households = Math.min(
        12,
        townRoster(other!.context.jurisdiction.id).households,
      );
      expect(
        households,
        "recorded households in the second locality",
      ).toBeGreaterThan(0);
      for (let index = 0; index < households; index += 1) {
        world = materializeTownHousehold(
          world,
          other!.context.jurisdiction.id,
          index,
        );
      }
      console.info(
        JSON.stringify({
          fixture: "crime-feed-second-town",
          seed: "feed-2813820",
          state: life.stateUsps,
          homeTown,
          otherTown: other!.context.jurisdiction.id,
          households,
        }),
      );
      const town = life.world.people[life.playerPersonId]!.homeJurisdictionId;
      const later = advanceWorld(
        world,
        120,
        createCampaignElectionTransitionRegistry(),
      );
      const crime = new Map(
        later.history.events
          .filter((event) => event.type.startsWith("crime."))
          .map((event) => [event.id, event]),
      );
      expect(
        [...crime.values()].some((event) => event.jurisdictionId !== town),
      ).toBe(true);
      for (const item of projectWorld39News(later, life.playerPersonId)
        .publicEvents) {
        const event = crime.get(item.id);
        if (event) expect(event.jurisdictionId).toBe(town);
      }
    },
    LONG,
  );

  it(
    "recorded unemployment moves crime, and every unread cause says why",
    () => {
      const life = open("local-crime-causes");
      const town = life.world.people[life.playerPersonId]!.homeJurisdictionId;
      const reading = crimeRateMultiplier(
        life.world,
        town,
        "burglary",
        life.world.currentDate,
      );
      const unemployment = reading.causes.find(
        (cause) => cause.key === "unemployment-to-burglary",
      );
      if (unemployment) {
        // Burglary moves 2 to 5% per point from 4% (this world's draw within
        // the research range), within the offense's bounds.
        const delta = unemployment.causeValue - 4;
        const ends = [1 + 0.02 * delta, 1 + 0.05 * delta];
        expect(unemployment.factor).toBeGreaterThanOrEqual(
          Math.min(...ends) - 1e-12,
        );
        expect(unemployment.factor).toBeLessThanOrEqual(
          Math.max(...ends) + 1e-12,
        );
        expect(reading.multiplier).toBeGreaterThanOrEqual(0.5);
        expect(reading.multiplier).toBeLessThanOrEqual(2);
      } else {
        // No figure recorded is not a figure of zero: the base rate applies.
        expect(reading.multiplier).toBe(1);
      }
      console.info(JSON.stringify({ openingReading: reading }));
      for (const seam of CRIME_CAUSE_SEAMS) {
        expect(seam.rule.length).toBeGreaterThan(0);
      }
    },
    LONG,
  );

  it(
    "the same month on the same world draws the same crimes",
    () => {
      const life = open("local-crime-replay");
      const month = makeIsoDate(
        addDays(life.world.currentDate, -40).slice(0, 8) + "01",
      );
      expect(JSON.stringify(sampleMonthlyCrime(life.world, month))).toBe(
        JSON.stringify(sampleMonthlyCrime(life.world, month)),
      );
    },
    LONG,
  );
  it(
    "police arrest a named resident the offense points to, and prosecutors take the case",
    () => {
      const life = openCrimeSmallWorld("probe");
      const world = advanceWorld(
        life.world,
        400,
        createCampaignElectionTransitionRegistry(),
      );
      const arrests = world.history.events.filter(
        (event) => event.type === CRIME_EVENT_TYPES.arrest,
      );
      expect(arrests.length).toBeGreaterThan(0);
      const referrals = world.history.events.filter(
        (event) => event.type === "justice.prosecution-referred",
      );
      for (const arrest of arrests) {
        const offender = arrest.participants.find(
          (row) => row.role === "focus:subject",
        )!;
        expect(offender).toBeDefined();
        expect(offender.personId).not.toBe(life.playerPersonId);
        const person = world.people[offender.personId]!;
        expect(person.homeJurisdictionId).toBe(arrest.jurisdictionId);
        const adultAge = adultCourtAgeAt(
          world,
          arrest.jurisdictionId!,
          arrest.occurredAt,
        );
        expect(adultAge).not.toBeNull();
        if (adultAge === null)
          throw new Error("Recorded arrest has no adult-age rule.");
        expect(
          ageOnDate(person.birthDate, arrest.occurredAt),
        ).toBeGreaterThanOrEqual(adultAge);
        expect(arrest.summary).toContain(personName(person));
        // The circumstances that pointed to them ride on the record.
        expect(offender.detail).toMatch(/^Arrested; /);
        // Nobody is arrested for an offense while serving a jail term.
        expect(
          jailTermOn(world, offender.personId, arrest.occurredAt),
        ).toBeNull();
        expect(
          referrals.some(
            (referral) =>
              referral.participants.some(
                (row) => row.personId === offender.personId,
              ) && referral.tags.includes(`justice.basis-event:${arrest.id}`),
          ),
        ).toBe(true);
      }
      // A referral goes on to a charge.
      expect(
        world.history.events.some((event) => event.type === "justice.charged"),
      ).toBe(true);
    },
    LONG,
  );
});
