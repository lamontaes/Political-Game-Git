import fs from "fs";
import path from "path";

export function integrateProvenance(intakePath: string, outputDir: string) {
  const intakeRaw = fs.readFileSync(intakePath, "utf8");
  const intake = JSON.parse(intakeRaw);

  const sheet13 = intake.find((e: unknown) => e.sheet_number === 13);

  // We create a provenance entry that adheres to ProvenanceEntry from schemas.ts
  // For the sheet itself:
  const sheetProv = {
    provenance_id: `prov_${sheet13.stable_id}`,
    source_url_or_path: sheet13.canonical_url,
    source_organization: sheet13.source_organization,
    document_photo_plan_title: sheet13.title,
    access_retrieval_date: sheet13.retrieval_date,
    rights_license_status: sheet13.rights_status,
    reference_type: "measured-drawing",
    source_authority_category: "authoritative",
    approval_status: "approved",
  };

  const derivedProv = {
    provenance_id: "prov_tx_senate_envelope_proof_1",
    asset_id: "asset_tx_senate_envelope_proof_1", // Links to a hypothetical asset manifest entry
    source_url_or_path: `derived/senate_chamber_envelope.json`, // local path
    generator_tool: "manual bounding box script",
    generated_model_version: "1.0",
    generation_edit_date: new Date().toISOString(),
    approval_status: "approved",
  };

  const provenanceData = {
    entries: [sheetProv, derivedProv],
  };

  const destPath = path.join(outputDir, "provenance.json");
  fs.writeFileSync(destPath, JSON.stringify(provenanceData, null, 2));
  console.log(`Integrated provenance saved to ${destPath}`);
}
