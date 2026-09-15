import { executiveRulePackForJurisdiction } from "./executive-authority-rule-packs";
import type { ElectiveOfficeRef } from "./types";

/** Reuse the existing admitted federal executive office key. */
export function nationalOfficeRef(
  office: "president" | "vice-president",
): ElectiveOfficeRef {
  if (office === "president") {
    const pack = executiveRulePackForJurisdiction("US");
    if (!pack)
      throw new Error("Canonical federal presidential office unavailable.");
    return {
      officeKey: pack.office.officeKey,
      title: pack.displayName,
      seatKey: null,
      occupationClassification: "service:elected-executive",
    };
  }
  return {
    officeKey: "us-federal-vice-president",
    title: "Vice President of the United States",
    seatKey: null,
    occupationClassification: "service:elected-vice-president",
  };
}
