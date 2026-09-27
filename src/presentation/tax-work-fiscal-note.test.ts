import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { deserializeWorld, serializeWorld } from "../simulation";
import { addDays } from "../simulation/dates";
import type { TaxPolicyRecord } from "../simulation/tax-types";
import { stateWageTaxTerms } from "../simulation/world-setup/state-tax-service-profiles";
import { TaxWorkWorkspace } from "../player/TaxWorkWorkspace";
import { ordinaryStateHouseFilingEntry } from "../../tests/fixtures/multistate-funded-service-entry";
import { fileStateWageTaxRateFromOffice } from "./tax-work";
import {
  draftStateWageTaxFiscalNote,
  filedStateWageTaxFiscalNote,
} from "./tax-work-fiscal-note";

describe("Tax Work fiscal note", () => {
  it("reads the drafted rate but keeps the future wage base and cash change unknown", () => {
    const raised = draftStateWageTaxFiscalNote(
      stateWageTaxTerms("US-KY", "Kentucky", 425),
    );
    const zero = draftStateWageTaxFiscalNote(
      stateWageTaxTerms("US-KY", "Kentucky", 0),
    );
    expect(raised.rateLabel).toBe("4.25%");
    expect(raised.fiscal.status).toBe("draft");
    expect(raised.fiscal.operativeAt).toBeNull();
    expect(raised.fiscal.parts[0]).toMatchObject({
      lever: "rate",
      amountKind: "none",
      forecastMinorUnits: null,
      missingInput: expect.stringContaining("future taxable wages"),
    });
    expect(zero.rateLabel).toBe("0%");
    expect(zero.lawfulZero).toBe(true);
    expect(zero.fiscal.parts[0]?.forecastMinorUnits).toBeNull();
  });

  it("shows a real filed zero-rate levy, survives reload, and refuses changed pinned terms", () => {
    const entry = ordinaryStateHouseFilingEntry("KY", {
      headlessElection: true,
    });
    const filed = fileStateWageTaxRateFromOffice(entry.world, {
      personId: entry.personId,
      stableKey: "team-g:fiscal-note-zero",
      rateBasisPoints: 0,
    });
    const proposal = filed.world.history.taxProposals!.at(-1)!;
    const before = serializeWorld(filed.world);
    const note = filedStateWageTaxFiscalNote(filed.world, proposal);
    expect(note.kind).toBe("available");
    if (note.kind !== "available") throw new Error(note.reason);
    expect(note.note.fiscal.status).toBe("filed");
    expect(note.note.fiscal.operativeAt).toBeNull();
    expect(note.note.fiscal.parts[0]?.provisionKey).toBe("tax-levy");
    expect(note.note.rateLabel).toBe("0%");
    expect(note.note.fiscal.parts[0]?.forecastMinorUnits).toBeNull();
    const reloaded = deserializeWorld(before);
    const savedProposal = reloaded.history.taxProposals!.find(
      (row) => row.id === proposal.id,
    )!;
    expect(filedStateWageTaxFiscalNote(reloaded, savedProposal)).toEqual(note);

    const html = renderToStaticMarkup(
      createElement(TaxWorkWorkspace, {
        world: filed.world,
        personId: entry.personId,
        onWorldChange: () => {
          throw new Error("A read-only render must not write the world.");
        },
        onOpenMeasure: () => {
          throw new Error("A read-only render must not open a measure.");
        },
      }),
    );
    expect(html).toContain('data-testid="tax-fiscal-note"');
    expect(html).toContain("At 0%, this levy assesses $0");
    expect(html).toContain("Future taxable wage base: UNKNOWN");
    expect(html).toContain("Aggregate cash change from current law: UNKNOWN");
    expect(html).toContain("Operative date: UNKNOWN");
    expect(serializeWorld(filed.world)).toBe(before);

    const tampered = {
      ...filed.world,
      history: {
        ...filed.world.history,
        taxProposals: filed.world.history.taxProposals!.map((row) =>
          row.id === proposal.id
            ? { ...row, terms: { ...row.terms, rateNumerator: 100 } }
            : row,
        ),
      },
    };
    expect(
      filedStateWageTaxFiscalNote(
        tampered,
        tampered.history.taxProposals!.at(-1)!,
      ),
    ).toMatchObject({
      kind: "unavailable",
    });

    // This reader-level policy row checks date selection. It does not claim
    // that a legislative enactment or runtime receipt happened in this test.
    const effectiveAt = addDays(filed.world.currentDate, 20);
    const policy: TaxPolicyRecord = {
      id: "tax-policy_test-fiscal-note-date",
      stableKey: "team-g:fiscal-note-date:policy",
      sequence: 1,
      recordedAt: filed.world.currentDate,
      proposalId: proposal.id,
      enactmentId: "legislative-enactment_test-fiscal-note-date",
      effectiveAt,
      supersedesPolicyId: null,
      outcomeEventId: "event_test-fiscal-note-date",
    };
    const withPolicy = {
      ...filed.world,
      history: {
        ...filed.world.history,
        taxPolicies: [...(filed.world.history.taxPolicies ?? []), policy],
      },
    };
    const enactedNote = filedStateWageTaxFiscalNote(withPolicy, proposal);
    expect(enactedNote.kind).toBe("available");
    if (enactedNote.kind !== "available") throw new Error(enactedNote.reason);
    expect(enactedNote.note.fiscal.status).toBe("enacted");
    expect(enactedNote.note.fiscal.operativeAt).toBe(effectiveAt);
    expect(enactedNote.note.fiscal.parts[0]?.forecastMinorUnits).toBeNull();
  });
});
