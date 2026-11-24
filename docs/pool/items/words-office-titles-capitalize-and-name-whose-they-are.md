---
id: words-office-titles-capitalize-and-name-whose-they-are
title: "Every office title in a printed list is capitalized the same way and says whose it is"
area: elections
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: design-words-machine
source: Words lead, Nov 14 2026 (#8928, 16:37Z, ruling on #9226)
claimed-at:
checked: account-lead 2026-11-14
branch:
---

**What.** A printed list of offices (the notice of election) mixes forms: "Attorney General" beside "County assessor", and a lone "Commissioner" that does not say which commission. In a notice each title is capitalized the same way and names whose it is ("County Commissioner"). Fix the titles at their source so every list, story and screen that reads them says the same. Seen: the notice of election in a played town's paper, at South Congaree SC, Lonoke AR and Ogallala NE.

**Cause.** Found in code: the printed notice (src/bench/printed-words.ts `electionNotice`) reads each contest's title through `read.contestTitle`, and the titles come from the contest rows built from data/research/government/county-row-offices-by-state.json and the state office rows, which carry county offices in sentence case ("County assessor") and a bare "Commissioner" where the body is a county board.

**Fix.** Normalize the office-title rows in data (title case, and the body or level in the title where a bare title is ambiguous), then show the contest title unchanged in every reader. Never fix it in the printed-words builder alone, which would make a second copy of the title.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: no place is named in logic, titles are data rows and the test draws places. A view that computes its own version of a fact is a duplicate (owner, Oct 28).

**Done when.** A test pinned to South Congaree SC, Lonoke AR and Ogallala NE and a test that draws places from all 56 and shows every contest title is in the one form and says whose it is; a second session reads, in a drawn place, a played town's notice of election and sees every office in the same form.

**Waits on.** Nothing; the notice itself is words-election-notice-printed.

**Files.** data/research/government/county-row-offices-by-state.json, src/bench/printed-words.ts, src/core2/election-notice.test.ts

**Notes.** Filed Nov 14 by the Account lead on the coordinator's ask. Not for #9226 to fix.
