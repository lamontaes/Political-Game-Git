import { ageOnDate } from "./dates";
import { DEMO_START_DATE, LEXINGTON_PLACEHOLDER_ID } from "./demo";
import { createWorldId } from "./world";
import { DEFAULT_CORPUS_VERSION } from "./names-data";
import {
  DEFAULT_PERSON_GENERATOR_VERSION,
  createLightweightPerson,
} from "./people";
import type { EntityId, IsoDate, PersonGenerationProfile } from "./types";

export interface PersonStressHarnessOptions {
  readonly seeds?: readonly string[];
  readonly seedCount?: number;
  readonly seedPrefix?: string;
  readonly peoplePerSeed?: number;
  readonly profile?: PersonGenerationProfile;
  readonly generatorVersion?: string;
  readonly corpusVersion?: string;
  readonly currentDate?: IsoDate;
  readonly jurisdictionId?: EntityId;
}

export interface GeneratedPersonSummary {
  readonly id: EntityId;
  readonly givenName: string;
  readonly familyName: string;
  readonly fullName: string;
  readonly birthDate: IsoDate;
  readonly age: number;
  readonly appearanceSeed: string;
  readonly isLeapBirthday: boolean;
  readonly isBoundaryBirthday: boolean;
}

export interface PopulationSample {
  readonly seed: string;
  readonly worldId: EntityId;
  readonly people: readonly GeneratedPersonSummary[];
}

export interface AgeDistributionStats {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly median: number;
  readonly brackets: {
    readonly "18-20 (young boundary)": number;
    readonly "21-29 (young adult)": number;
    readonly "30-49 (mid adult)": number;
    readonly "50-64 (senior adult)": number;
    readonly "65-75 (retirement)": number;
    readonly "76+ (elder boundary)": number;
  };
}

export interface PersonStressHarnessResult {
  readonly generatorVersion: string;
  readonly corpusVersion: string;
  readonly profile: PersonGenerationProfile;
  readonly currentDate: IsoDate;
  readonly totalSeeds: number;
  readonly peoplePerSeed: number;
  readonly totalPeople: number;
  readonly uniqueFullNames: number;
  readonly fullNameCollisions: number;
  readonly fullNameCollisionRate: number;
  readonly uniqueGivenNames: number;
  readonly uniqueFamilyNames: number;
  readonly uniqueAppearanceSeeds: number;
  readonly appearanceSeedCollisions: number;
  readonly leapBirthdaysCount: number;
  readonly boundaryBirthdaysCount: number;
  readonly ageStats: AgeDistributionStats;
  readonly populations: readonly PopulationSample[];
}

function resolveSeeds(options: PersonStressHarnessOptions): readonly string[] {
  if (options.seeds && options.seeds.length > 0) {
    return options.seeds;
  }
  const count = options.seedCount ?? 10;
  const prefix = options.seedPrefix ?? "stress-seed";
  return Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}`);
}

export function runPersonStressHarness(
  options: PersonStressHarnessOptions = {},
): PersonStressHarnessResult {
  const seeds = resolveSeeds(options);
  const peoplePerSeed = options.peoplePerSeed ?? 6;
  const profile: PersonGenerationProfile = options.profile ?? "production";
  const generatorVersion =
    options.generatorVersion ?? DEFAULT_PERSON_GENERATOR_VERSION;
  const corpusVersion = options.corpusVersion ?? DEFAULT_CORPUS_VERSION;
  const currentDate = options.currentDate ?? DEMO_START_DATE;
  const jurisdictionId = options.jurisdictionId ?? LEXINGTON_PLACEHOLDER_ID;

  const populations: PopulationSample[] = [];
  const allFullNames = new Set<string>();
  const allGivenNames = new Set<string>();
  const allFamilyNames = new Set<string>();
  const allAppearanceSeeds = new Set<string>();
  const ages: number[] = [];

  let totalPeople = 0;
  let leapBirthdaysCount = 0;
  let boundaryBirthdaysCount = 0;

  const currentMonth = Number(currentDate.slice(5, 7));
  const currentDay = Number(currentDate.slice(8, 10));

  for (const seed of seeds) {
    const worldId = createWorldId(seed);
    const people: GeneratedPersonSummary[] = [];

    for (let index = 0; index < peoplePerSeed; index += 1) {
      const person = createLightweightPerson({
        worldId,
        worldSeed: seed,
        index,
        currentDate,
        homeJurisdictionId: jurisdictionId,
        profile,
        generatorVersion,
        corpusVersion,
      });

      const fullName = `${person.givenName} ${person.familyName}`;
      const age = ageOnDate(person.birthDate, currentDate);
      const isLeapBirthday = person.birthDate.endsWith("-02-29");
      const birthMonth = Number(person.birthDate.slice(5, 7));
      const birthDay = Number(person.birthDate.slice(8, 10));
      const isBoundaryBirthday =
        (birthMonth === currentMonth && Math.abs(birthDay - currentDay) <= 1) ||
        isLeapBirthday;

      if (isLeapBirthday) leapBirthdaysCount += 1;
      if (isBoundaryBirthday) boundaryBirthdaysCount += 1;

      allFullNames.add(fullName);
      allGivenNames.add(person.givenName);
      allFamilyNames.add(person.familyName);
      const appearanceSeed = person.appearance?.seed ?? "";
      allAppearanceSeeds.add(appearanceSeed);
      ages.push(age);
      totalPeople += 1;

      people.push({
        id: person.id,
        givenName: person.givenName,
        familyName: person.familyName,
        fullName,
        birthDate: person.birthDate,
        age,
        appearanceSeed,
        isLeapBirthday,
        isBoundaryBirthday,
      });
    }

    populations.push({
      seed,
      worldId,
      people,
    });
  }

  ages.sort((a, b) => a - b);
  const minAge = ages.length > 0 ? (ages[0] as number) : 0;
  const maxAge = ages.length > 0 ? (ages[ages.length - 1] as number) : 0;
  const sumAge = ages.reduce((acc, v) => acc + v, 0);
  const meanAge =
    ages.length > 0 ? Number((sumAge / ages.length).toFixed(2)) : 0;
  const medianAge =
    ages.length > 0
      ? ages.length % 2 === 1
        ? (ages[Math.floor(ages.length / 2)] as number)
        : Number(
            (
              ((ages[ages.length / 2 - 1] as number) +
                (ages[ages.length / 2] as number)) /
              2
            ).toFixed(2),
          )
      : 0;

  const brackets = {
    "18-20 (young boundary)": 0,
    "21-29 (young adult)": 0,
    "30-49 (mid adult)": 0,
    "50-64 (senior adult)": 0,
    "65-75 (retirement)": 0,
    "76+ (elder boundary)": 0,
  };

  for (const age of ages) {
    if (age <= 20) brackets["18-20 (young boundary)"] += 1;
    else if (age <= 29) brackets["21-29 (young adult)"] += 1;
    else if (age <= 49) brackets["30-49 (mid adult)"] += 1;
    else if (age <= 64) brackets["50-64 (senior adult)"] += 1;
    else if (age <= 75) brackets["65-75 (retirement)"] += 1;
    else brackets["76+ (elder boundary)"] += 1;
  }

  const fullNameCollisions = totalPeople - allFullNames.size;
  const fullNameCollisionRate =
    totalPeople > 0 ? Number((fullNameCollisions / totalPeople).toFixed(4)) : 0;
  const appearanceSeedCollisions = totalPeople - allAppearanceSeeds.size;

  return {
    generatorVersion,
    corpusVersion,
    profile,
    currentDate,
    totalSeeds: seeds.length,
    peoplePerSeed,
    totalPeople,
    uniqueFullNames: allFullNames.size,
    fullNameCollisions,
    fullNameCollisionRate,
    uniqueGivenNames: allGivenNames.size,
    uniqueFamilyNames: allFamilyNames.size,
    uniqueAppearanceSeeds: allAppearanceSeeds.size,
    appearanceSeedCollisions,
    leapBirthdaysCount,
    boundaryBirthdaysCount,
    ageStats: {
      min: minAge,
      max: maxAge,
      mean: meanAge,
      median: medianAge,
      brackets,
    },
    populations,
  };
}

export function formatPersonStressHarnessReport(
  result: PersonStressHarnessResult,
  includeSampleDetails = true,
): string {
  const lines: string[] = [];
  lines.push("==================================================");
  lines.push("GENERATED PERSON STRESS HARNESS REPORT");
  lines.push("==================================================");
  lines.push(`Generator Version:   ${result.generatorVersion}`);
  lines.push(`Corpus Version:      ${result.corpusVersion}`);
  lines.push(`Profile:             ${result.profile}`);
  lines.push(`Simulation Date:     ${result.currentDate}`);
  lines.push(`Seeds Sampled:       ${result.totalSeeds}`);
  lines.push(`People Per Seed:     ${result.peoplePerSeed}`);
  lines.push(`Total People:        ${result.totalPeople}`);
  lines.push("--------------------------------------------------");
  lines.push("NAME & APPEARANCE METRICS");
  lines.push(
    `Unique Full Names:   ${result.uniqueFullNames} / ${result.totalPeople}`,
  );
  lines.push(
    `Name Collisions:     ${result.fullNameCollisions} (${(result.fullNameCollisionRate * 100).toFixed(2)}%)`,
  );
  lines.push(`Unique Given Names:  ${result.uniqueGivenNames}`);
  lines.push(`Unique Family Names: ${result.uniqueFamilyNames}`);
  lines.push(
    `Unique Appearances:  ${result.uniqueAppearanceSeeds} / ${result.totalPeople}`,
  );
  lines.push(`Appearance Colls:    ${result.appearanceSeedCollisions}`);
  lines.push("--------------------------------------------------");
  lines.push("AGE & BIRTHDATE METRICS");
  lines.push(
    `Age Range:           ${result.ageStats.min} to ${result.ageStats.max}`,
  );
  lines.push(
    `Mean / Median Age:   ${result.ageStats.mean} / ${result.ageStats.median}`,
  );
  lines.push(`Leap Birthdays:      ${result.leapBirthdaysCount}`);
  lines.push(`Boundary Birthdays:  ${result.boundaryBirthdaysCount}`);
  lines.push("Age Distribution Brackets:");
  for (const [bracket, count] of Object.entries(result.ageStats.brackets)) {
    const pct = ((count / (result.totalPeople || 1)) * 100).toFixed(1);
    lines.push(
      `  ${bracket.padEnd(25)}: ${String(count).padStart(4)} (${pct}%)`,
    );
  }

  if (includeSampleDetails && result.populations.length > 0) {
    lines.push("--------------------------------------------------");
    lines.push("SAMPLE POPULATIONS:");
    for (const pop of result.populations.slice(0, 5)) {
      lines.push(`\nSeed: "${pop.seed}" (${pop.worldId})`);
      for (const p of pop.people) {
        const flag = p.isLeapBirthday
          ? " [LEAP]"
          : p.isBoundaryBirthday
            ? " [BOUND]"
            : "";
        lines.push(
          `  - ${p.fullName.padEnd(22)} Age: ${String(p.age).padStart(2)} (DoB: ${p.birthDate})${flag} AppSeed: ${p.appearanceSeed.slice(0, 16)}`,
        );
      }
    }
    if (result.populations.length > 5) {
      lines.push(
        `\n... (${result.populations.length - 5} more populations omitted from preview)`,
      );
    }
  }

  lines.push("==================================================");
  return lines.join("\n");
}
