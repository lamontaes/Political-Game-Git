---
id: words-police-log-most-of-them-needs-three-reports
title: "The police log says 'most of them' only of a true majority of three or more reports"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: words
model: sonnet
effort: medium
root: none
source: second words reader on #9287, Nov 14 21:46Z
checked: m3 2026-11-14
---

**What.** A month's police log says "Residents of Fries reported two crimes to police in August, most of them assaults" with two reports. With two reports "most of them" is not a thing a paper says (it is both, or one of each). Seen: News, the police log of a small town in a month with two reports.

**Cause.** Found in code: the two police-log ledes ending "most of them {crimes}" in data/english/parts/news.json require only the fact `several` (more than one report), and src/bench/printed-words.ts sets `several` for any count over one; no fact says the top kind is more than half.

**Fix.** The police-log builder in src/bench/printed-words.ts adds the fact `most` only when there are three or more reports and the top kind is more than half of them; the two "most of them" ledes require `most`.

**Time box.** 1 hour.

**Rules.** No dice; a word is said only when the record makes it true.

**Done when.** In the running game, in a place and seed the builder did not choose, a second session reads News and finds no police log that says "most of them" of fewer than three reports, and the test at the four pinned places names each printed log.

**Waits on.** Nothing.

**Files.** src/bench/printed-words.ts,data/english/parts/news.json,src/english/news-police-log.test.ts,src/bench/printed-police-log.test.ts
