import fs from "fs";

export interface IntakeEntry {
  stable_id: string;
  sheet_number: number;
  title: string;
  relevance_classification:
    | "high relevance"
    | "possible relevance"
    | "context only"
    | "irrelevant to current pilot"
    | "unresolved";
  classification_confidence: string;
  notes?: string;
  file_variants: unknown;
  local_status: string;
}

export function runTriage(manifestPath: string, manualReviewPath?: string) {
  const manifestRaw = fs.readFileSync(manifestPath, "utf8");
  const manifest: IntakeEntry[] = JSON.parse(manifestRaw);

  let manualReview: Record<
    string,
    { classification: string; confidence: string; notes: string }
  > = {};
  if (manualReviewPath && fs.existsSync(manualReviewPath)) {
    manualReview = JSON.parse(fs.readFileSync(manualReviewPath, "utf8"));
  }

  let highCount = 0;
  let possibleCount = 0;
  let contextCount = 0;
  let irrelevantCount = 0;
  let unresolvedCount = 0;

  for (const entry of manifest) {
    const sheetStr = String(entry.sheet_number);
    const review = manualReview[sheetStr];

    if (review) {
      entry.relevance_classification = review.classification as
        | "high relevance"
        | "possible relevance"
        | "context only"
        | "irrelevant to current pilot"
        | "unresolved";
      entry.classification_confidence = review.confidence;
      entry.notes = review.notes;
    } else {
      // Look for textual evidence in the metadata if available
      const searchString = `${entry.title} ${entry.notes || ""}`.toLowerCase();
      if (searchString.includes("senate chamber")) {
        entry.relevance_classification = "high relevance";
        entry.classification_confidence = "metadata-keyword";
        entry.notes = "Title contains 'Senate Chamber'";
      } else if (searchString.includes("second floor")) {
        entry.relevance_classification = "possible relevance";
        entry.classification_confidence = "metadata-keyword";
        entry.notes = "Title contains 'second floor'";
      } else {
        entry.relevance_classification = "unresolved";
        entry.classification_confidence = "unresolved";
        entry.notes = "Requires manual visual inspection";
      }
    }

    if (entry.relevance_classification === "high relevance") highCount++;
    else if (entry.relevance_classification === "possible relevance")
      possibleCount++;
    else if (entry.relevance_classification === "context only") contextCount++;
    else if (entry.relevance_classification === "irrelevant to current pilot")
      irrelevantCount++;
    else if (entry.relevance_classification === "unresolved") unresolvedCount++;
  }

  console.log(
    `Triage Results: High: ${highCount}, Possible: ${possibleCount}, Context: ${contextCount}, Irrelevant: ${irrelevantCount}, Unresolved: ${unresolvedCount}`,
  );

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}
