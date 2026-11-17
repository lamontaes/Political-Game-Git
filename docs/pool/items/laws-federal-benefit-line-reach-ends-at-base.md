---
id: laws-federal-benefit-line-reach-ends-at-base
title: "A federal benefit line's bill keeps reaching people after the line goes back to its base"
area: laws
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: laws-and-effects (builder crew, Nov 17)
pr: #9821
after:
blocked-on:
lead: laws-effects
source: Laws and effects lane, the checker's run at Howland, Maine (#9773), Nov 17, 2026
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** When Congress raises the Medicare, veterans or income security line and a later bill puts it back, the first bill still reads as reaching its recipients. Its reach rows never end, so the bill card says it reaches people it no longer pays, and the law table's repeal link reads missing. Social Security's rows do end. Seen: dev mode's bill card for the first bill, after the second takes effect.

**Cause.** Measured: at Howland, Maine, checker seed 93a1a0f2d0efafa4, by `scripts/law-wiring/check.ts --only` the federal lines: after the undo, 1,209 Medicare rows, 14 veterans rows and 17 income security rows stayed open, none ended. Found in code: `recordLineShare` (src/core2/law-reach/group-b-money.ts) returns when the line is at its base and never ends a row; a recipient the payer no longer pays (died or moved) is never visited again.

**Fix.** `recordLineShare` at a line's base ends every open row the benefit payers wrote on the line's key, once a day at most, through `lawNoLongerApplies` (src/core2/law-reach/applied.ts), as `applySocialSecurityLevel` ends its own rows.

**Time box.** 1 hour for one Opus session at medium effort.

**Rules.** An effect is a read: a bill reaches a person only while its line is paid above its base. The chain is the acceptance: the undo shows on the bill's own record.

**Done when.** A second session, in a drawn place, Town, State (seed printed), raises the veterans line in dev mode, runs 40 days, puts it back and runs 40 more, and reads on the first bill's card that nobody is reached now; `src/core2/federal-line-share-undo.test.ts` passes in that drawn place.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/federal-line-share-undo.test.ts (new)
