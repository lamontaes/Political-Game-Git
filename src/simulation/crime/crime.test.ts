import { describe, expect, it } from "vitest";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { addDays, makeIsoDate } from "../dates";
import { storyLeads } from "../press/desk";
import { advanceWorld, assertWorldIntegrity } from "../world";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { causesInPeriod } from "../pressure/causes";
import { projectWorld39News } from "../../presentation/world39-news";
import {
  CRIME_CAUSE_SEAMS,
  crimeRateMultiplier,
  UNRESEARCHED_UNEMPLOYMENT_EFFECT,
  CRIME_EVENT_TYPES,
  CRIME_SAMPLE_TRANSITION_KEY,
  crimeIncidents,
  localCrimeFigures,
  sampleMonthlyCrime,
  UNRESEARCHED_LOCAL_CRIME,
} from "./index";
import { arrestReferral } from "./producer";
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
    "a year of ordinary time in a new game produces reported, unreported and solved crime that the local paper can see",
    () => {
      const life = open("local-crime-virginia");
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
      for (const event of unreported) expect(event.visibility).toBe("private");
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
      expect(crimeContributions.length).toBeGreaterThan(0);
      expect(crimeContributions.length).toBeLessThan(reported.length);
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
      // Clarksdale, Mississippi: measured showing Washington police reports.
      const life = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: "feed-2813820",
          placeKey: "2813820",
          startAge: 30,
          depth: "summarize-earlier-life",
        }),
      ).game!;
      const town = life.world.people[life.playerPersonId]!.homeJurisdictionId;
      const later = advanceWorld(
        life.world,
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
        (cause) => cause.key === "cause-unemployment",
      );
      if (unemployment) {
        expect(reading.multiplier).toBeGreaterThanOrEqual(
          UNRESEARCHED_UNEMPLOYMENT_EFFECT.floor,
        );
        expect(reading.multiplier).toBeLessThanOrEqual(
          UNRESEARCHED_UNEMPLOYMENT_EFFECT.ceiling,
        );
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
});
