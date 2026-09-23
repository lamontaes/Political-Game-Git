import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { moneyText } from "./money-text";

describe("money as a player reads it", () => {
  it("writes dollars with a dollar sign, cents and thousands separators", () => {
    expect(moneyText({ currency: "USD", minorUnits: 0 })).toBe("$0");
    expect(moneyText({ currency: "USD", minorUnits: 123_450 })).toBe(
      "$1,234.50",
    );
    expect(moneyText({ currency: "USD", minorUnits: -2_000 })).toBe("-$20");
  });

  it("keeps another currency's code rather than calling it dollars", () => {
    expect(moneyText({ currency: "EUR", minorUnits: 500 })).toBe("EUR 5");
  });

  it("is the formatter the campaign screens use, so none of them says USD 0.00", () => {
    // A playtest read "The committee has USD 0.00" and then "Your committee has
    // $0.00" on one screen. Each of these files had its own "USD 0.00"
    // formatter; they must not grow one back.
    const root = path.resolve(__dirname, "..", "..");
    for (const file of [
      "src/presentation/campaign-strategy.ts",
      "src/presentation/campaign-projection.ts",
      "src/simulation/campaign-weekly-plans.ts",
      "src/simulation/campaigns.ts",
      "src/player/CampaignWorkspace.tsx",
      "src/presentation/routine-outcome.ts",
    ]) {
      const source = readFileSync(path.join(root, file), "utf8");
      expect(source, file).toMatch(/moneyText\(|displayMoney/);
      expect(source, file).not.toMatch(/\$\{[\w.]*currency\} \$\{/);
    }
  });
});
