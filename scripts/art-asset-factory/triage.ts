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

export function runTriage(manifestPath: string) {
  const manifestRaw = fs.readFileSync(manifestPath, "utf8");
  const manifest: IntakeEntry[] = JSON.parse(manifestRaw);

  let highCount = 0;
  let possibleCount = 0;
  let contextCount = 0;
  let irrelevantCount = 0;

  for (const entry of manifest) {
    const titleLower = entry.title.toLowerCase();

    // Default
    entry.relevance_classification = "unresolved";
    entry.classification_confidence = "unresolved";

    // Context - exterior, site, overall plans, basement, 1st, 3rd, 4th floor
    if (
      titleLower.includes("site plan") ||
      titleLower.includes("first floor") ||
      titleLower.includes("third floor") ||
      titleLower.includes("fourth floor") ||
      titleLower.includes("basement") ||
      titleLower.includes("exterior") ||
      titleLower.includes("roof") ||
      titleLower.includes("dome")
    ) {
      entry.relevance_classification = "context only";
      entry.classification_confidence = "title-keyword";
      entry.notes = "Contextual building level/exterior";
    }

    // High relevance - specific mentions of Senate, Chamber, or Second Floor (since Senate is there)
    // Actually, Second floor contains both House and Senate. We want to be careful.
    if (titleLower.includes("senate") || titleLower.includes("chamber")) {
      entry.relevance_classification = "high relevance";
      entry.classification_confidence = "title-keyword";
      entry.notes = "Explicitly mentions Senate or Chamber";
    } else if (
      titleLower.includes("second floor") ||
      titleLower.includes("east wing")
    ) {
      // Senate is on the second floor, east wing
      // If it's a general second floor plan, it might have the senate.
      // Mark as high if it's the plan, possible otherwise
      if (titleLower.includes("plan")) {
        entry.relevance_classification = "high relevance";
        entry.classification_confidence = "title-keyword";
        entry.notes = "Second floor plan containing Senate";
      } else {
        entry.relevance_classification = "possible relevance";
        entry.classification_confidence = "title-keyword";
        entry.notes = "Second floor / East wing, possible Senate relevance";
      }
    } else if (
      titleLower.includes("section") ||
      titleLower.includes("elevation") ||
      titleLower.includes("detail") ||
      titleLower.includes("door") ||
      titleLower.includes("window")
    ) {
      if (entry.relevance_classification === "unresolved") {
        entry.relevance_classification = "possible relevance";
        entry.classification_confidence = "title-keyword";
        entry.notes = "Generic detail/section, need visual check";
      }
    } else if (entry.relevance_classification === "unresolved") {
      entry.relevance_classification = "irrelevant to current pilot";
      entry.classification_confidence = "title-keyword";
      entry.notes = "Does not match known relevant keywords";
    }

    if (entry.relevance_classification === "high relevance") highCount++;
    else if (entry.relevance_classification === "possible relevance")
      possibleCount++;
    else if (entry.relevance_classification === "context only") contextCount++;
    else if (entry.relevance_classification === "irrelevant to current pilot")
      irrelevantCount++;
  }

  console.log(
    `Triage Results: High: ${highCount}, Possible: ${possibleCount}, Context: ${contextCount}, Irrelevant: ${irrelevantCount}`,
  );

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}
