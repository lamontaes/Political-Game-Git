---
id: play-bill-paper-cited-bill-words
title: "The bill paper's estimate says 'Amends 2025-3' for a town law; word the cited bill and drop the web-address guards"
lead: play-first
milestone: play-first
area: play
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-play-bill-paper-cited-bill-words
pr: #8587
blocked-on:
source: added with npm run pool -- add
after:
model: sonnet
effort: low
root: rc10-screens-keep-own-facts
checked: fable 2026-11-10
claimed-at: 2026-11-11T04:55:46.347Z
---

**What.** With laws-bill-section-cites-research-source, a bill section's record cites the bill that passed the law it amends (before.statute, its designation, and before.statuteForm, its form) and cites nothing for a law in force when the game began. The bill paper passes only before.statute to the screen, and the estimate line shows it as 'Amends' plus the bare designation, so a town's law reads 'Amends 2025-3' where the section text says 'amending Ordinance 2025-3'. The two guards that kept a research web address off the paper can no longer match anything and are dead code.

**Cause.** Found in code: `billPaper` in src/bench/legislature.ts (line 397) passes only `section.before.statute` (about line 449) and still strips ', amending https' at line 434; `billEstimate` in src/bench/play.mjs (line ~2616, `webCite`) shows 'Amends' plus the bare designation, so the estimate line differs from the section text; both web-address guards are dead.

**Fix.** Pass `before.statuteForm` too and word the cited bill through the English engine's `spokenDesignation` (src/english/bill-names.ts) in the estimate line; delete both web-address guards.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Ask why: the estimate line words the same cited bill the section text names, from the record's designation and form through the English engine's spokenDesignation, never a second wording. No hand-written player text in code: the words come from the bank.

**Done when.** A second session, in a drawn place where a law passed in play is amended by a new bill, sees the bill paper's estimate line and its section text name the cited bill the same way ('amending Ordinance 2025-3'), shown by src/bench/bill-paper.test.ts with the record id of the enacting bill and by a screenshot; both web-address guards are gone.

**Waits on.** Nothing.

**Files.** src/bench/legislature.ts, src/bench/play.mjs, src/bench/bill-paper.test.ts

**You will see.** A bill amending a law your town passed reads "amending Ordinance 2025-3" in its section and the same words on its estimate line.

**Screenshot.** The bill paper for a bill amending a law passed in play, from a drawn place.

**Notes.** Found Oct 28 00:20 by the laws-and-effects lead building laws-bill-section-cites-research-source (src/bench is the lane's).
