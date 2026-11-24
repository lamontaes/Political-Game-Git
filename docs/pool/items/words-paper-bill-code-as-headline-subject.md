---
id: words-paper-bill-code-as-headline-subject
title: "Headlines name a bill by its code ('Tracy Barnes signs Ordinance 2025-3', 'H.R. 2 passes, 57 to 43') where a person would say what it does"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: words
model: sonnet
effort: low
root: none
source: second words reader, read of PR #9139 screens (Nov 14)
checked: m3 2026-11-14
---

**What.** The second words reader found headlines whose subject is the bill's number, not what it does. Seen on the Providence paper (bench seed p2, March 1, 2025): 'Tracy Barnes signs Ordinance 2025-3'; and a federal headline 'H.R. 2 passes, 57 to 43'. A paper names a bill by its name or by what it does and gives the number once, as a detail. Seen: News, the lead and side stories of any outlet.

**Cause.** Found in code: src/bench/printed-words.ts `billFacts` and the signed/law story builders, and the headline role `executive-action` in data/english/parts/headlines.json (the designation fills the headline when the bill has no title).

**Fix.** Where a bill has a name or a purpose phrase, the headline says that; the designation moves to the lede as a detail. Lines come to the Words lead first.

**Time box.** 2 hours.

**Rules.** No dice. Lines are the Words lead's; American English.

**Done when.** In a drawn place, a second session reads News and finds no headline whose subject is a bare designation when the bill has a name.

**Waits on.** Nothing.

**Files.** src/bench/printed-words.ts,data/english/parts/headlines.json
