/**
 * NOAA Storm Events Database Historical Coverage & Collection Procedures
 *
 * Implements authoritative historical period and procedural collection metadata
 * according to NOAA NCEI and NWS Instruction 10-1605 standards.
 */

import type {
  EraCoverageDescription,
  StormCoverageEra,
  StormEventFamily,
} from "./types";

export const HISTORICAL_COVERAGE_ERAS: readonly EraCoverageDescription[] = [
  {
    era: "1950-1954_tornado_only",
    period: "1950-01-01 to 1954-12-31",
    collectionProcedure:
      "U.S. Weather Bureau Severe Local Storms Project digital archive. Nationwide coverage limited exclusively to Tornado events.",
    coveredEventTypes: ["Tornado"],
    historicalCaveats: [
      "Zero records for floods, winter storms, thunderstorm wind, or hail during 1950-1954 represent collection scope, not meteorological absence.",
      "Tornado records in this era were retrospectively rated on the Fujita scale (F0-F5).",
      "Geographic coordinates are often approximate or center-county based.",
    ],
  },
  {
    era: "1955-1995_severe_convective_3",
    period: "1955-01-01 to 1995-12-31",
    collectionProcedure:
      "Convective severe storm digital archive. Systematically ingested three severe hazard types: Tornado, Thunderstorm Wind, and Hail.",
    coveredEventTypes: [
      "Tornado",
      "Thunderstorm Wind",
      "Hail",
      "TSTM WIND",
      "THUNDERSTORM WINDS",
      "HAIL/WIND",
    ],
    historicalCaveats: [
      "Synoptic and hydrological events (Floods, Winter Storms, Hurricanes, Heat Waves) were documented in monthly Storm Data publications but were not systematically ingested into the bulk digital database until 1996.",
      "Damage estimates frequently utilized category bracket codes (e.g. 0-9) rather than exact dollar figures.",
      "Missing damage was frequently left blank or unestimated rather than verified zero.",
    ],
  },
  {
    era: "1996-present_nws_standard_48",
    period: "1996-01-01 to Present (2026)",
    collectionProcedure:
      "Modernized National Weather Service Instruction 10-1605 standardized 48 distinct event types recorded across all NWS Weather Forecast Offices (WFOs).",
    coveredEventTypes: [
      "Astronomical Low Tide",
      "Avalanche",
      "Blizzard",
      "Coastal Flood",
      "Cold/Wind Chill",
      "Debris Flow",
      "Dense Fog",
      "Dense Smoke",
      "Drought",
      "Dust Devil",
      "Dust Storm",
      "Excessive Heat",
      "Extreme Cold/Wind Chill",
      "Flash Flood",
      "Flood",
      "Freezing Fog",
      "Frost/Freeze",
      "Funnel Cloud",
      "Hail",
      "Heat",
      "Heavy Rain",
      "Heavy Snow",
      "High Surf",
      "High Wind",
      "Hurricane (Typhoon)",
      "Ice Storm",
      "Lake-Effect Snow",
      "Lakeshore Flood",
      "Lightning",
      "Marine Dense Fog",
      "Marine Hail",
      "Marine Heavy Freezing Spray",
      "Marine High Wind",
      "Marine Hurricane/Typhoon",
      "Marine Lightning",
      "Marine Strong Wind",
      "Marine Thunderstorm Wind",
      "Marine Tropical Depression",
      "Marine Tropical Storm",
      "Rip Current",
      "Seiche",
      "Sleet",
      "Storm Surge/Tide",
      "Strong Wind",
      "Thunderstorm Wind",
      "Tornado",
      "Tropical Depression",
      "Tropical Storm",
      "Tsunami",
      "Volcanic Ash",
      "Waterspout",
      "Wildfire",
      "Winter Storm",
      "Winter Weather",
    ],
    historicalCaveats: [
      "Effective February 1, 2007: Tornado ratings transitioned from the Fujita Scale (F0-F5) to the Enhanced Fujita Scale (EF0-EF5).",
      "Convective / localized phenomena are indexed by County (CZ_TYPE = 'C'), whereas broad synoptic phenomena (winter storms, excessive heat, blizzards, hurricanes) are indexed by NWS Public Forecast Zone (CZ_TYPE = 'Z').",
      "Casualties and damages are distinguished between Direct (caused immediately by the hazard) and Indirect (associated secondary causes).",
    ],
  },
];

export const SCALE_TRANSITION_DATE_EF = "2007-02-01";

/**
 * Determines the historical coverage era based on an event ISO date string.
 */
export function getCoverageEraForDate(isoDate: string): StormCoverageEra {
  const year = parseInt(isoDate.slice(0, 4), 10);
  if (year < 1955) {
    return "1950-1954_tornado_only";
  }
  if (year < 1996) {
    return "1955-1995_severe_convective_3";
  }
  return "1996-present_nws_standard_48";
}

/**
 * Maps an official NOAA or historical event type string to its canonical StormEventFamily.
 */
export function mapEventTypeToFamily(eventType: string): StormEventFamily {
  const normalized = eventType.trim().toUpperCase();

  // Tornado family
  if (
    normalized.includes("TORNADO") ||
    normalized.includes("FUNNEL CLOUD") ||
    normalized.includes("WATERSPOUT") ||
    normalized === "TOR"
  ) {
    return "tornado";
  }

  // Flood family
  if (
    normalized.includes("FLASH FLOOD") ||
    normalized.includes("COASTAL FLOOD") ||
    normalized.includes("LAKESHORE FLOOD") ||
    normalized.includes("FLOOD") ||
    normalized.includes("DEBRIS FLOW") ||
    normalized.includes("RIVER FLOOD")
  ) {
    return "flood";
  }

  // Winter storm family
  if (
    normalized.includes("BLIZZARD") ||
    normalized.includes("ICE STORM") ||
    normalized.includes("WINTER STORM") ||
    normalized.includes("WINTER WEATHER") ||
    normalized.includes("HEAVY SNOW") ||
    normalized.includes("LAKE-EFFECT SNOW") ||
    normalized.includes("LAKE EFFECT SNOW") ||
    normalized.includes("SLEET") ||
    normalized.includes("FROST/FREEZE") ||
    normalized.includes("FREEZING RAIN") ||
    normalized.includes("AVALANCHE")
  ) {
    return "winter_storm";
  }

  // Tropical / Hurricane family
  if (
    normalized.includes("HURRICANE") ||
    normalized.includes("TYPHOON") ||
    normalized.includes("TROPICAL STORM") ||
    normalized.includes("TROPICAL DEPRESSION") ||
    normalized.includes("STORM SURGE")
  ) {
    return "tropical_hurricane";
  }

  // Heat / Cold family
  if (
    normalized.includes("EXCESSIVE HEAT") ||
    normalized.includes("HEAT") ||
    normalized.includes("EXTREME COLD") ||
    normalized.includes("COLD/WIND CHILL") ||
    normalized.includes("COLD WAVE") ||
    normalized.includes("RECORD COLD") ||
    normalized.includes("RECORD HEAT")
  ) {
    return "heat_cold";
  }

  // Severe convective storm family
  if (
    normalized.includes("THUNDERSTORM") ||
    normalized.includes("TSTM") ||
    normalized.includes("HAIL") ||
    normalized.includes("HIGH WIND") ||
    normalized.includes("STRONG WIND") ||
    normalized.includes("HEAVY RAIN") ||
    normalized.includes("LIGHTNING") ||
    normalized.includes("GUSTNADO")
  ) {
    return "severe_storm";
  }

  // Wildfire family
  if (
    normalized.includes("WILDFIRE") ||
    normalized.includes("FOREST FIRE") ||
    normalized.includes("BRUSH FIRE") ||
    normalized.includes("WILD/FOREST FIRE")
  ) {
    return "wildfire";
  }

  // Drought / Environmental family
  if (
    normalized.includes("DROUGHT") ||
    normalized.includes("DUST STORM") ||
    normalized.includes("DUST DEVIL") ||
    normalized.includes("DENSE SMOKE") ||
    normalized.includes("DENSE FOG") ||
    normalized.includes("FREEZING FOG")
  ) {
    return "drought_environment";
  }

  // Marine / Coastal family
  if (
    normalized.includes("HIGH SURF") ||
    normalized.includes("RIP CURRENT") ||
    normalized.includes("ASTRONOMICAL LOW TIDE") ||
    normalized.includes("SEICHE") ||
    normalized.includes("TSUNAMI") ||
    normalized.startsWith("MARINE ")
  ) {
    return "marine_coastal";
  }

  return "other";
}

/**
 * Checks if an event type is historically expected within a given collection era.
 */
export function isEventTypeExpectedInEra(
  eventType: string,
  era: StormCoverageEra,
): boolean {
  const family = mapEventTypeToFamily(eventType);
  if (era === "1950-1954_tornado_only") {
    return family === "tornado";
  }
  if (era === "1955-1995_severe_convective_3") {
    return family === "tornado" || family === "severe_storm";
  }
  return true;
}
