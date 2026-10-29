---
id: play-bill-paper-cited-bill-words
title: "The bill paper's estimate says 'Amends 2025-3' for a town law; word the cited bill and drop the web-address guards"
lead: play-first
milestone: play-first
area: play
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** With laws-bill-section-cites-research-source, a bill section's record cites the bill that passed the law it amends (before.statute, its designation, and before.statuteForm, its form) and cites nothing for a law in force when the game began. The bill paper (billPaper in src/bench/legislature.ts) passes only before.statute to the screen, and play.mjs shows it as 'Amends' plus the bare designation, so a town's law reads 'Amends 2025-3' where the section text says 'amending Ordinance 2025-3'. The two guards that kept a research web address off the paper (the replace of ', amending https...' in billPaper and webCite in play.mjs) can no longer match anything and are dead code.

**Rules.** Ask why: the estimate line words the same cited bill the section text names, from the record's designation and form through the English engine's spokenDesignation, never a second wording. No hand-written player text in code: the words come from the bank.

**Done when.** In a drawn place where a law passed in play is amended by a new bill, the bill paper's estimate line and its section text name the cited bill the same way, shown by src/bench/bill-paper.test.ts with the record id of the enacting bill and a screenshot, and both web-address guards are deleted.

**Time box.** 2 hours.

**You will see.** A bill amending a law your town passed reads "amending Ordinance 2025-3" in its section and the same words on its estimate line.

**Screenshot.** The bill paper for a bill amending a law passed in play, from a drawn place.

**Files.** src/bench/legislature.ts, src/bench/play.mjs, src/bench/bill-paper.test.ts

**Notes.** Found Oct 28 00:20 by the laws-and-effects lead building laws-bill-section-cites-research-source (src/bench is the lane's).
