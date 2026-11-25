import { expect, it } from "vitest";

import journalBank from "../../data/english/parts/journal.json" with { type: "json" };
import journalRows from "./data/journal-rows.json" with { type: "json" };

// A bill said by its number and title together is one phrase with a comma
// inside ("Ordinance 2025-1, the Free Fares for Riders Ordinance"), so a
// line ends its clause right after it: "I signed {law} into law." printed
// "...Riders Ordinance into law." with the title's closing comma missing.
it("a journal line closes a bill's number and title with a comma or a period", () => {
  const named = new Set(
    journalRows.lines
      .filter((row) =>
        Object.values(
          (row as { eventFacts?: Record<string, { format: string }> })
            .eventFacts ?? {},
        ).some((fact) => fact.format === "billNumberAndName"),
      )
      .map((row) => row.kindPrefix),
  );
  const open = journalBank.parts.filter(
    (part) =>
      part.uses.some((use) =>
        ((use as { journal?: { kindPrefix: string }[] }).journal ?? []).some(
          (target) => named.has(target.kindPrefix),
        ),
      ) && /\{law\}(?![,.])/.test(part.text),
  );
  expect(open.map((part) => `${part.key}: ${part.text}`)).toEqual([]);
});
