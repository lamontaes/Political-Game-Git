import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  allocationHistory,
  baselineOf,
  indexOfId,
  issuanceOf,
  ledgerOf,
  loadAnchorLedger,
  LEDGER_NOTE,
  LEDGER_SCHEMA,
  siteDigest,
  symbolOf,
  writeAnchorLedger,
  type AllocationHistory,
  type AnchorIssuance,
} from "./anchor-history";
import { mintAnchors, revisionOf, type ComputedAnchor } from "./anchors";
import type { ScannedLiteral } from "./scan";

/**
 * The retired-id reuse defect, and the ledger that closes it.
 *
 * During the P1 prose migration the minting machinery handed retired anchor
 * ids to genuinely new sentences: `nextAnchorId` reserved only the ids present
 * in the current sidecar, so retiring `threadMovementSentence-0002` returned
 * that number to the pool and the next new site in that symbol took it. An
 * owner's recorded judgement on the retired line then reads as judgement on
 * prose nobody reviewed. The writer caught two of those by hand; a third would
 * not have been caught.
 *
 * The contract under test: an anchor id is issued at most once in this
 * lineage's whole history. Retirement removes a binding from the live set and
 * never returns the number.
 *
 * These cases drive the allocator over constructed literals rather than the
 * source extractor. Extractor-level identity is already covered by
 * `identity.test.ts`; what is unproven here is allocation history, and stating
 * the literals directly is what lets a retirement sequence be written exactly.
 * Nothing here reads or writes any repository sidecar, ledger, or fixture.
 */

const SOURCE = "scripts/prose-corpus/fixtures/ledger-only.ts";
const SYMBOL = "recapSentence";

function literal(text: string, line: number): ScannedLiteral {
  return {
    sourcePath: SOURCE,
    enclosingSymbol: SYMBOL,
    text,
    line,
    propertyName: null,
    isThrownError: false,
    isKeyPosition: false,
    isTemplate: false,
  };
}

function sites(...texts: readonly string[]): ScannedLiteral[] {
  return texts.map((text, index) => literal(text, index + 1));
}

const FIRST = "You went to the meeting.";
const SECOND = "You left before the vote.";
const THIRD = "You called her back the next morning.";

/**
 * The id bound to a text, looked up rather than assumed.
 *
 * Mint order follows the resolver's sorted problem list, not source order, and
 * pinning a number to a sentence here would test that ordering instead of the
 * allocation history these cases are about.
 */
function idOf(anchors: readonly ComputedAnchor[], text: string): string {
  const anchor = anchors.find((entry) => entry.text === text);
  if (!anchor) throw new Error(`no anchor bound to ${JSON.stringify(text)}`);
  return anchor.anchor;
}

/**
 * Verified history built from an issued list, the way the CLI builds it.
 *
 * `mintAnchors` takes history rather than a bare list and has no default for
 * it, so these cases state the allocator's memory explicitly. That is the
 * point: the removed default was itself the defect, and a test that could omit
 * the argument would be testing a path production can no longer reach.
 */
function records(issued: readonly string[]): AnchorIssuance[] {
  return issued.map((id) =>
    issuanceOf(
      id,
      siteDigest("scripts/prose-corpus/probe.ts", symbolOf(id), indexOfId(id)),
      siteDigest("text", id, 0),
    ),
  );
}

function historyOf(issued: readonly string[]): AllocationHistory {
  const ledger = ledgerOf(records(issued));
  return allocationHistory(ledger, baselineOf(ledger.issuances));
}

const tempDirs: string[] = [];

function tempLedgerPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "anchor-ledger-"));
  tempDirs.push(dir);
  return join(dir, "computed-anchor-ledger.json");
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("a retired id is burned, not recycled", () => {
  it("gives a genuinely new site 0003 after 0002 was retired", () => {
    const first = mintAnchors(sites(FIRST, SECOND), [], historyOf([]));
    expect([...first.minted].sort()).toStrictEqual([
      `${SYMBOL}-0001`,
      `${SYMBOL}-0002`,
    ]);
    const kept = idOf(first.anchors, FIRST);
    const doomed = idOf(first.anchors, SECOND);

    // The second sentence is deleted outright. Its anchor retires.
    const retired = mintAnchors(
      sites(FIRST),
      first.anchors,
      historyOf(first.issued),
    );
    expect(retired.removed).toStrictEqual([doomed]);
    expect(retired.anchors.map((anchor) => anchor.anchor)).toStrictEqual([
      kept,
    ]);
    // Gone from the live set, still burned in the ledger.
    expect(retired.issued).toContain(doomed);
    expect(retired.burned).toStrictEqual([doomed]);

    // A later, unrelated sentence arrives. Under the defect it was handed the
    // retired number and inherited that line's review identity.
    const added = mintAnchors(
      sites(FIRST, THIRD),
      retired.anchors,
      historyOf(retired.issued),
    );
    expect(added.minted).toStrictEqual([`${SYMBOL}-0003`]);
    expect(added.minted).not.toContain(doomed);
    expect(idOf(added.anchors, THIRD)).toBe(`${SYMBOL}-0003`);
    expect(idOf(added.anchors, FIRST)).toBe(kept);
  });

  // The original defect, kept as a pin. Passing empty history is now the only
  // way to reach it: the parameter is required, and every CLI path builds it
  // from verified files, so this case cannot masquerade as the production
  // path it once was the default for.
  it("reproduces the reuse only when history is deliberately empty", () => {
    const first = mintAnchors(sites(FIRST, SECOND), [], historyOf([]));
    const doomed = idOf(first.anchors, SECOND);
    const retired = mintAnchors(
      sites(FIRST),
      first.anchors,
      historyOf(first.issued),
    );

    // Exactly the pre-ledger behaviour: reserve the live sidecar alone. The
    // new sentence is handed the retired sentence's number.
    const withoutLedger = mintAnchors(
      sites(FIRST, THIRD),
      retired.anchors,
      historyOf([]),
    );
    expect(idOf(withoutLedger.anchors, THIRD)).toBe(doomed);

    const withLedger = mintAnchors(
      sites(FIRST, THIRD),
      retired.anchors,
      historyOf(retired.issued),
    );
    expect(idOf(withLedger.anchors, THIRD)).not.toBe(doomed);
    expect(withLedger.minted).toStrictEqual([`${SYMBOL}-0003`]);
  });

  it("blocks an issued id the live sidecar has never held", () => {
    // A ledger from a lineage whose 0001 was retired before this sidecar
    // existed. The number stays closed even with nothing live to compare to.
    const stranded = mintAnchors(
      sites(FIRST),
      [],
      historyOf([`${SYMBOL}-0001`]),
    );
    expect(stranded.minted).toStrictEqual([`${SYMBOL}-0002`]);
    expect(stranded.burned).toStrictEqual([`${SYMBOL}-0001`]);
  });

  it("never removes an id from the ledger", () => {
    let anchors: readonly ComputedAnchor[] = [];
    let issued: readonly string[] = [];
    const seen = new Set<string>();
    // Each round adds one site and drops every previous one, so every round
    // after the first retires as much as it mints.
    const rounds = [
      sites(FIRST),
      sites(SECOND),
      sites(THIRD),
      sites(FIRST, SECOND, THIRD),
      sites(),
    ];
    for (const round of rounds) {
      const previous = issued;
      const outcome = mintAnchors(round, anchors, historyOf(issued));
      anchors = outcome.anchors;
      issued = outcome.issued;
      for (const id of previous) expect(issued).toContain(id);
      for (const id of outcome.minted) {
        // Nothing minted in any round was ever issued in an earlier one.
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
    }
    expect(new Set(issued).size).toBe(issued.length);
    // The last round retires everything; the ledger keeps all of it.
    expect(anchors).toStrictEqual([]);
    expect(issued).toStrictEqual([...seen].sort());
  });
});

describe("the ledger does not change settled behaviour", () => {
  it("keeps a reworded site's id and issues nothing new", () => {
    const first = mintAnchors(sites(FIRST, SECOND), [], historyOf([]));
    const reworded = mintAnchors(
      sites(FIRST, "You left just before the vote."),
      first.anchors,
      historyOf(first.issued),
    );
    expect(reworded.refused).toStrictEqual([]);
    expect(reworded.minted).toStrictEqual([]);
    expect(reworded.rebound).toHaveLength(1);
    expect(reworded.rebound[0]?.anchor).toBe(idOf(first.anchors, SECOND));
    // Persistence only: the ever-issued set is unchanged by a reword.
    expect(reworded.issued).toStrictEqual(first.issued);
    expect(reworded.burned).toStrictEqual([]);
  });

  it("still refuses two simultaneous ambiguous edits and issues nothing", () => {
    const first = mintAnchors(sites(FIRST, SECOND), [], historyOf([]));
    const ambiguous = mintAnchors(
      sites("You went to the hearing.", "You left after the vote."),
      first.anchors,
      historyOf(first.issued),
    );
    expect(ambiguous.refused.length).toBeGreaterThan(0);
    expect(ambiguous.minted).toStrictEqual([]);
    expect(ambiguous.rebound).toStrictEqual([]);
    expect(ambiguous.issued).toStrictEqual(first.issued);
  });

  it("leaves repeated exact text and occurrence handling alone", () => {
    const repeated = mintAnchors(sites(FIRST, FIRST), [], historyOf([]));
    expect(repeated.minted).toHaveLength(2);
    expect(
      repeated.anchors.map((anchor) => anchor.occurrence).sort(),
    ).toStrictEqual([0, 1]);

    // An unchanged re-mint is a no-op against both files.
    const again = mintAnchors(
      sites(FIRST, FIRST),
      repeated.anchors,
      historyOf(repeated.issued),
    );
    expect(again.minted).toStrictEqual([]);
    expect(again.removed).toStrictEqual([]);
    expect(again.issued).toStrictEqual(repeated.issued);

    // A changed repeat count is still ambiguous, not paired up by position.
    const fewer = mintAnchors(
      sites(FIRST),
      repeated.anchors,
      historyOf(repeated.issued),
    );
    expect(
      fewer.refused.some((problem) => problem.kind === "ambiguous-occurrence"),
    ).toBe(true);
  });
});

describe("the ledger file round-trips deterministically", () => {
  it("writes sorted, de-duplicated ids and reads them back unchanged", () => {
    const path = tempLedgerPath();
    const unsorted = records([
      `${SYMBOL}-0002`,
      `${SYMBOL}-0001`,
      `${SYMBOL}-0002`,
      "quietSentence-0001",
    ]);
    writeAnchorLedger(
      {
        schema: LEDGER_SCHEMA,
        note: LEDGER_NOTE,
        issuances: unsorted,
        issued: unsorted.map((issuance) => issuance.id),
      },
      path,
    );
    const loaded = loadAnchorLedger(path);
    expect(loaded).not.toBeNull();
    expect(loaded!.issued).toStrictEqual([
      "quietSentence-0001",
      `${SYMBOL}-0001`,
      `${SYMBOL}-0002`,
    ]);

    // Writing what was read reproduces the file byte for byte.
    const second = tempLedgerPath();
    writeAnchorLedger(loaded!, second);
    expect(loadAnchorLedger(second)).toStrictEqual(loaded);
  });

  it("reports a missing ledger as absent, never as an empty history", () => {
    // `null` means "there is no file"; it is not an empty issued list a mint
    // could allocate against. Returning an empty ledger here was how a deleted
    // file passed for a lineage that had never issued anything.
    const path = join(tempLedgerPath(), "..", "absent.json");
    expect(loadAnchorLedger(path)).toBeNull();
  });

  it("refuses a ledger written by a schema it does not understand", () => {
    const path = tempLedgerPath();
    writeFileSync(path, JSON.stringify({ schema: 99, note: "", issued: [] }));
    expect(() => loadAnchorLedger(path)).toThrow(/schema 99/);
  });
});

describe("live anchors are reconciled against history, not seeded from it", () => {
  it("reserves a live id the ledger already knows and mints above the mark", () => {
    // The post-merge case: another branch's minted anchors arrive in the
    // sidecar. The CLI absorbs them through `-- ledger` first; by the time a
    // mint runs, history knows them.
    const live: ComputedAnchor[] = [
      {
        anchor: `${SYMBOL}-0007`,
        sourcePath: SOURCE,
        symbol: SYMBOL,
        text: FIRST,
        occurrence: 0,
        textRevision: revisionOf(FIRST),
      },
    ];
    const history = historyOf([`${SYMBOL}-0001`, `${SYMBOL}-0007`]);
    expect([...history.issued].sort()).toStrictEqual([
      `${SYMBOL}-0001`,
      `${SYMBOL}-0007`,
    ]);

    // 0007 is the high-water mark, so the new site takes 0008. The gap at
    // 0002-0006 is burned rather than backfilled: a number at or below a mark
    // that was reached may have been issued and retired, and handing one back
    // is the whole defect.
    const outcome = mintAnchors(sites(FIRST, SECOND), live, history);
    expect(outcome.minted).toStrictEqual([`${SYMBOL}-0008`]);
    expect(outcome.issued).toStrictEqual([
      `${SYMBOL}-0001`,
      `${SYMBOL}-0007`,
      `${SYMBOL}-0008`,
    ]);
  });

  it("mints above the checkpoint's mark even when the ledger lost the entry", () => {
    // A ledger quietly shortened by one retired id. Detection reports it, and
    // independently of detection the floor keeps the number closed.
    const intact = ledgerOf(records([`${SYMBOL}-0001`, `${SYMBOL}-0002`]));
    const checkpoint = baselineOf(intact.issuances);
    const shortened = ledgerOf(records([`${SYMBOL}-0001`]));
    const history = allocationHistory(shortened, checkpoint);
    expect(history.highWater[SYMBOL]).toBe(2);

    const outcome = mintAnchors(sites(FIRST), [], history);
    expect(outcome.minted).toStrictEqual([`${SYMBOL}-0003`]);
    expect(outcome.minted).not.toContain(`${SYMBOL}-0002`);
  });
});
