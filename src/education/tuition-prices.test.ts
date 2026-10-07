import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { readZipMember, parseDelimited } from "../source/core/index";
import type { ArtifactLock } from "../source/core/index";
import {
  compileSchoolTuitionInput,
  tuitionInputJson,
} from "../source/domains/education/tuition-input";
import { createOrganization } from "../simulation/life";
import { advanceWorld } from "../simulation/world";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import {
  schoolTuitionQuote,
  recordSchoolTuitionPriceRevision,
  readSchoolTuitionPriceAt,
  type SchoolTuitionInput,
} from "./tuition-prices";

const source = JSON.parse(
  readFileSync("data/source/education-tuition/tuition-input.json", "utf8"),
) as SchoolTuitionInput;
const seed = "overflow8-a21-sourced-school-tuition";
const place = drawRandomPlace(seed);
const fixture = smallWorld({ place: place.key, seed });
const directory = parseDelimited(
  readZipMember(
    readFileSync("data/source/education/raw/HD2024.zip"),
    "hd2024.csv",
  ),
  { delimiter: ",", hasHeaderRow: true, trimFields: true },
);
const unitColumn = directory.header!.indexOf("UNITID");
const stateColumn = directory.header!.indexOf("STABBR");
const nameColumn = directory.header!.indexOf("INSTNM");
const school = directory.rows.find((row) => {
  const id = `ipeds-unit:${row.fields[unitColumn]}`;
  return (
    row.fields[stateColumn] === fixture.stateUsps &&
    schoolTuitionQuote(source, {
      institutionId: id,
      artifactId: "IC2023_AY",
      field: "TUITION2",
    }).status === "sourced"
  );
});
if (!school)
  throw new Error(`No actual sourced tuition school in ${place.displayName}`);
const selector = {
  institutionId: `ipeds-unit:${school.fields[unitColumn]}`,
  artifactId: "IC2023_AY",
  field: "TUITION2",
};

describe(`sourced school tuition (${place.displayName}, ${seed})`, () => {
  it("replays the acquired CSV and dictionaries to the committed source input exactly", () => {
    const lock = JSON.parse(
      readFileSync(
        "data/source/education-tuition/tuition-artifact-lock.json",
        "utf8",
      ),
    ) as ArtifactLock;
    expect(tuitionInputJson(compileSchoolTuitionInput(lock))).toBe(
      readFileSync("data/source/education-tuition/tuition-input.json", "utf8"),
    );
  });
  it("quotes actual per-school academic-year tuition and retains raw row/dictionary provenance without a period split", () => {
    const quote = schoolTuitionQuote(source, selector);
    expect(quote.status).toBe("sourced");
    if (quote.status !== "sourced")
      throw new Error("Missing actual fixture quote.");
    const component = source.components[selector.artifactId]!;
    const row = component.rows.find(([id]) => id === selector.institutionId)!;
    const raw = row[2][component.columns.indexOf(selector.field)]!;
    expect(quote.amountMinor).toBe(Number(raw) * 100);
    expect(quote.chargeUnit).toBe("academic-year");
    expect(quote.academicYear).toBe("2023-24");
    expect(quote.sourceRefs).toEqual([
      {
        artifactId: selector.artifactId,
        sha256: source.artifacts[selector.artifactId]!.sha256,
        member: component.member,
        row: row[1],
        field: selector.field,
      },
      source.definitions[`${selector.artifactId}:${selector.field}`]!
        .dictionaryEvidence,
    ]);
    expect(quote.description).toContain("residency requirements");
    expect(quote).not.toHaveProperty("operativeAt");
    expect(quote).not.toHaveProperty("periodAmountMinor");
  });

  it("keeps source sentinels missing while allowing an actual reported zero", () => {
    const component = source.components.IC2023_AY!;
    const column = component.columns.indexOf("TUITION2");
    const sentinel = component.rows.find(
      (row) => !row[2][column] || !/^\d+$/.test(row[2][column]!),
    );
    const zero = component.rows.find((row) => row[2][column] === "0");
    expect(sentinel).toBeDefined();
    expect(zero).toBeDefined();
    expect(
      schoolTuitionQuote(source, { ...selector, institutionId: sentinel![0] }),
    ).toEqual({ status: "missing-source" });
    expect(
      schoolTuitionQuote(source, { ...selector, institutionId: zero![0] }),
    ).toMatchObject({ status: "sourced", amountMinor: 0 });
  });

  it("preserves program and part-time credit-hour units instead of treating either as a full-time period price", () => {
    const program = source.components.IC2023_PY!.rows.find(
      ([id]) =>
        schoolTuitionQuote(source, {
          institutionId: id,
          artifactId: "IC2023_PY",
          field: "CHG1PY3",
        }).status === "sourced",
    )!;
    expect(
      schoolTuitionQuote(source, {
        institutionId: program[0],
        artifactId: "IC2023_PY",
        field: "CHG1PY3",
      }),
    ).toMatchObject({
      status: "sourced",
      chargeUnit: "program",
      academicYear: "2023-24",
    });
    const credit = source.components.IC2023_AY!.rows.find(
      ([id]) =>
        schoolTuitionQuote(source, {
          ...selector,
          institutionId: id,
          field: "HRCHG2",
        }).status === "sourced",
    )!;
    const quote = schoolTuitionQuote(source, {
      ...selector,
      institutionId: credit[0],
      field: "HRCHG2",
    });
    expect(quote).toMatchObject({
      status: "sourced",
      chargeUnit: "credit-hour",
    });
    if (quote.status === "sourced")
      expect(quote.description).toContain("part-time");
  });

  it("records game-date price revisions with immutable source vintage and reads them through save/reopen", () => {
    let world = createOrganization(fixture.world, {
      stableKey: `edu-path7:institution:${selector.institutionId}`,
      formedAt: fixture.world.currentDate,
      initialProfile: {
        name: school.fields[nameColumn]!,
        classification: "service:college",
        locationJurisdictionId: fixture.jurisdictionId,
      },
      provenance: {
        kind: "source-record",
        reference: "HD2024:hd2024.csv",
        asOf: fixture.world.currentDate,
      },
    });
    const organizationId = world.history.organizations.at(-1)!.id;
    const firstDate = world.currentDate;
    world = recordSchoolTuitionPriceRevision(world, {
      stableKey: "tuition:source:first",
      organizationId,
      source,
      selector,
    });
    const first = readSchoolTuitionPriceAt(world, organizationId, selector)!;
    expect(first.quote).toEqual(schoolTuitionQuote(source, selector));
    expect(world.history.evidenceArtifacts.at(-1)!.createdAt).toBe(firstDate);
    world = advanceWorld(world, 1);
    world = recordSchoolTuitionPriceRevision(world, {
      stableKey: "tuition:source:reobserved",
      organizationId,
      source,
      selector,
    });
    const latest = readSchoolTuitionPriceAt(world, organizationId, selector)!;
    expect(latest.recordId).not.toBe(first.recordId);
    expect(
      readSchoolTuitionPriceAt(world, organizationId, selector, firstDate),
    ).toEqual(first);
    expect(
      readSchoolTuitionPriceAt(
        deserializeWorld(serializeWorld(world)),
        organizationId,
        selector,
      ),
    ).toEqual(latest);
  });

  it("opens a real new game in the unfiltered all56 drawn place", () => {
    const opened = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
      }),
    );
    expect(opened.game).not.toBeNull();
    expect(
      opened.game!.world.people[opened.game!.playerPersonId]!
        .homeJurisdictionId,
    ).toBe(place.context.jurisdiction.id);
  });
});
