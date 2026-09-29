import { describe, expect, it } from "vitest";
import manifest from "../../art/backdrops/manifest.json";
import {
  backdropPlaces,
  capitolPlaceFor,
  daylightPhase,
  hasBackdrop,
  homePlaceFor,
  isRainyDay,
  placeBackdrop,
  workplacePlaceFor,
} from "./place-backdrops";
import type { SimulationMoment } from "../simulation/types";

const at = (date: string, hour: number, minute = 0): SimulationMoment => ({
  date: date as SimulationMoment["date"],
  minuteOfDay: hour * 60 + minute,
  timeZone: "America/Chicago",
  utcOffsetMinutes: -300,
});

/** A weather key that is dry on the dates used below. */
function dryKey(date: string): string {
  for (let index = 0; ; index += 1) {
    if (!isRainyDay(`dry-${index}`, date)) return `dry-${index}`;
  }
}

function rainyKey(date: string): string {
  for (let index = 0; ; index += 1) {
    if (isRainyDay(`wet-${index}`, date)) return `wet-${index}`;
  }
}

/** The 50 states, D.C. and the five inhabited territories. */
const PLACES_WITH_A_CAPITOL = [
  ..."AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD".split(" "),
  ..."MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC".split(" "),
  ..."SD TN TX UT VT VA WA WV WI WY DC PR GU VI AS MP".split(" "),
];

describe("place backdrops", () => {
  it("has all 209 shared pictures for 61 places, each with a midday picture", () => {
    const ownCapitol = /^state-capitol-[a-z]{2}$/;
    expect(
      manifest.backdrops.filter((record) => !ownCapitol.test(record.place)),
    ).toHaveLength(209);
    expect(
      backdropPlaces().filter((place) => !ownCapitol.test(place)),
    ).toHaveLength(61);
    for (const place of backdropPlaces()) expect(hasBackdrop(place)).toBe(true);
  });

  it("shows every state, D.C. and each territory its own capitol", () => {
    for (const usps of PLACES_WITH_A_CAPITOL) {
      expect(capitolPlaceFor(usps)).toBe(`state-capitol-${usps.toLowerCase()}`);
    }
    expect(capitolPlaceFor(null)).toBe("state-capitol-dome");
    expect(capitolPlaceFor("ZZ")).toBe("state-capitol-dome");
  });

  it("reads the light from the clock and the month", () => {
    expect(daylightPhase(at("2027-06-15", 4, 30))).toBe("night");
    expect(daylightPhase(at("2027-06-15", 7))).toBe("morning");
    expect(daylightPhase(at("2027-06-15", 14))).toBe("midday");
    expect(daylightPhase(at("2027-06-15", 20))).toBe("midday");
    expect(daylightPhase(at("2027-01-15", 17, 30))).toBe("night");
    expect(daylightPhase(at("2027-01-15", 23))).toBe("night");
  });

  it("picks the night, morning and midday pictures", () => {
    const date = "2027-06-15";
    const key = dryKey(date);
    expect(placeBackdrop("diner", at(date, 22), key)?.variant).toBe("night");
    expect(placeBackdrop("diner", at(date, 7), key)?.variant).toBe("morning");
    expect(placeBackdrop("diner", at(date, 13), key)?.variant).toBe("midday");
  });

  it("uses the rain picture on a rainy day, but never at night", () => {
    const date = "2027-06-15";
    const key = rainyKey(date);
    expect(placeBackdrop("diner", at(date, 13), key)?.variant).toBe("rain");
    expect(placeBackdrop("diner", at(date, 23), key)?.variant).toBe("night");
  });

  it("rains on about one day in five, the same for everyone sharing a key", () => {
    let rainy = 0;
    for (let day = 1; day <= 365; day += 1) {
      const date = new Date(Date.UTC(2027, 0, day)).toISOString().slice(0, 10);
      if (isRainyDay("jurisdiction-1", date)) rainy += 1;
      expect(isRainyDay("jurisdiction-1", date)).toBe(
        isRainyDay("jurisdiction-1", date),
      );
    }
    expect(rainy).toBeGreaterThan(40);
    expect(rainy).toBeLessThan(110);
  });

  it("falls back to midday when a variant was never painted", () => {
    const withoutMorning = backdropPlaces().find(
      (place) =>
        !manifest.backdrops.some(
          (record) => record.place === place && record.variant === "morning",
        ),
    );
    expect(withoutMorning).toBeDefined();
    const date = "2027-06-15";
    expect(
      placeBackdrop(withoutMorning!, at(date, 7), dryKey(date))?.variant,
    ).toBe("midday");
  });

  it("has no picture for an unknown place", () => {
    expect(placeBackdrop("moon-base", at("2027-06-15", 13), "k")).toBeNull();
    expect(placeBackdrop(null, at("2027-06-15", 13), "k")).toBeNull();
  });

  it("matches homes and jobs to places that have pictures", () => {
    expect(homePlaceFor("residential:multi-unit")).toBe("small-apartment");
    expect(homePlaceFor("residential:mobile-home")).toBe("mobile-home");
    expect(homePlaceFor("residential:single-family")).toBe("suburban-house");
    expect(homePlaceFor(null)).toBe("suburban-house");
    expect(homePlaceFor("residential:rowhouse")).toBe("rowhouse");
    expect(homePlaceFor("residential:large-house")).toBe("large-house");
    expect(homePlaceFor("residential:farmhouse")).toBe("rural-farmhouse");

    expect(workplacePlaceFor("occupation:cashier")).toBe("store");
    expect(workplacePlaceFor("profession:teacher")).toBe("classroom");
    expect(workplacePlaceFor("service:food-server")).toBe("diner");
    expect(workplacePlaceFor("trade:carpenter")).toBe("construction-site");
    expect(workplacePlaceFor("trade:automotive-mechanic")).toBe(
      "factory-floor",
    );
    expect(workplacePlaceFor("custom:onet-29-1141-00")).toBe(
      "hospital-hallway",
    );
    expect(workplacePlaceFor("custom:onet-43-9061-00")).toBe("office");
    expect(workplacePlaceFor(null)).toBe("office");

    const named = [
      ...[
        "residential:multi-unit",
        "residential:mobile-home",
        "residential:single-family",
        "residential:rowhouse",
        "residential:large-house",
        "residential:farmhouse",
      ].map((kind) => homePlaceFor(kind as never)),
      ...[
        "occupation:cashier",
        "profession:teacher",
        "service:college",
        "service:food-server",
        "trade:carpenter",
        "trade:automotive-mechanic",
        "profession:journalism",
        "profession:campaign-management",
        "service:court-workplace",
        "service:library",
        "service:hairstylist",
        ...[21, 25, 29, 31, 33, 35, 39, 41, 45, 47, 49, 51, 53].map(
          (group) => `custom:onet-${group}-0000-00`,
        ),
      ].map((kind) => workplacePlaceFor(kind as never)),
    ];
    for (const place of named) expect(hasBackdrop(place)).toBe(true);
  });

  it("gives the posted public meeting its room picture", () => {
    expect(hasBackdrop("public-meeting-room")).toBe(true);
    expect(hasBackdrop("community-room")).toBe(true);
  });

  it("has a picture for every fixed place a location can name", () => {
    for (const place of [
      "classroom",
      "main-street",
      "governor-office",
      "phone-bank-room",
      "campaign-storefront",
      "county-courtroom",
      "council-chamber",
      "county-commission",
      "door-knocking-urban",
      "door-knocking-suburban",
      "door-knocking-rural",
    ])
      expect(hasBackdrop(place)).toBe(true);
  });
});
