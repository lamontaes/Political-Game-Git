import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  loadHUDCorpusManifest,
  loadHUDCorpus,
  getHUDRecordByAreaCode,
  getHUDRecordsByCountyFips,
  getHUDRecordsByState,
  validateHUDRecord,
  validateHUDCorpusIntegrity,
} from "../src/hud_housing/hud-corpus.js";
import { compileHUDHousingCorpus } from "../scripts/hud-housing-corpus/compile-hud.js";

describe("HUD Housing Costs Reference Corpus", () => {
  it("1. Schema & Area Identity Validation", () => {
    const manifest = loadHUDCorpusManifest();
    expect(manifest.corpus_name).toContain("HUD Fair Market Rents");
    expect(manifest.schema_version).toBe("1.0.0");

    const records = loadHUDCorpus();
    expect(records.length).toBeGreaterThan(0);

    for (const record of records) {
      expect(record.fiscal_year).toBe(2025);
      expect(record.area.hud_area_code).toBeTruthy();
      expect(record.area.hud_area_name).toBeTruthy();
      expect(["METRO_MSA", "HMFA", "NONMETRO_COUNTY", "NECTA"]).toContain(
        record.area.area_type,
      );
      expect(record.area.associated_county_fips.length).toBeGreaterThan(0);

      const val = validateHUDRecord(record);
      expect(val.valid).toBe(true);
      expect(val.errors).toHaveLength(0);
    }
  });

  it("2. Known Published Examples", () => {
    const sfRecord = getHUDRecordByAreaCode("METRO41860M41860");
    expect(sfRecord).toBeDefined();
    expect(sfRecord?.area.hud_area_name).toBe(
      "San Francisco, CA HUD Metro FMR Area",
    );
    expect(sfRecord?.area.area_type).toBe("HMFA");
    expect(sfRecord?.rents.rent_2br).toBe(3310);
    expect(sfRecord?.income_limits?.median_family_income).toBe(175000);
    expect(sfRecord?.flags.is_small_area_fmr).toBe(true);

    const nyRecord = getHUDRecordByAreaCode("METRO35620M35620");
    expect(nyRecord).toBeDefined();
    expect(nyRecord?.area.associated_county_fips).toContain("36061"); // Manhattan/New York County
    expect(nyRecord?.rents.rent_2br).toBe(2520);

    const austinRecord = getHUDRecordByAreaCode("METRO12420M12420");
    expect(austinRecord).toBeDefined();
    expect(austinRecord?.area.area_type).toBe("METRO_MSA");
    expect(austinRecord?.area.associated_county_fips).toContain("48453"); // Travis County
  });

  it("3. Bedroom-Size Rent Field Semantics", () => {
    const records = loadHUDCorpus();
    for (const r of records) {
      const { rent_0br, rent_1br, rent_2br, rent_3br, rent_4br } = r.rents;
      // If adjacent bedroom rent fields exist, rent for larger bedroom counts must be >= smaller bedroom counts
      if (rent_0br !== null && rent_1br !== null)
        expect(rent_1br).toBeGreaterThanOrEqual(rent_0br);
      if (rent_1br !== null && rent_2br !== null)
        expect(rent_2br).toBeGreaterThanOrEqual(rent_1br);
      if (rent_2br !== null && rent_3br !== null)
        expect(rent_3br).toBeGreaterThanOrEqual(rent_2br);
      if (rent_3br !== null && rent_4br !== null)
        expect(rent_4br).toBeGreaterThanOrEqual(rent_3br);
    }
  });

  it("4. Geography Mismatch & Association Detection", () => {
    // Travis County FIPS = 48453 -> Should return Austin MSA
    const travisRecords = getHUDRecordsByCountyFips("48453");
    expect(travisRecords).toHaveLength(1);
    expect(travisRecords[0].area.hud_area_code).toBe("METRO12420M12420");

    // Non-existent FIPS -> empty array
    const bogusRecords = getHUDRecordsByCountyFips("99999");
    expect(bogusRecords).toHaveLength(0);

    // TX state lookup -> includes Austin and Anderson non-metro
    const txRecords = getHUDRecordsByState("TX");
    expect(txRecords.length).toBeGreaterThanOrEqual(2);
  });

  it("5. Missing Values Semantics (missing != zero)", () => {
    // North Slope Borough, AK has 4BR rent = null and income_limits = null
    const akRecord = getHUDRecordByAreaCode("NCNTY02185N02185");
    expect(akRecord).toBeDefined();
    expect(akRecord?.rents.rent_4br).toBeNull();
    expect(akRecord?.rents.rent_4br).not.toBe(0);
    expect(akRecord?.income_limits).toBeNull();

    // Verify validation catches invalid zero coercions if injected
    const recordWithZero = JSON.parse(JSON.stringify(akRecord));
    recordWithZero.rents.rent_0br = -100;
    const val = validateHUDRecord(recordWithZero);
    expect(val.valid).toBe(false);
    expect(val.errors[0]).toContain("Invalid bedroom rent value");
  });

  it("6. Deterministic Rebuild Verification", () => {
    const compiledPath = path.join(
      process.cwd(),
      "data/hud-housing/compiled-hud-housing.json",
    );
    const initialContent = fs.readFileSync(compiledPath, "utf-8");

    // Run compile script again
    compileHUDHousingCorpus();

    const rebuiltContent = fs.readFileSync(compiledPath, "utf-8");
    expect(rebuiltContent).toBe(initialContent);

    const integrity = validateHUDCorpusIntegrity();
    expect(integrity.valid).toBe(true);
  });

  it("7. Codebase Boundary & No Gameplay Imports", () => {
    const filePath = path.join(process.cwd(), "src/hud_housing/hud-corpus.ts");
    const fileContent = fs.readFileSync(filePath, "utf-8");

    // Must not import simulation, presentation, or gameplay UI
    expect(fileContent).not.toContain('from "../simulation');
    expect(fileContent).not.toContain('from "../presentation');
    expect(fileContent).not.toContain('from "../ui');
    expect(fileContent).not.toContain('from "../player');
  });
});
