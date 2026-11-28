import { describe, expect, it } from "vitest";

import { deriveAllStateStyles } from "../../scripts/research/read-bill-numbering-styles";
import stylesData from "./data/legislature/bill-numbering-styles.json" with { type: "json" };
import {
  recordedStateBillNumberingStyle,
  stateBillNumberingStyle,
} from "./bill-numbering-styles";

describe("bill numbering styles", () => {
  it("the data file is exactly what the recorded research derives to", () => {
    // The lock the generator's --check used to be: the table cannot drift from
    // data/research/bill-samples, bill-numbering-starts.json and the state
    // legislatures corpus. A failure here means the research changed; update
    // the data file from deriveAllStateStyles() in the same change.
    expect(stylesData).toEqual(
      JSON.parse(JSON.stringify(deriveAllStateStyles())),
    );
  });

  it("records one style for each of the 50 states, and the labeled default elsewhere", () => {
    expect(stylesData).toHaveLength(50);
    expect(recordedStateBillNumberingStyle("US-AK")?.lower.template).toBe(
      "HB {n}",
    );
    const place = stateBillNumberingStyle("US-PR");
    expect(place.lower.templateBasis).toBe("game-default");
    expect(place.period).toBe("annual");
  });
});
