/**
 * Where an 18-year-old has no contest to enter. For each of the 56 places,
 * the offices it elects (statewide, legislature and U.S. House everywhere;
 * county and municipal offices where any of its localities has a county or
 * municipal government) and the youngest age its records let a candidate
 * file at. Every place whose youngest is above 18 is listed by name, with
 * the office family and the record it comes from; none of them may rest on
 * the fallback age.
 */
import { expect, it } from "vitest";
import type { OfficeFamily } from "./elections-calendar";
import { placeLocalGovernmentUnits } from "./gov-rules/local-governments";
import { filingRequirements } from "./modules/elections";
import { corePlaceByKey } from "./place-lookup";
import { placeLocalities, placeStateKeys } from "./places";

const ADULT = 18;
const EVERYWHERE: readonly OfficeFamily[] = [
  "statewideExecutive",
  "stateLegislative",
  "usHouse",
];

it("lists every place where no office is open to an 18-year-old, from its own records", () => {
  const listed: string[] = [];
  for (const stateKey of [...placeStateKeys()].sort()) {
    let county = false;
    let municipal = false;
    for (const locality of placeLocalities(stateKey)) {
      const units = placeLocalGovernmentUnits(corePlaceByKey(locality.key));
      county ||= units.counties.length > 0;
      municipal ||= units.municipal.length > 0;
      if (county && municipal) break;
    }
    const families: OfficeFamily[] = [
      ...EVERYWHERE,
      ...(county ? (["countyOffice"] as const) : []),
      ...(municipal ? (["municipalOffice"] as const) : []),
    ];
    const rules = families.map((family) => ({
      family,
      rule: filingRequirements(stateKey, family),
    }));
    const youngest = rules.sort(
      (a, b) => a.rule.minimumAge - b.rule.minimumAge,
    )[0]!;
    if (youngest.rule.minimumAge <= ADULT) continue;
    // A place nobody can enter at 18 says so from its own record.
    for (const { family, rule } of rules)
      expect(
        rule.fallbacks.includes("minimumAge"),
        `${stateKey} ${family}: the age ${rule.minimumAge} is a fallback`,
      ).toBe(false);
    listed.push(
      `${stateKey}: youngest ${youngest.rule.minimumAge} (${youngest.family}; ${youngest.rule.source})`,
    );
  }
  process.stdout.write(
    `NO CONTEST AT 18 in ${listed.length} of 56 places:\n${listed.join("\n")}\n`,
  );
  expect(listed.length).toBeLessThan(56);
});
