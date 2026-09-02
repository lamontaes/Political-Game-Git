import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RAW_FILE = path.join(
  process.cwd(),
  "data/hud-housing/raw-hud-fmr-il-2025.json",
);
const COMPILED_FILE = path.join(
  process.cwd(),
  "data/hud-housing/compiled-hud-housing.json",
);
const MANIFEST_FILE = path.join(
  process.cwd(),
  "data/hud-housing/manifest.json",
);

const SOURCE_URL = "https://www.huduser.gov/portal/datasets/fmr.html";
const RETRIEVAL_TIMESTAMP = "2026-09-02T21:30:00Z";

function sha256Buffer(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function compileHUDHousingCorpus() {
  const rawBytes = fs.readFileSync(RAW_FILE);
  const rawSha256 = sha256Buffer(rawBytes);
  const rawRecords = JSON.parse(rawBytes.toString("utf-8"));

  const compiledRecords = rawRecords.map((item: Record<string, unknown>) => {
    const rents = (item.rents || {}) as Record<string, number | null>;
    const incomeLimits = item.income_limits
      ? ((item.income_limits || {}) as Record<string, number | null>)
      : null;
    const flags = (item.flags || {}) as Record<string, unknown>;

    return {
      fiscal_year: item.fiscal_year as number,
      area: {
        hud_area_code: item.hud_area_code as string,
        hud_area_name: item.hud_area_name as string,
        area_type: item.area_type,
        associated_county_fips: item.associated_county_fips as string[],
        state_usps: item.state_usps as string,
      },
      rents: {
        rent_0br: rents.rent_0br ?? null,
        rent_1br: rents.rent_1br ?? null,
        rent_2br: rents.rent_2br ?? null,
        rent_3br: rents.rent_3br ?? null,
        rent_4br: rents.rent_4br ?? null,
      },
      income_limits: incomeLimits
        ? {
            median_family_income: incomeLimits.median_family_income ?? null,
            extremely_low_30pct: incomeLimits.extremely_low_30pct ?? null,
            very_low_50pct: incomeLimits.very_low_50pct ?? null,
            low_income_80pct: incomeLimits.low_income_80pct ?? null,
          }
        : null,
      flags: {
        is_small_area_fmr: Boolean(flags.is_small_area_fmr),
        is_state_nonmetro_median: Boolean(flags.is_state_nonmetro_median),
        has_hold_harmless_applied: Boolean(flags.has_hold_harmless_applied),
        custom_exception_status:
          (flags.custom_exception_status as string | null) ?? null,
      },
      provenance: {
        source_name:
          "U.S. Department of Housing and Urban Development (HUD) Fair Market Rents and Income Limits",
        source_url: SOURCE_URL,
        retrieval_timestamp: RETRIEVAL_TIMESTAMP,
        vintage: `FY${item.fiscal_year}`,
        sha256: rawSha256,
        locator: item.locator as string,
      },
    };
  });

  const compiledContent = JSON.stringify(compiledRecords, null, 2) + "\n";
  fs.mkdirSync(path.dirname(COMPILED_FILE), { recursive: true });
  fs.writeFileSync(COMPILED_FILE, compiledContent, "utf-8");

  const compiledBytes = Buffer.from(compiledContent, "utf-8");
  const compiledSha256 = sha256Buffer(compiledBytes);

  const fiscalYears = Array.from(
    new Set(compiledRecords.map((r) => r.fiscal_year)),
  ).sort();

  const manifest = {
    corpus_name:
      "Official HUD Fair Market Rents and Income Limits Reference Corpus",
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    record_count: compiledRecords.length,
    fiscal_year_coverage: fiscalYears,
    sources: [
      {
        source_name: "HUD Fair Market Rents & Income Limits Data",
        source_url: SOURCE_URL,
        retrieval_timestamp: RETRIEVAL_TIMESTAMP,
        sha256: rawSha256,
      },
    ],
    compiled_artifact: {
      path: "data/hud-housing/compiled-hud-housing.json",
      sha256: compiledSha256,
    },
  };

  fs.writeFileSync(
    MANIFEST_FILE,
    JSON.stringify(manifest, null, 2) + "\n",
    "utf-8",
  );
  console.log(
    `Successfully compiled HUD housing cost corpus (${compiledRecords.length} records).`,
  );
}

if (process.argv[1] && process.argv[1].endsWith("compile-hud.ts")) {
  compileHUDHousingCorpus();
}
