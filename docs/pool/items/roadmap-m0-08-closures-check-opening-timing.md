---
id: roadmap-m0-08-closures-check-opening-timing
title: "M0-08's closures check counts opening cash after the opening build but outside flows from before it, so 'every dollar balances' reads false by exactly the opening's outside postings"
area: core
kind: bug
priority: 2
size: S
status: merged
claimed-by: claude/pool-roadmap-m0-08-closures-check-opening-timing
pr: #8657
blocked-on:
source: added with npm run pool -- add
standard: 2
model: sonnet
effort: low
root: none
lead: m0-m2
after:
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:50:26.203Z
merged-at: 2026-11-12T00:33:49.332Z
---

**What.** scripts/core2-year/closures.mjs (M0-08's command) reads openingCash after buildBenchWorld, but its outsideNet includes the journal entries the opening build already posted. In Dickens, Iowa (place key 1921360, seed 54e03066883f228dfe2b9acb51259d9f50dd7d3f92fa9a6d906d613dc601faa8) those 1,558 entries net to -2,228,171,046 cents, exactly the gap; every non-outside owner's cash matches its journal postings, so no engine makes or loses money. A fix reads the outside net at the same moment as openingCash and keeps strict equality. The check is a spec's test, which the M0-M2 lead may not edit, so this needs the CTO's word; the CTO's word is the owner's word (AGENTS.md, Oct 29), so record that and proceed.

**Cause.** Measured: Dickens, Iowa (place key 1921360, seed 54e03066883f228dfe2b9acb51259d9f50dd7d3f92fa9a6d906d613dc601faa8): the 1,558 entries the opening build posted net to -2,228,171,046 cents, exactly the gap; scripts/core2-year/closures.mjs reads `openingCash` at line 108 and starts `outsideNet` at line 184.

**Fix.** Read the outside net at the same moment as openingCash (or net out the opening build's entries), keeping strict equality and changing only when the outside net is read, never the tolerance. Record the CTO's word in the item first.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the balance check must hold in every drawn place, so the fix keeps strict equality and changes only when the outside net is read, never the tolerance. The chain is the acceptance: one dollar is followed from the opening build's posting to the closure check.

**Done when.** A second session runs scripts/core2-year/closures.mjs for Dickens, Iowa (seed above) and two more drawn places from all 56, named with seeds in the PR body, and sees 'every dollar balances: true' printed in each, by journal record id for the opening entries; with a test engine minting one dollar, the check fails. The CTO's ruling is recorded in the item. On screen: none by design.

**Waits on.** Nothing.

**Files.** scripts/core2-year/closures.mjs

**Notes.** TODO
