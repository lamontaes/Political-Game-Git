import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ExecutiveBudgetRequestComparison } from "./ExecutiveBudgetRequest";
import { ModeledAccountHistory } from "./ModeledAccountHistory";
import type { ModeledAccountHistory as ModeledAccountHistoryModel } from "../presentation/modeled-account-history";
import type { ExecutiveBudgetRequest } from "../simulation/governing/executive-budget-requests";
import { PROGRAM_FAMILIES } from "../simulation/governing/program-families";
import type { World } from "../simulation";

const FILES = [
  "src/player/EconomicContextPanel.tsx",
  "src/player/MoneyLaws.tsx",
  "src/player/BudgetEconomyWorkspace.tsx",
  "src/player/MacroConditionsPanel.tsx",
];

function code(file: string): string {
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
    .join("\n");
}

describe("Money screens show record data only", () => {
  it.each(FILES)("%s has no hand-written sentence", (file) => {
    const text = code(file);
    expect(text.match(/"[A-Z][^"]{25,}[.?!]"/g) ?? []).toEqual([]);
    expect(text.match(/>\s*[A-Z][a-z]+ [a-z ,']{25,}/g) ?? []).toEqual([]);
  });

  it("renders account history with recorded amounts and statuses", () => {
    const text = code("src/player/ModeledAccountHistory.tsx");
    expect(text).not.toContain("No money has moved through this account yet.");
    expect(text).not.toContain("Transfers: none");
    expect(text).not.toContain("nothing moved (");
    expect(text).not.toContain("attempted (");
  });

  it("does not render modeled-account explanation or no-account prose", () => {
    const noAccount = renderToStaticMarkup(
      createElement(ModeledAccountHistory, {
        history: {
          status: "no-account",
          jurisdictionId: "jurisdiction:test",
          reason:
            "No modeled public receipts account has been opened for this place.",
        } as ModeledAccountHistoryModel,
      }),
    );
    expect(noAccount).toContain('data-problem="no-account"');
    expect(noAccount).not.toContain("No modeled public receipts account");

    const usd = { minorUnits: 0, currency: "USD" } as const;
    const recordedHistory = {
      status: "recorded",
      jurisdictionId: "jurisdiction:test",
      jurisdictionLabel: "Test place",
      accountOrganizationId: "organization:test",
      openedAt: "2026-01-01",
      asOf: "2026-01-02",
      openingBalance: usd,
      entries: [],
      receipts: usd,
      payments: usd,
      balance: { status: "established", asOf: "2026-01-02", balance: usd },
      graph: null,
    } as unknown as ModeledAccountHistoryModel;
    const recorded = renderToStaticMarkup(
      createElement(ModeledAccountHistory, { history: recordedHistory }),
    );
    expect(recorded).not.toContain(
      "The game’s modeled public receipts account",
    );
    expect(recorded).not.toContain("Coverage:");
    expect(recorded).not.toContain("Each row keeps its recorded");
  });

  it("keeps request dates and record fields without helper sentences", () => {
    const familyKey = PROGRAM_FAMILIES[0]!.familyKey;
    const request = {
      matterId: "matter:test",
      decisionEventId: "event:decision",
      officeKey: "office:test",
      personId: "person:test",
      governmentIdentity: {
        kind: "jurisdiction",
        jurisdictionId: "jurisdiction:test",
      },
      startsOn: "2026-01-01",
      endsOn: "2026-12-31",
      lines: [{ familyKey, amount: { minorUnits: 100, currency: "USD" } }],
      event: {},
    } as unknown as ExecutiveBudgetRequest;
    const world = {
      currentDate: "2026-12-31",
      history: { publicProgramRecords: [] },
    } as unknown as World;
    const html = renderToStaticMarkup(
      createElement(ExecutiveBudgetRequestComparison, { world, request }),
    );
    expect(html).toContain('data-testid="executive-budget-period"');
    expect(html).toContain('data-problem="no-enacted-authorization"');
    expect(html).not.toContain("Budget request for");
    expect(html).not.toContain("Each authorization shows its own dates");
    expect(html).not.toContain("No enacted authorization recorded");
  });
});
